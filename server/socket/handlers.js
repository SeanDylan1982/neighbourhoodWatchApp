const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const PrivateChat = require('../models/PrivateChat');
const Message = require('../models/Message');
const ChatGroup = require('../models/ChatGroup');
const NotificationService = require('../services/NotificationService');

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Verify user
    const user = await User.findOne({ 
      _id: decoded.userId,
      status: 'active'
    }).select('_id email role neighbourhoodId firstName lastName');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      neighbourhoodId: user.neighbourhoodId,
      name: `${user.firstName} ${user.lastName}`
    };

    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

const setupSocketHandlers = (io) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected`);

    // Join neighbourhood room
    if (socket.user.neighbourhoodId) {
      socket.join(`neighbourhood_${socket.user.neighbourhoodId}`);
      console.log(`User joined neighbourhood room: neighbourhood_${socket.user.neighbourhoodId}`);
    }

    // Join user's private room for direct messages
    socket.join(`user_${socket.user.id}`);
    console.log(`User joined private room: user_${socket.user.id}`);

    // Handle private chat messages
    socket.on('send_private_message', async (data) => {
      try {
        const { chatId, content, emojis = [], replyToId, media = [] } = data;
        
        // Verify user is participant in this chat
        const privateChat = await PrivateChat.findOne({
          _id: chatId,
          participants: socket.user.id,
          isActive: true
        });

        if (!privateChat) {
          socket.emit('error', { message: 'Private chat not found' });
          return;
        }

        // Create message
        const message = new Message({
          chatId: chatId,
          chatType: 'private',
          senderId: socket.user.id,
          content: content,
          emojis: emojis,
          media: media,
          replyToId: replyToId || null,
          status: 'sent'
        });

        await message.save();
        await message.populate('senderId', 'firstName lastName profileImageUrl');

        // Update private chat's last message
        privateChat.lastMessage = {
          content: content,
          sender: socket.user.id,
          timestamp: message.createdAt,
          messageType: media.length > 0 ? media[0].type : 'text'
        };
        privateChat.updatedAt = new Date();
        await privateChat.save();

        // Get the other participant to send them the message
        const otherParticipantId = privateChat.participants.find(
          p => p.toString() !== socket.user.id.toString()
        );

        // Create notification for the recipient
        try {
          await NotificationService.createMessageNotification(
            socket.user.id,
            otherParticipantId,
            message._id,
            'private'
          );
          
          // Emit notification update to recipient
          socket.to(`user_${otherParticipantId}`).emit('notification_update');
        } catch (notificationError) {
          console.error('Error creating message notification:', notificationError);
        }

        // Emit to the other participant
        socket.to(`user_${otherParticipantId}`).emit('new_private_message', {
          message,
          chatId
        });

        // Emit back to sender for confirmation
        socket.emit('private_message_sent', {
          message,
          chatId
        });

      } catch (error) {
        console.error('Send private message error:', error);
        socket.emit('error', { message: 'Failed to send private message' });
      }
    });

    // Handle message status updates
    socket.on('update_message_status', async (data) => {
      try {
        const { messageId, status } = data;
        
        // Update message status
        const message = await Message.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        // Verify user is participant in this chat
        const privateChat = await PrivateChat.findOne({
          _id: message.chatId,
          participants: socket.user.id,
          isActive: true
        });

        if (!privateChat) {
          socket.emit('error', { message: 'Not authorized to update this message' });
          return;
        }

        // Only update if the user is not the sender (can't mark your own messages as read)
        if (message.senderId.toString() !== socket.user.id.toString()) {
          message.status = status;
          
          if (status === 'read') {
            // Add to readBy array if not already there
            const alreadyRead = message.readBy.some(read => 
              read.userId.toString() === socket.user.id.toString()
            );
            
            if (!alreadyRead) {
              message.readBy.push({
                userId: socket.user.id,
                readAt: new Date()
              });
            }
          }
          
          await message.save();
          
          // Notify the sender that their message status has changed
          socket.to(`user_${message.senderId}`).emit('message_status_updated', {
            messageId: message._id,
            status,
            chatId: message.chatId,
            updatedBy: socket.user.id
          });
        }
      } catch (error) {
        console.error('Update message status error:', error);
        socket.emit('error', { message: 'Failed to update message status' });
      }
    });

    // Handle typing indicators for private chats
    socket.on('private_typing_start', async (chatId) => {
      try {
        // Verify user is participant in this chat
        const privateChat = await PrivateChat.findOne({
          _id: chatId,
          participants: socket.user.id,
          isActive: true
        });

        if (!privateChat) {
          socket.emit('error', { message: 'Private chat not found' });
          return;
        }

        // Get the other participant
        const otherParticipantId = privateChat.participants.find(
          p => p.toString() !== socket.user.id.toString()
        );

        // Emit typing indicator to the other participant
        socket.to(`user_${otherParticipantId}`).emit('private_user_typing', {
          userId: socket.user.id,
          userName: socket.user.name,
          chatId
        });
      } catch (error) {
        console.error('Private typing indicator error:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    socket.on('private_typing_stop', async (chatId) => {
      try {
        // Verify user is participant in this chat
        const privateChat = await PrivateChat.findOne({
          _id: chatId,
          participants: socket.user.id,
          isActive: true
        });

        if (!privateChat) {
          socket.emit('error', { message: 'Private chat not found' });
          return;
        }

        // Get the other participant
        const otherParticipantId = privateChat.participants.find(
          p => p.toString() !== socket.user.id.toString()
        );

        // Emit typing stopped to the other participant
        socket.to(`user_${otherParticipantId}`).emit('private_user_stopped_typing', {
          userId: socket.user.id,
          chatId
        });
      } catch (error) {
        console.error('Private typing indicator error:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    // Handle chat messages for group chats
    socket.on('send_message', async (data) => {
      try {
        const { groupId, content, messageType = 'text', replyToId } = data;

        // Create message using Mongoose
        const message = new Message({
          chatId: groupId,
          chatType: 'group',
          senderId: socket.user.id,
          content: content,
          messageType: messageType,
          replyToId: replyToId || null,
          status: 'sent'
        });

        await message.save();
        
        const messageData = {
          _id: message._id,
          chatId: groupId,
          chatType: 'group',
          senderId: socket.user.id,
          senderName: socket.user.name,
          content,
          messageType,
          replyToId,
          createdAt: message.createdAt,
          status: 'sent'
        };

        // Broadcast to group members
        socket.to(`group_${groupId}`).emit('new_message', messageData);
        socket.emit('message_sent', messageData);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle joining chat groups
    socket.on('join_group', async (groupId) => {
      try {
        // Verify user is member of the group using Mongoose
        const isMember = await ChatGroup.exists({
          _id: groupId,
          'members.userId': socket.user.id
        });

        if (isMember) {
          socket.join(`group_${groupId}`);
          socket.emit('joined_group', { groupId });
        } else {
          socket.emit('error', { message: 'Not a member of this group' });
        }
      } catch (error) {
        console.error('Join group error:', error);
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    // Handle leaving chat groups
    socket.on('leave_group', (groupId) => {
      socket.leave(`group_${groupId}`);
      socket.emit('left_group', { groupId });
    });

    // Handle new report notifications
    socket.on('new_report', (reportData) => {
      if (socket.user.neighbourhoodId) {
        socket.to(`neighbourhood_${socket.user.neighbourhoodId}`).emit('report_created', {
          ...reportData,
          reporterName: reportData.anonymous ? 'Anonymous' : socket.user.name
        });
      }
    });

    // Handle new notice notifications
    socket.on('new_notice', (noticeData) => {
      if (socket.user.neighbourhoodId) {
        socket.to(`neighbourhood_${socket.user.neighbourhoodId}`).emit('notice_created', {
          ...noticeData,
          authorName: socket.user.name
        });
      }
    });

    // Handle typing indicators for group chats
    socket.on('typing_start', (groupId) => {
      socket.to(`group_${groupId}`).emit('user_typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        groupId
      });
    });

    socket.on('typing_stop', (groupId) => {
      socket.to(`group_${groupId}`).emit('user_stopped_typing', {
        userId: socket.user.id,
        groupId
      });
    });

    // Handle emergency alerts (admin/moderator only)
    socket.on('emergency_alert', async (alertData) => {
      try {
        if (!['admin', 'moderator'].includes(socket.user.role)) {
          socket.emit('error', { message: 'Insufficient permissions' });
          return;
        }

        if (socket.user.neighbourhoodId) {
          // Broadcast emergency alert to entire neighbourhood
          io.to(`neighbourhood_${socket.user.neighbourhoodId}`).emit('emergency_alert', {
            ...alertData,
            issuedBy: socket.user.name,
            timestamp: new Date().toISOString()
          });

          // Log the emergency alert using Mongoose
          const AuditLog = require('../models/AuditLog');
          await AuditLog.create({
            userId: socket.user.id,
            action: 'emergency_alert',
            resourceType: 'notification',
            details: alertData
          });
        }
      } catch (error) {
        console.error('Emergency alert error:', error);
        socket.emit('error', { message: 'Failed to send emergency alert' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected`);
    });
  });
};

module.exports = { setupSocketHandlers };
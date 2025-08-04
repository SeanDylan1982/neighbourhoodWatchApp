const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const PrivateChat = require('../models/PrivateChat');
const Message = require('../models/Message');
const router = express.Router();

// Get user's private chats
router.get('/', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { limit = 20, offset = 0 } = req.query;

    // Find all private chats where user is a participant
    const privateChats = await PrivateChat.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'firstName lastName profileImageUrl status')
    .populate('lastMessage.sender', 'firstName lastName')
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset));

    // Format the response to include the other participant's info
    const formattedChats = privateChats.map(chat => {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== userId);
      
      return {
        _id: chat._id,
        otherParticipant: {
          _id: otherParticipant._id,
          firstName: otherParticipant.firstName,
          lastName: otherParticipant.lastName,
          profileImageUrl: otherParticipant.profileImageUrl,
          status: otherParticipant.status
        },
        lastMessage: chat.lastMessage,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      };
    });

    res.json(formattedChats);
  } catch (error) {
    console.error('Get private chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or get existing private chat
router.post('/create', [
  body('participantId').isMongoId().withMessage('Valid participant ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { participantId } = req.body;

    // Check if trying to create chat with self
    if (userId === participantId) {
      return res.status(400).json({ message: 'Cannot create chat with yourself' });
    }

    // Check if participant exists and is active
    const participant = await User.findById(participantId);
    if (!participant || participant.status !== 'active') {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if users are friends (optional - you might want to allow chats between neighbors)
    const currentUser = await User.findById(userId);
    if (!currentUser.friends.includes(participantId)) {
      // Check if they're in the same neighbourhood as alternative
      if (currentUser.neighbourhoodId.toString() !== participant.neighbourhoodId.toString()) {
        return res.status(403).json({ message: 'Can only chat with friends or neighbors' });
      }
    }

    // Check if private chat already exists
    let privateChat = await PrivateChat.findOne({
      participants: { $all: [userId, participantId] }
    }).populate('participants', 'firstName lastName profileImageUrl status');

    if (!privateChat) {
      // Create new private chat
      privateChat = new PrivateChat({
        participants: [userId, participantId]
      });
      await privateChat.save();
      await privateChat.populate('participants', 'firstName lastName profileImageUrl status');
    }

    // Format response
    const otherParticipant = privateChat.participants.find(p => p._id.toString() !== userId);
    
    const formattedChat = {
      _id: privateChat._id,
      otherParticipant: {
        _id: otherParticipant._id,
        firstName: otherParticipant.firstName,
        lastName: otherParticipant.lastName,
        profileImageUrl: otherParticipant.profileImageUrl,
        status: otherParticipant.status
      },
      lastMessage: privateChat.lastMessage,
      createdAt: privateChat.createdAt,
      updatedAt: privateChat.updatedAt
    };

    res.status(201).json(formattedChat);
  } catch (error) {
    console.error('Create private chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages from a private chat
router.get('/:chatId/messages', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const chatId = req.params.chatId;
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is participant in this chat
    const privateChat = await PrivateChat.findOne({
      _id: chatId,
      participants: userId,
      isActive: true
    });

    if (!privateChat) {
      return res.status(404).json({ message: 'Private chat not found' });
    }

    // Get messages
    const messages = await Message.find({
      chatId: chatId,
      chatType: 'private'
    })
    .populate('senderId', 'firstName lastName profileImageUrl')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset));

    // Mark messages as read
    await Message.updateMany(
      {
        chatId: chatId,
        chatType: 'private',
        senderId: { $ne: userId },
        status: { $ne: 'read' }
      },
      { status: 'read' }
    );

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Get private chat messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message in private chat
router.post('/:chatId/messages', [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message content is required'),
  body('emojis').optional().isArray(),
  body('replyToId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const chatId = req.params.chatId;
    const userId = req.user.userId;
    const { content, emojis = [], replyToId } = req.body;

    // Verify user is participant in this chat
    const privateChat = await PrivateChat.findOne({
      _id: chatId,
      participants: userId,
      isActive: true
    });

    if (!privateChat) {
      return res.status(404).json({ message: 'Private chat not found' });
    }

    // Create message
    const message = new Message({
      chatId: chatId,
      chatType: 'private',
      senderId: userId,
      content: content,
      emojis: emojis,
      replyToId: replyToId || null
    });

    await message.save();
    await message.populate('senderId', 'firstName lastName profileImageUrl');

    // Update private chat's last message
    privateChat.lastMessage = {
      content: content,
      sender: userId,
      timestamp: message.createdAt,
      messageType: 'text'
    };
    privateChat.updatedAt = new Date();
    await privateChat.save();

    // Get the other participant to send them the message via socket
    const otherParticipantId = privateChat.participants.find(
      p => p.toString() !== userId.toString()
    );

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Emit to the other participant
      io.to(`user_${otherParticipantId}`).emit('new_private_message', {
        message,
        chatId
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send private message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete private chat (hide for current user)
router.delete('/:chatId', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.userId;

    // Verify user is participant in this chat
    const privateChat = await PrivateChat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!privateChat) {
      return res.status(404).json({ message: 'Private chat not found' });
    }

    // For now, we'll just mark as inactive for the user
    // In a more complex system, you might want to track which users have "deleted" the chat
    // For simplicity, we'll just remove the user from participants
    privateChat.participants = privateChat.participants.filter(p => p.toString() !== userId);
    
    if (privateChat.participants.length === 0) {
      // If no participants left, mark as inactive
      privateChat.isActive = false;
    }
    
    await privateChat.save();

    res.json({ message: 'Private chat deleted' });
  } catch (error) {
    console.error('Delete private chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count for user's private chats
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all private chats for the user
    const privateChats = await PrivateChat.find({
      participants: userId,
      isActive: true
    }).select('_id');

    const chatIds = privateChats.map(chat => chat._id);

    // Count unread messages
    const unreadCount = await Message.countDocuments({
      chatId: { $in: chatIds },
      chatType: 'private',
      senderId: { $ne: userId },
      status: { $ne: 'read' }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
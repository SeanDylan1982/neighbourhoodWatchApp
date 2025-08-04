const express = require('express');
const { body, validationResult, query } = require('express-validator');
const ChatGroup = require('../models/ChatGroup');
const Message = require('../models/Message');
const User = require('../models/User');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// Get user's chat groups
router.get('/groups', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find chat groups where the user is a member
    const groups = await ChatGroup.find({
      'members.userId': userId,
      isActive: true
    })
    .populate('createdBy', 'firstName lastName')
    .populate('members.userId', 'firstName lastName')
    .sort({ lastActivity: -1, createdAt: -1 });

    // Get additional data for each group
    const groupsWithData = await Promise.all(groups.map(async (group) => {
      // Find user's role in this group
      const userMember = group.members.find(member => member.userId._id.toString() === userId);
      
      // Get message count
      const messageCount = await Message.countDocuments({
        chatId: group._id,
        chatType: 'group',
        moderationStatus: 'active'
      });

      // Get last message
      const lastMessage = await Message.findOne({
        chatId: group._id,
        chatType: 'group',
        moderationStatus: 'active'
      })
      .sort({ createdAt: -1 })
      .populate('senderId', 'firstName lastName');

      return {
        id: group._id,
        name: group.name,
        description: group.description,
        type: group.type,
        memberRole: userMember?.role || 'member',
        memberCount: group.members.length,
        messageCount,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender: lastMessage.senderId,
          createdAt: lastMessage.createdAt
        } : null,
        lastActivity: group.lastActivity,
        createdAt: group.createdAt
      };
    }));

    res.json(groupsWithData);
  } catch (error) {
    console.error('Get chat groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a group
router.get('/groups/:groupId/messages', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('before').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const groupId = req.params.groupId;
    const { limit = 50, offset = 0, before } = req.query;
    const userId = req.user.userId;

    // Verify user is member of the group
    const group = await ChatGroup.findOne({
      _id: groupId,
      'members.userId': userId,
      isActive: true
    });

    if (!group) {
      return res.status(403).json({ message: 'Not a member of this group or group not found' });
    }

    // Build query
    const query = {
      chatId: groupId,
      chatType: 'group',
      moderationStatus: 'active'
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'firstName lastName profileImageUrl')
      .populate('replyToId', 'content senderId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Format messages
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      content: msg.content,
      messageType: msg.messageType,
      media: msg.media,
      senderId: msg.senderId._id,
      senderName: `${msg.senderId.firstName} ${msg.senderId.lastName}`,
      senderAvatar: msg.senderId.profileImageUrl,
      replyTo: msg.replyToId ? {
        id: msg.replyToId._id,
        content: msg.replyToId.content,
        senderId: msg.replyToId.senderId
      } : null,
      isEdited: msg.isEdited,
      status: msg.status,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    })).reverse(); // Reverse to show oldest first

    res.json(formattedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/groups/:groupId/messages', [
  body('content').trim().isLength({ min: 1 }),
  body('messageType').optional().isIn(['text', 'image', 'video', 'file']),
  body('replyToId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const groupId = req.params.groupId;
    const { content, messageType = 'text', replyToId } = req.body;
    const userId = req.user.userId;

    // Verify user is member of the group
    const group = await ChatGroup.findOne({
      _id: groupId,
      'members.userId': userId,
      isActive: true
    });

    if (!group) {
      return res.status(403).json({ message: 'Not a member of this group or group not found' });
    }

    // Create message
    const message = new Message({
      chatId: groupId,
      chatType: 'group',
      senderId: userId,
      content,
      messageType,
      replyToId: replyToId || null,
      status: 'sent',
      moderationStatus: 'active'
    });

    await message.save();

    // Update group's last activity
    group.lastActivity = new Date();
    await group.save();

    // Populate sender info for response
    await message.populate('senderId', 'firstName lastName profileImageUrl');

    const formattedMessage = {
      id: message._id,
      content: message.content,
      messageType: message.messageType,
      media: message.media,
      senderId: message.senderId._id,
      senderName: `${message.senderId.firstName} ${message.senderId.lastName}`,
      senderAvatar: message.senderId.profileImageUrl,
      replyTo: null, // Would need to populate if replyToId exists
      isEdited: message.isEdited,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new chat group
router.post('/groups', [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('type').optional().isIn(['public', 'private', 'announcement'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type = 'public' } = req.body;
    const userId = req.user.userId;

    // Get user's neighbourhood
    const user = await User.findById(userId).select('neighbourhoodId');
    if (!user || !user.neighbourhoodId) {
      return res.status(400).json({ message: 'User must be assigned to a neighbourhood' });
    }

    // Create chat group
    const chatGroup = new ChatGroup({
      name,
      description,
      type,
      neighbourhoodId: user.neighbourhoodId,
      createdBy: userId,
      members: [{
        userId: userId,
        role: 'admin',
        joinedAt: new Date()
      }],
      isActive: true,
      lastActivity: new Date()
    });

    await chatGroup.save();
    await chatGroup.populate('createdBy', 'firstName lastName');
    await chatGroup.populate('members.userId', 'firstName lastName');

    res.status(201).json({
      id: chatGroup._id,
      name: chatGroup.name,
      description: chatGroup.description,
      type: chatGroup.type,
      memberRole: 'admin',
      memberCount: chatGroup.members.length,
      messageCount: 0,
      lastMessage: null,
      lastActivity: chatGroup.lastActivity,
      createdAt: chatGroup.createdAt
    });
  } catch (error) {
    console.error('Create chat group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a chat group
router.post('/groups/:groupId/join', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    const group = await ChatGroup.findOne({
      _id: groupId,
      isActive: true,
      type: { $in: ['public'] } // Only allow joining public groups
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found or not joinable' });
    }

    // Check if user is already a member
    const existingMember = group.members.find(member => member.userId.toString() === userId);
    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    // Add user to group
    group.members.push({
      userId: userId,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    res.json({ message: 'Successfully joined the group' });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a chat group
router.post('/groups/:groupId/leave', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const userId = req.user.userId;

    const group = await ChatGroup.findOne({
      _id: groupId,
      isActive: true
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Remove user from group
    group.members = group.members.filter(member => member.userId.toString() !== userId);

    // If no members left, deactivate the group
    if (group.members.length === 0) {
      group.isActive = false;
    }

    await group.save();

    res.json({ message: 'Successfully left the group' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
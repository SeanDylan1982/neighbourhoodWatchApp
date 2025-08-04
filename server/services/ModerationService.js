const Notice = require('../models/Notice');
const Report = require('../models/Report');
const Message = require('../models/Message');
const PrivateChat = require('../models/PrivateChat');
const AuditService = require('./AuditService');
const RealTimeService = require('./RealTimeService');

/**
 * Service for content moderation functionality
 */
class ModerationService {
  /**
   * Update content status (active, archived, removed)
   * @param {Object} params - Parameters
   * @param {string} params.contentType - Type of content (notice, report, message)
   * @param {string} params.contentId - ID of the content
   * @param {string} params.status - New status (active, archived, removed)
   * @param {string} params.moderationReason - Reason for moderation
   * @param {string} params.adminId - ID of the admin performing the action
   * @returns {Promise<Object>} Updated content
   */
  static async updateContentStatus(params) {
    const { contentType, contentId, status, moderationReason, adminId } = params;
    
    let Model;
    let content;
    let targetType;
    
    switch (contentType) {
      case 'notice':
        Model = Notice;
        targetType = 'notice';
        break;
      case 'report':
        Model = Report;
        targetType = 'report';
        break;
      case 'message':
        Model = Message;
        targetType = 'chat';
        break;
      default:
        throw new Error('Invalid content type');
    }
    
    content = await Model.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Get the current status based on content type
    let oldStatus;
    if (contentType === 'message') {
      oldStatus = content.moderationStatus || 'active';
    } else if (contentType === 'report') {
      oldStatus = content.reportStatus || 'active';
    } else {
      oldStatus = content.status || 'active';
    }
    
    // Update content status based on content type
    if (contentType === 'message') {
      content.moderationStatus = status;
    } else if (contentType === 'report') {
      content.reportStatus = status;
    } else {
      content.status = status;
    }
    
    // Add moderation metadata
    content.moderationReason = moderationReason;
    content.moderatedBy = adminId;
    content.moderatedAt = new Date();
    
    const updatedContent = await content.save();
    
    // Log the action to audit log
    await AuditService.logAction({
      adminId,
      action: 'content_moderate',
      targetType,
      targetId: contentId,
      details: {
        oldStatus,
        newStatus: status,
        reason: moderationReason || 'No reason provided'
      }
    });
    
    // Send real-time notification if applicable
    if (contentType === 'notice' || contentType === 'report') {
      const authorId = contentType === 'notice' ? content.authorId : content.reporterId;
      
      // Notify the content author
      RealTimeService.sendNotification({
        userId: authorId,
        type: 'content_moderated',
        message: `Your ${contentType} has been ${status === 'removed' ? 'removed' : 'moderated'}.`,
        data: {
          contentType,
          contentId,
          status,
          reason: moderationReason
        }
      });
    }
    
    return updatedContent;
  }
  
  /**
   * Edit content (for admin use)
   * @param {Object} params - Parameters
   * @param {string} params.contentType - Type of content (notice, report, message)
   * @param {string} params.contentId - ID of the content
   * @param {Object} params.updates - Fields to update
   * @param {string} params.moderationReason - Reason for edit
   * @param {string} params.adminId - ID of the admin performing the action
   * @returns {Promise<Object>} Updated content
   */
  static async editContent(params) {
    const { contentType, contentId, updates, moderationReason, adminId } = params;
    
    let Model;
    let content;
    let targetType;
    
    switch (contentType) {
      case 'notice':
        Model = Notice;
        targetType = 'notice';
        break;
      case 'report':
        Model = Report;
        targetType = 'report';
        break;
      case 'message':
        Model = Message;
        targetType = 'chat';
        break;
      default:
        throw new Error('Invalid content type');
    }
    
    content = await Model.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Store original values for audit log
    const originalValues = {};
    Object.keys(updates).forEach(key => {
      originalValues[key] = content[key];
    });
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      // Prevent updating certain fields
      if (['_id', 'authorId', 'reporterId', 'senderId', 'createdAt'].includes(key)) {
        return;
      }
      content[key] = updates[key];
    });
    
    // Add moderation metadata
    content.moderationReason = moderationReason;
    content.moderatedBy = adminId;
    content.moderatedAt = new Date();
    content.isEdited = true;
    
    const updatedContent = await content.save();
    
    // Log the action to audit log
    await AuditService.logAction({
      adminId,
      action: 'content_edit',
      targetType,
      targetId: contentId,
      details: {
        originalValues,
        newValues: updates,
        reason: moderationReason || 'No reason provided'
      }
    });
    
    // Send real-time notification if applicable
    if (contentType === 'notice' || contentType === 'report') {
      const authorId = contentType === 'notice' ? content.authorId : content.reporterId;
      
      // Notify the content author
      RealTimeService.sendNotification({
        userId: authorId,
        type: 'content_edited',
        message: `Your ${contentType} has been edited by an administrator.`,
        data: {
          contentType,
          contentId,
          reason: moderationReason
        }
      });
    }
    
    return updatedContent;
  }
  
  /**
   * Approve content and clear all reports
   * @param {Object} params - Parameters
   * @param {string} params.contentType - Type of content (notice, report, message)
   * @param {string} params.contentId - ID of the content
   * @param {string} params.moderationReason - Reason for approval
   * @param {string} params.adminId - ID of the admin performing the action
   * @returns {Promise<Object>} Updated content
   */
  static async approveContent(params) {
    const { contentType, contentId, moderationReason, adminId } = params;
    
    let Model;
    let content;
    let targetType;
    
    switch (contentType) {
      case 'notice':
        Model = Notice;
        targetType = 'notice';
        break;
      case 'report':
        Model = Report;
        targetType = 'report';
        break;
      case 'message':
        Model = Message;
        targetType = 'chat';
        break;
      default:
        throw new Error('Invalid content type');
    }
    
    content = await Model.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Clear all reports and flagged status
    content.reports = [];
    content.isFlagged = false;
    content.flaggedAt = null;
    
    // Set status to active if it's not already
    if (contentType === 'message') {
      content.moderationStatus = 'active';
    } else if (contentType === 'report') {
      content.reportStatus = 'active';
    } else {
      content.status = 'active';
    }
    
    // Add moderation metadata
    content.moderationReason = moderationReason || 'Content approved by administrator';
    content.moderatedBy = adminId;
    content.moderatedAt = new Date();
    
    const updatedContent = await content.save();
    
    // Log the action to audit log
    await AuditService.logAction({
      adminId,
      action: 'content_approve',
      targetType,
      targetId: contentId,
      details: {
        reason: moderationReason || 'Content approved by administrator',
        reportsCleared: true
      }
    });
    
    // Send real-time notification if applicable
    if (contentType === 'notice' || contentType === 'report') {
      const authorId = contentType === 'notice' ? content.authorId : content.reporterId;
      
      // Notify the content author
      RealTimeService.sendNotification({
        userId: authorId,
        type: 'content_approved',
        message: `Your ${contentType} has been approved and all reports have been cleared.`,
        data: {
          contentType,
          contentId,
          reason: moderationReason
        }
      });
    }
    
    return updatedContent;
  }

  /**
   * Restore content to active status
   * @param {Object} params - Parameters
   * @param {string} params.contentType - Type of content (notice, report, message)
   * @param {string} params.contentId - ID of the content
   * @param {string} params.moderationReason - Reason for restoration
   * @param {string} params.adminId - ID of the admin performing the action
   * @returns {Promise<Object>} Updated content
   */
  static async restoreContent(params) {
    const { contentType, contentId, moderationReason, adminId } = params;
    
    // Use updateContentStatus with 'active' status
    return this.updateContentStatus({
      contentType,
      contentId,
      status: 'active',
      moderationReason: moderationReason || 'Content restored by administrator',
      adminId
    });
  }
  
  /**
   * Get moderated content with pagination and filtering
   * @param {Object} params - Parameters
   * @param {string} params.contentType - Type of content (notice, report, message, all)
   * @param {string} params.status - Filter by status (active, archived, removed, all)
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {boolean} params.flagged - Show only flagged content
   * @param {boolean} params.moderated - Show only moderated content
   * @param {string} params.reportReason - Filter by report reason
   * @returns {Promise<Object>} Paginated moderated content
   */
  static async getModeratedContent(params) {
    const { contentType = 'all', status, page = 1, limit = 20, flagged = false, moderated = false, reportReason } = params;
    
    const query = {};
    if (status && status !== 'all') {
      // Handle different status fields for different content types
      if (contentType === 'message') {
        query.moderationStatus = status;
      } else if (contentType === 'report') {
        query.reportStatus = status;
      } else {
        query.status = status;
      }
    }
    
    if (flagged) {
      // Show flagged content
      query.isFlagged = true;
      
      // Filter by report reason if specified
      if (reportReason) {
        query['reports.reason'] = reportReason;
      }
    } else if (moderated) {
      // Show only moderated content
      query.moderatedBy = { $exists: true };
    }
    // Otherwise show all content
    
    let results = { total: 0, content: [], page, limit, totalPages: 0 };
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Function to get paginated content from a model
    const getPaginatedContent = async (Model, type) => {
      let modelQuery = { ...query };
      
      // Adjust status field based on content type
      if (status && status !== 'all') {
        delete modelQuery.status;
        delete modelQuery.moderationStatus;
        delete modelQuery.reportStatus;
        
        if (type === 'message') {
          modelQuery.moderationStatus = status;
        } else if (type === 'report') {
          modelQuery.reportStatus = status;
        } else {
          modelQuery.status = status;
        }
      }
      
      const total = await Model.countDocuments(modelQuery);
      const content = await Model.find(modelQuery)
        .populate('moderatedBy', 'firstName lastName email')
        .populate('reports.reportedBy', 'firstName lastName email')
        .populate('authorId', 'firstName lastName email')
        .populate('reporterId', 'firstName lastName email')
        .populate('senderId', 'firstName lastName email')
        .sort({ 
          // Sort flagged content by most recent report, others by moderation date
          ...(flagged ? { flaggedAt: -1 } : { moderatedAt: -1, createdAt: -1 })
        })
        .skip(skip)
        .limit(parseInt(limit));
      
      return {
        total,
        content: content.map(item => ({
          ...item.toObject(),
          contentType: type,
          // Add author/creator info for easier display
          author: item.authorId || item.reporterId || item.senderId,
          createdBy: item.authorId || item.reporterId || item.senderId
        }))
      };
    };
    
    // Get content based on type
    if (contentType === 'all' || contentType === 'notice') {
      const noticeResults = await getPaginatedContent(Notice, 'notice');
      results.total += noticeResults.total;
      results.content = [...results.content, ...noticeResults.content];
    }
    
    if (contentType === 'all' || contentType === 'report') {
      const reportResults = await getPaginatedContent(Report, 'report');
      results.total += reportResults.total;
      results.content = [...results.content, ...reportResults.content];
    }
    
    if (contentType === 'all' || contentType === 'message') {
      const messageResults = await getPaginatedContent(Message, 'message');
      results.total += messageResults.total;
      results.content = [...results.content, ...messageResults.content];
    }
    
    // Sort combined results by appropriate date
    if (flagged) {
      results.content.sort((a, b) => 
        new Date(b.flaggedAt || b.createdAt) - new Date(a.flaggedAt || a.createdAt)
      );
    } else {
      results.content.sort((a, b) => 
        new Date(b.moderatedAt || b.createdAt) - new Date(a.moderatedAt || a.createdAt)
      );
    }
    
    // Adjust for pagination if getting all content types
    if (contentType === 'all') {
      results.content = results.content.slice(0, parseInt(limit));
    }
    
    results.totalPages = Math.ceil(results.total / parseInt(limit));
    
    return results;
  }

  /**
   * Report content for moderation
   * @param {Object} params - Parameters
   * @param {string} params.contentType - Type of content (notice, report, message)
   * @param {string} params.contentId - ID of the content
   * @param {string} params.reason - Reason for reporting
   * @param {string} params.reporterId - ID of the user reporting the content
   * @returns {Promise<Object>} Report record
   */
  static async reportContent(params) {
    const { contentType, contentId, reason, reporterId } = params;
    
    let Model;
    let content;
    
    switch (contentType) {
      case 'notice':
        Model = Notice;
        break;
      case 'report':
        Model = Report;
        break;
      case 'message':
        Model = Message;
        break;
      default:
        throw new Error('Invalid content type');
    }
    
    // Check if content exists
    content = await Model.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Check if user has already reported this content
    // First ensure the content has a reports array
    if (!content.reports) {
      content.reports = [];
    }
    
    // Check if this user has already reported this content
    const hasAlreadyReported = content.reports.some(
      report => report.reporterId && report.reporterId.toString() === reporterId.toString()
    );
    
    if (hasAlreadyReported) {
      throw new Error('Content already reported by this user');
    }
    
    // Add report to the content
    const reportData = {
      reporterId,
      reason,
      reportedAt: new Date()
    };
    
    const updatedContent = await Model.findByIdAndUpdate(
      contentId,
      { 
        $push: { reports: reportData },
        $set: { 
          isFlagged: true,
          flaggedAt: new Date()
        }
      },
      { new: true }
    );
    
    // Log the report action
    await AuditService.logAction({
      userId: reporterId,
      action: 'content_report',
      targetType: contentType,
      targetId: contentId,
      details: {
        reason,
        contentTitle: content.title || 'Message',
        reportedAt: new Date()
      }
    });
    
    // Notify real-time service about flagged content
    RealTimeService.notifyAdmins('content_flagged', {
      contentType,
      contentId,
      reason,
      reporterId,
      contentTitle: content.title || 'Message'
    });
    
    return updatedContent;
  }
}

module.exports = ModerationService;
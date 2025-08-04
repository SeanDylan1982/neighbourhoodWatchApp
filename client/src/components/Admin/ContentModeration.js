import icons from '../Common/Icons'
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Flag as FlagIcon,
  Campaign as NoticeIcon,
  Report as ReportIcon,
  Chat as ChatIcon,
  Edit as EditIcon,
  RestoreFromTrash as RestoreIcon,
  Archive as ArchiveIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import useApi from '../../hooks/useApi';
import { StatsSkeleton } from '../Common/LoadingSkeleton';

const ContentModeration = () => {
  const { loading, error, clearError, getWithRetry, deleteWithRetry, patchWithRetry, postWithRetry } = useApi();
  const [activeTab, setActiveTab] = useState(0);
  const [contentType, setContentType] = useState('all');
  const [status, setStatus] = useState('all');
  const [showFlagged, setShowFlagged] = useState('all'); // 'all', 'flagged', 'moderated'
  const [reportReason, setReportReason] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [moderatedContent, setModeratedContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  const [editFormData, setEditFormData] = useState({});

  const fetchContent = useCallback(async () => {
    try {
      clearError();
      
      // Map tab index to content type
      const contentTypes = ['all', 'notice', 'report', 'message'];
      const currentContentType = contentTypes[activeTab];
      
      const params = {
        contentType: currentContentType,
        status,
        page,
        limit
      };
      
      // Add flagged filter if specified
      if (showFlagged === 'flagged') {
        params.flagged = true;
        if (reportReason) {
          params.reportReason = reportReason;
        }
      } else if (showFlagged === 'moderated') {
        params.moderated = true;
      }
      
      const response = await getWithRetry('/api/moderation/content', {
        params
      });
      
      if (response && response.content) {
        setModeratedContent(response.content);
        setTotalPages(response.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching moderated content:', error);
    }
  }, [clearError, getWithRetry, activeTab, status, page, limit, showFlagged, reportReason]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(1); // Reset to first page when changing tabs
  };
  
  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1); // Reset to first page when changing status filter
  };
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleContentAction = (content, action) => {
    setSelectedContent(content);
    setActionType(action);
    
    if (action === 'edit') {
      // Initialize edit form data based on content type
      let formData = {};
      
      if (content.contentType === 'notice') {
        formData = {
          title: content.title,
          content: content.content
        };
      } else if (content.contentType === 'report') {
        formData = {
          title: content.title,
          description: content.description
        };
      } else if (content.contentType === 'message') {
        formData = {
          content: content.content
        };
      }
      
      setEditFormData(formData);
    }
    
    setModerationReason('');
    setActionDialogOpen(true);
  };
  
  const handleEditFormChange = (field, value) => {
    setEditFormData({
      ...editFormData,
      [field]: value
    });
  };

  const handleConfirmAction = async () => {
    try {
      clearError();
      const { contentType, _id } = selectedContent;
      
      switch (actionType) {
        case 'remove':
          await patchWithRetry(`/api/moderation/content/${contentType}/${_id}/status`, {
            status: 'removed',
            moderationReason
          });
          break;
          
        case 'archive':
          await patchWithRetry(`/api/moderation/content/${contentType}/${_id}/status`, {
            status: 'archived',
            moderationReason
          });
          break;
          
        case 'restore':
          await postWithRetry(`/api/moderation/content/${contentType}/${_id}/restore`, {
            moderationReason
          });
          break;
          
        case 'approve':
          // Clear all reports and mark as reviewed
          await patchWithRetry(`/api/moderation/content/${contentType}/${_id}/approve`, {
            moderationReason
          });
          break;
          
        case 'edit':
          await patchWithRetry(`/api/moderation/content/${contentType}/${_id}/edit`, {
            updates: editFormData,
            moderationReason
          });
          break;
          
        default:
          console.error('Unknown action type:', actionType);
          break;
      }
      
      // Refresh content after action
      fetchContent();
      
      setActionDialogOpen(false);
      setSelectedContent(null);
      setActionType('');
      setModerationReason('');
      setEditFormData({});
    } catch (error) {
      console.error('Error performing content action:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'archived': return 'warning';
      case 'removed': return 'error';
      case 'open': return 'info';
      case 'in-progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getContentIcon = (contentType) => {
    switch (contentType) {
      case 'notice': return <icons.Campaign />;
      case 'report': return <icons.Report />;
      case 'message': return <icons.Chat />;
      default: return <icons.Campaign />;
    }
  };
  
  const getContentStatus = (item) => {
    if (item.contentType === 'notice') {
      return item.status || 'active';
    } else if (item.contentType === 'report') {
      return item.reportStatus || 'active';
    } else if (item.contentType === 'message') {
      return item.moderationStatus || 'active';
    }
    return 'active';
  };
  
  const renderContentList = () => (
    <List>
      {Array.isArray(moderatedContent) && moderatedContent.length > 0 ? moderatedContent.map((item) => (
        <React.Fragment key={item._id}>
          <Card sx={{ mb: 2, border: item.reports && item.reports.length > 0 ? '2px solid #f44336' : '1px solid #e0e0e0' }}>
            <CardContent>
              {/* Header with content type, status, and report indicators */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getContentIcon(item.contentType)}
                  <Typography variant="h6">
                    {item.title || `${item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1)} Content`}
                  </Typography>
                  <Chip 
                    label={item.contentType} 
                    size="small" 
                    color="primary"
                  />
                  <Chip 
                    label={getContentStatus(item)} 
                    size="small" 
                    color={getStatusColor(getContentStatus(item))}
                  />
                  {item.reports && item.reports.length > 0 && (
                    <Chip 
                      label={`${item.reports.length} Report${item.reports.length > 1 ? 's' : ''}`} 
                      size="small" 
                      color="error"
                      icon={<FlagIcon />}
                    />
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {/* Quick Actions for Flagged Content */}
                  {item.reports && item.reports.length > 0 && getContentStatus(item) === 'active' && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => {
                          setSelectedContent(item);
                          setActionType('approve');
                          setModerationReason('Content reviewed and approved');
                          setActionDialogOpen(true);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleContentAction(item, 'archive')}
                      >
                        Archive
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleContentAction(item, 'remove')}
                      >
                        Remove
                      </Button>
                    </>
                  )}
                  
                  {/* Standard Actions */}
                  <IconButton 
                    size="small"
                    onClick={() => handleContentAction(item, 'edit')}
                    title="Edit Content"
                  >
                    <icons.Edit />
                  </IconButton>
                  
                  {getContentStatus(item) === 'active' && (!item.reports || item.reports.length === 0) && (
                    <>
                      <IconButton 
                        size="small"
                        onClick={() => handleContentAction(item, 'archive')}
                        title="Archive Content"
                      >
                        <ArchiveIcon />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={() => handleContentAction(item, 'remove')}
                        title="Remove Content"
                        color="error"
                      >
                        <icons.Delete />
                      </IconButton>
                    </>
                  )}
                  
                  {(getContentStatus(item) === 'archived' || getContentStatus(item) === 'removed') && (
                    <IconButton 
                      size="small"
                      onClick={() => handleContentAction(item, 'restore')}
                      title="Restore Content"
                      color="success"
                    >
                      <RestoreIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Content Preview */}
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Original Content:
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {item.content || item.description || 'No content available'}
                </Typography>
              </Box>

              {/* Author and Context Information */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    {item.author?.firstName?.charAt(0) || item.createdBy?.firstName?.charAt(0) || 'U'}
                  </Avatar>
                  <Typography variant="body2">
                    By: {item.author?.firstName || item.createdBy?.firstName || 'Unknown'} {item.author?.lastName || item.createdBy?.lastName || ''}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Posted: {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString()}
                </Typography>
              </Box>

              {/* Reports Section - Only show if there are reports */}
              {item.reports && item.reports.length > 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1, border: '1px solid #ffcdd2' }}>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FlagIcon fontSize="small" />
                    Reports ({item.reports.length}):
                  </Typography>
                  {item.reports.map((report, index) => (
                    <Box key={index} sx={{ mb: index < item.reports.length - 1 ? 1 : 0, pl: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        Reason: {report.reason || 'No reason provided'}
                      </Typography>
                      {report.description && (
                        <Typography variant="body2" color="text.secondary">
                          Details: {report.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Reported by: {report.reportedBy?.firstName || 'Anonymous'} {report.reportedBy?.lastName || ''} • 
                        {new Date(report.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Moderation History */}
              {(item.moderatedBy || item.moderationReason) && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Moderation History:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.moderatedBy ? `Moderated by ${item.moderatedBy.firstName} ${item.moderatedBy.lastName}` : 'Not moderated'} • 
                    {item.moderatedAt ? ` ${new Date(item.moderatedAt).toLocaleDateString()}` : ''}
                  </Typography>
                  {item.moderationReason && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Reason: {item.moderationReason}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </React.Fragment>
      )) : (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No moderated content found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {showFlagged === 'flagged' ? 'No flagged content to review' : 'No content matches the current filters'}
          </Typography>
        </Box>
      )}
    </List>
  );

  if (loading && (!Array.isArray(moderatedContent) || moderatedContent.length === 0)) {
    return <StatsSkeleton />;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Content Moderation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Summary Statistics for Flagged Content */}
      {showFlagged === 'flagged' && (
        <Card sx={{ mb: 2, bgcolor: '#fff3e0' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlagIcon color="warning" />
              Flagged Content Summary
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h4" color="error">
                  {Array.isArray(moderatedContent) ? moderatedContent.filter(item => item.reports && item.reports.length > 0).length : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Items with Reports
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="warning.main">
                  {Array.isArray(moderatedContent) ? moderatedContent.reduce((total, item) => total + (item.reports ? item.reports.length : 0), 0) : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Reports
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="info.main">
                  {Array.isArray(moderatedContent) ? moderatedContent.filter(item => !item.moderatedBy).length : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Review
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="All Content" />
            <Tab label="Notices" />
            <Tab label="Reports" />
            <Tab label="Messages" />
          </Tabs>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={handleStatusChange}
                label="Status"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
                <MenuItem value="removed">Removed</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={showFlagged}
                onChange={(e) => {
                  setShowFlagged(e.target.value);
                  setPage(1);
                }}
                label="Filter"
              >
                <MenuItem value="all">All Content</MenuItem>
                <MenuItem value="flagged">Flagged Only</MenuItem>
                <MenuItem value="moderated">Moderated Only</MenuItem>
              </Select>
            </FormControl>
            
            {showFlagged === 'flagged' && (
              <FormControl variant="outlined" size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Report Reason</InputLabel>
                <Select
                  value={reportReason || 'all'}
                  onChange={(e) => {
                    setReportReason(e.target.value === 'all' ? '' : e.target.value);
                    setPage(1);
                  }}
                  label="Report Reason"
                >
                  <MenuItem value="all">All Reasons</MenuItem>
                  <MenuItem value="inappropriate">Inappropriate Content</MenuItem>
                  <MenuItem value="spam">Spam</MenuItem>
                  <MenuItem value="harassment">Harassment</MenuItem>
                  <MenuItem value="misinformation">Misinformation</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>

        <CardContent>
          {renderContentList()}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
            />
          </Box>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog 
        open={actionDialogOpen} 
        onClose={() => setActionDialogOpen(false)}
        fullWidth
        maxWidth={actionType === 'edit' ? 'md' : 'sm'}
      >
        <DialogTitle>
          {actionType === 'remove' ? 'Remove Content' : 
           actionType === 'archive' ? 'Archive Content' : 
           actionType === 'restore' ? 'Restore Content' : 
           actionType === 'approve' ? 'Approve Content' :
           'Edit Content'}
        </DialogTitle>
        <DialogContent>
          {actionType !== 'edit' && (
            <Typography sx={{ mb: 2 }}>
              {actionType === 'approve' 
                ? `Are you sure you want to approve this ${selectedContent?.contentType}? This will clear all reports and mark it as reviewed.`
                : `Are you sure you want to ${actionType} this ${selectedContent?.contentType}?`
              }
            </Typography>
          )}
          
          {actionType === 'edit' && selectedContent && (
            <>
              {selectedContent.contentType === 'notice' && (
                <>
                  <TextField
                    margin="dense"
                    label="Title"
                    fullWidth
                    variant="outlined"
                    value={editFormData.title || ''}
                    onChange={(e) => handleEditFormChange('title', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Content"
                    fullWidth
                    variant="outlined"
                    value={editFormData.content || ''}
                    onChange={(e) => handleEditFormChange('content', e.target.value)}
                    multiline
                    rows={4}
                    sx={{ mb: 2 }}
                  />
                </>
              )}
              
              {selectedContent.contentType === 'report' && (
                <>
                  <TextField
                    margin="dense"
                    label="Title"
                    fullWidth
                    variant="outlined"
                    value={editFormData.title || ''}
                    onChange={(e) => handleEditFormChange('title', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Description"
                    fullWidth
                    variant="outlined"
                    value={editFormData.description || ''}
                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                    multiline
                    rows={4}
                    sx={{ mb: 2 }}
                  />
                </>
              )}
              
              {selectedContent.contentType === 'message' && (
                <TextField
                  label="Message Content"
                  fullWidth
                  variant="outlined"
                  value={editFormData.content || ''}
                  onChange={(e) => handleEditFormChange('content', e.target.value)}
                  multiline
                  rows={4}
                  sx={{ mb: 2 }}
                />
              )}
            </>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Moderation Reason"
            value={moderationReason}
            onChange={(e) => setModerationReason(e.target.value)}
            placeholder="Provide a reason for this action..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained" 
            color={actionType === 'remove' ? 'error' : actionType === 'restore' || actionType === 'approve' ? 'success' : 'primary'}
            disabled={!moderationReason.trim()}
          >
            {actionType === 'remove' ? 'Remove' : 
             actionType === 'archive' ? 'Archive' : 
             actionType === 'restore' ? 'Restore' : 
             actionType === 'approve' ? 'Approve' :
             'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContentModeration;
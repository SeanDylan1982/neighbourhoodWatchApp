import React, { useState, useEffect, useRef } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Avatar,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  PersonAdd as FriendRequestIcon,
  Message as MessageIcon,
  Favorite as LikeIcon,
  Comment as CommentIcon,
  Info as SystemIcon,
  Report as ReportIcon,
  Campaign as NoticeIcon,
  MarkEmailRead as MarkReadIcon
} from '@mui/icons-material';
import icons from '../Common/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import notificationSoundService from '../../services/NotificationSoundService';
import pushNotificationService from '../../services/PushNotificationService';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications?limit=10');
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up polling for unread count
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      // Poll every 30 seconds
      intervalRef.current = setInterval(() => {
        const previousCount = unreadCount;
        fetchUnreadCount().then(() => {
          // Play sound if new notifications arrived
          if (unreadCount > previousCount) {
            notificationSoundService.playSound('default');
          }
        });
      }, 30000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [user, unreadCount]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (notifications.length === 0) {
      fetchNotifications();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.read) {
        await axios.put(`/api/notifications/${notification._id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
      }

      // Navigate based on notification type and reference
      navigateToContent(notification);
      handleClose();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const navigateToContent = (notification) => {
    const { reference, type } = notification;
    
    switch (reference.type) {
      case 'friendRequest':
        navigate('/contacts?tab=friends');
        break;
      case 'message':
        if (type === 'privateMessage') {
          navigate('/private-chat');
        } else {
          navigate('/chat');
        }
        break;
      case 'notice':
        navigate(`/notices/${reference.id}`);
        break;
      case 'report':
        navigate(`/reports/${reference.id}`);
        break;
      case 'user':
        navigate(`/profile/${reference.id}`);
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      const response = await axios.put('/api/notifications/mark-all-read');
      
      if (response.data.success) {
        setUnreadCount(0);
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friendRequest':
        return <FriendRequestIcon color="primary" />;
      case 'message':
      case 'privateMessage':
        return <MessageIcon color="info" />;
      case 'like':
        return <LikeIcon color="error" />;
      case 'comment':
        return <CommentIcon color="success" />;
      case 'report':
        return <ReportIcon color="warning" />;
      case 'notice':
        return <NoticeIcon color="info" />;
      case 'system':
        return <SystemIcon color="action" />;
      default:
        return <icons.Notifications color="action" />;
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffTime = Math.abs(now - notificationDate);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={handleClick}>
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? <icons.NotificationBell /> : <icons.Notifications />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                startIcon={markingAllRead ? <CircularProgress size={16} /> : <MarkReadIcon />}
              >
                Mark all read
              </Button>
            )}
          </Box>
        </Box>

        <Divider />

        {/* Notifications List */}
        <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifications.map((notification) => (
              <MenuItem
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderLeft: notification.read ? 'none' : '3px solid',
                  borderLeftColor: 'primary.main',
                  backgroundColor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {notification.sender ? (
                    <Avatar
                      src={notification.sender.profileImageUrl}
                      sx={{ width: 32, height: 32 }}
                    >
                      {notification.sender.firstName?.[0]?.toUpperCase()}
                    </Avatar>
                  ) : (
                    getNotificationIcon(notification.type)
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: notification.read ? 'normal' : 'medium' }}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {notification.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(notification.createdAt)}
                      </Typography>
                    </Box>
                  }
                />
              </MenuItem>
            ))
          )}
        </Box>

        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 1 }}>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  navigate('/notifications');
                  handleClose();
                }}
              >
                View All Notifications
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
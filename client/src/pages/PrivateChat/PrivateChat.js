import icons from '../../components/Common/Icons'
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PersonAdd as PersonAddIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import useApi from '../../hooks/useApi';
import PrivateChatList from '../../components/PrivateChat/PrivateChatList';
import PrivateMessageThread from '../../components/PrivateChat/PrivateMessageThread';
import MessageComposer from '../../components/PrivateChat/MessageComposer';
import ErrorDisplay from '../../components/Common/ErrorDisplay';
import { ChatSkeleton } from '../../components/Common/LoadingSkeleton';
import ChatWelcomeMessage from '../../components/Welcome/ChatWelcomeMessage';
import EmptyState from '../../components/Common/EmptyState';

const PrivateChat = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { loading, error, clearError, get, post } = useApi();
  
  const [selectedChat, setSelectedChat] = useState(chatId || null);
  const [messages, setMessages] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId) => {
    try {
      const data = await get(`/api/private-chat/${chatId}/messages`);
      if (!data) {
        setMessages([]);
        return;
      }
      
      setMessages(data);
      
      // Mark messages as read via socket
      data.forEach(msg => {
        if (msg.senderId && msg.senderId._id !== user?._id && msg.status !== 'read') {
          socket?.emit('update_message_status', {
            messageId: msg._id,
            status: 'read'
          });
        }
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  }, [get, user, socket]);

  // Fetch chat details
  const fetchChatDetails = useCallback(async (chatId) => {
    try {
      const chats = await get('/api/private-chat');
      
      // Ensure chats is an array
      if (!chats) {
        console.error('No chats data received');
        return;
      }
      
      if (!Array.isArray(chats)) {
        console.error('Invalid response format for chats:', typeof chats, chats);
        return;
      }
      
      const currentChat = chats.find(chat => chat._id === chatId);
      
      if (currentChat) {
        setCurrentChat(currentChat);
        if (currentChat.otherParticipant) {
          setOtherUser(currentChat.otherParticipant);
        } else {
          console.error('Chat found but missing otherParticipant:', currentChat);
        }
      } else {
        console.error('Chat not found with ID:', chatId);
      }
    } catch (error) {
      console.error('Error fetching chat details:', error);
    }
  }, [get]);

  // Handle chat selection
  const handleSelectChat = useCallback((chatId) => {
    setSelectedChat(chatId);
    navigate(`/private-chat/${chatId}`);
  }, [navigate]);

  // Load selected chat
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      fetchChatDetails(selectedChat);
      
      // Join socket room for this chat
      socket?.emit('join_group', selectedChat);
    }
    
    setDataLoaded(true);
  }, [selectedChat, fetchMessages, fetchChatDetails, socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle new private messages
    const handleNewMessage = (data) => {
      if (data.chatId === selectedChat) {
        setMessages(prev => [...prev, data.message]);
        
        // Mark as read immediately if we're in this chat
        socket.emit('update_message_status', {
          messageId: data.message._id,
          status: 'read'
        });
      }
      
      // Update chat details to show latest message
      fetchChatDetails(selectedChat);
    };

    // Handle message status updates
    const handleMessageStatusUpdate = (data) => {
      if (data.chatId === selectedChat) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, status: data.status } 
              : msg
          )
        );
      }
    };

    // Handle typing indicators
    const handleUserTyping = (data) => {
      if (data.chatId === selectedChat) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.chatId === selectedChat) {
        setIsTyping(false);
      }
    };

    // Register event listeners
    socket.on('new_private_message', handleNewMessage);
    socket.on('message_status_updated', handleMessageStatusUpdate);
    socket.on('private_user_typing', handleUserTyping);
    socket.on('private_user_stopped_typing', handleUserStoppedTyping);

    // Cleanup
    return () => {
      socket.off('new_private_message', handleNewMessage);
      socket.off('message_status_updated', handleMessageStatusUpdate);
      socket.off('private_user_typing', handleUserTyping);
      socket.off('private_user_stopped_typing', handleUserStoppedTyping);
      
      if (selectedChat) {
        socket.emit('leave_group', selectedChat);
      }
    };
  }, [socket, selectedChat, fetchChatDetails]);

  // Send message handler
  const handleSendMessage = async (content) => {
    if (!selectedChat || !content.trim() || sendingMessage) return;
    
    setSendingMessage(true);
    
    // Optimistic UI update
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      senderId: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      },
      content,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      // Send via socket for real-time update
      if (socket) {
        socket.emit('send_private_message', {
          chatId: selectedChat,
          content
        });
      } else {
        // Fallback to REST API if socket not available
        const newMessage = await post(`/api/private-chat/${selectedChat}/messages`, {
          content
        });
        
        // Replace optimistic message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg._id === optimisticMessage._id ? newMessage : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => 
        prev.filter(msg => msg._id !== optimisticMessage._id)
      );
    } finally {
      setSendingMessage(false);
    }
  };

  // Typing indicator handlers
  const handleTypingStart = () => {
    socket?.emit('private_typing_start', selectedChat);
  };

  const handleTypingStop = () => {
    socket?.emit('private_typing_stop', selectedChat);
  };

  // Back button handler
  const handleBack = () => {
    navigate('/contacts');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Private Messages
        </Typography>
        <Tooltip title="Start New Private Chat">
          <IconButton 
            color="primary" 
            size="large"
            onClick={() => navigate('/contacts?tab=friends')}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={() => fetchChatDetails(selectedChat)}
          onDismiss={clearError}
          showDetails={true}
        />
      )}
      
      {loading && !dataLoaded ? (
        <ChatSkeleton />
      ) : (
        <Grid container spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
          {/* Chat List */}
          <Grid 
            item 
            xs={12} 
            md={4} 
            sx={{ 
              display: { xs: selectedChat ? 'none' : 'block', md: 'block' } 
            }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Conversations
                </Typography>
                
                {/* Welcome message for private chats */}
                <ChatWelcomeMessage 
                  hasGroupChats={true} // This would need to be passed from parent or fetched
                  hasPrivateChats={false} // This should be determined by checking if there are any chats
                />
                
                <PrivateChatList 
                  onSelectChat={handleSelectChat}
                  selectedChatId={selectedChat}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Chat Messages */}
          <Grid 
            item 
            xs={12} 
            md={8}
            sx={{ 
              display: { xs: selectedChat ? 'block' : 'none', md: 'block' } 
            }}
          >
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <IconButton 
                      sx={{ display: { xs: 'inline-flex', md: 'none' }, mr: 1 }}
                      onClick={handleBack}
                    >
                      <icons.ArrowBack />
                    </IconButton>
                    
                    <Badge 
                      color="success" 
                      variant="dot" 
                      invisible={otherUser?.status !== 'online'}
                      sx={{ mr: 2 }}
                    >
                      <Avatar 
                        src={otherUser?.profileImageUrl} 
                        alt={otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : ''}
                      />
                    </Badge>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">
                        {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Loading...'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isTyping ? 'Typing...' : otherUser?.status === 'online' ? 'Online' : 'Offline'}
                      </Typography>
                    </Box>
                    
                    <Tooltip title="Add to friends">
                      <IconButton color="primary">
                        <icons.PersonAdd />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {/* Messages */}
                  <PrivateMessageThread 
                    messages={messages}
                    loading={loading}
                    error={error}
                    otherUser={otherUser}
                  />
                  
                  <Divider />
                  
                  {/* Message Composer */}
                  <MessageComposer 
                    onSendMessage={handleSendMessage}
                    disabled={!selectedChat || sendingMessage}
                    onTypingStart={handleTypingStart}
                    onTypingStop={handleTypingStop}
                  />
                </>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  p: 3,
                  textAlign: 'center'
                }}>
                  <Alert severity="info" sx={{ width: '100%' }}>
                    Select a conversation to start messaging
                  </Alert>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default PrivateChat;
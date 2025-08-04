import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for handling search result navigation
 */
const useSearchNavigation = () => {
  const navigate = useNavigate();

  /**
   * Navigate to the appropriate page based on search result type and item
   */
  const navigateToResult = useCallback((item, type) => {
    if (!item || !type) return;

    switch (type) {
      case 'users':
        // Navigate to user profile
        navigate(`/profile/${item._id}`);
        break;
        
      case 'notices':
        // Navigate to notice detail
        navigate(`/notices/${item._id}`);
        break;
        
      case 'reports':
        // Navigate to report detail
        navigate(`/reports/${item._id}`);
        break;
        
      case 'chats':
        // Navigate to chat based on type
        if (item.chatType === 'group') {
          navigate(`/chat/${item._id}`);
        } else {
          // For private chats, navigate to private chat with the other user
          navigate(`/private-chat/${item.otherParticipantId || item._id}`);
        }
        break;
        
      case 'messages':
        // Navigate to the specific message in its chat
        if (item.chatType === 'group') {
          navigate(`/chat/${item.chatId}?messageId=${item._id}`);
        } else {
          navigate(`/private-chat/${item.chatId}?messageId=${item._id}`);
        }
        break;
        
      default:
        console.warn(`Unknown result type: ${type}`);
        break;
    }
  }, [navigate]);

  return { navigateToResult };
};

export default useSearchNavigation;
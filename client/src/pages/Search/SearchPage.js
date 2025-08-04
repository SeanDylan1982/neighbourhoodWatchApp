import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import icons from '../../components/Common/Icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchBar from '../../components/Search/SearchBar';
import useSearchNavigation from '../../hooks/useSearchNavigation';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Dedicated search page for mobile users
 */
const SearchPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { token } = useAuth();
  const { navigateToResult } = useSearchNavigation();
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Perform search when user submits query
  const handleSearch = async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get search type based on active tab
      const searchType = ['all', 'users', 'notices', 'reports', 'chats'][activeTab];
      
      const response = await axios.get('/api/search', {
        params: { 
          q: query,
          type: searchType,
          limit: 20
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to perform search. Please try again.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle result selection
  const handleResultSelect = (item, type) => {
    navigateToResult(item, type);
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton edge="start" onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <icons.ArrowBack />
        </IconButton>
        <Typography variant="h6">Search</Typography>
      </Box>
      
      <Paper elevation={1} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
        <SearchBar 
          placeholder="Search people, notices, reports, chats..." 
          onResultSelect={handleResultSelect}
          initialQuery={initialQuery}
          onSearch={handleSearch}
        />
      </Paper>
      
      <Paper elevation={1} sx={{ borderRadius: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All" />
          <Tab label="People" />
          <Tab label="Notices" />
          <Tab label="Reports" />
          <Tab label="Chats" />
        </Tabs>
        
        <Box sx={{ p: 2 }}>
          {loading && (
            <Typography variant="body2" color="text.secondary" align="center">
              Searching...
            </Typography>
          )}
          
          {error && (
            <Typography variant="body2" color="error" align="center">
              {error}
            </Typography>
          )}
          
          {!loading && !error && results && (
            <SearchResults 
              results={results} 
              onResultSelect={handleResultSelect} 
            />
          )}
          
          {!loading && !error && !results && (
            <Typography variant="body2" color="text.secondary" align="center">
              Enter a search term to find people, notices, reports, and chats
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

// SearchResults component for the search page
const SearchResults = ({ results, onResultSelect }) => {
  // Implementation similar to the SearchResults component but adapted for the search page
  // This is a simplified version for this example
  
  if (!results) return null;
  
  const hasResults = 
    (results.users && results.users.length > 0) ||
    (results.notices && results.notices.length > 0) ||
    (results.reports && results.reports.length > 0) ||
    (results.chats && results.chats.length > 0) ||
    (results.messages && results.messages.length > 0);
  
  if (!hasResults) {
    return (
      <Typography variant="body2" color="text.secondary" align="center">
        No results found
      </Typography>
    );
  }
  
  return (
    <Box>
      {/* This would be a more detailed implementation of search results */}
      {/* For brevity, we're just showing counts here */}
      {results.users && results.users.length > 0 && (
        <Typography variant="body1" gutterBottom>
          People: {results.users.length} results
        </Typography>
      )}
      
      {results.notices && results.notices.length > 0 && (
        <Typography variant="body1" gutterBottom>
          Notices: {results.notices.length} results
        </Typography>
      )}
      
      {results.reports && results.reports.length > 0 && (
        <Typography variant="body1" gutterBottom>
          Reports: {results.reports.length} results
        </Typography>
      )}
      
      {results.chats && results.chats.length > 0 && (
        <Typography variant="body1" gutterBottom>
          Chats: {results.chats.length} results
        </Typography>
      )}
      
      {results.messages && results.messages.length > 0 && (
        <Typography variant="body1" gutterBottom>
          Messages: {results.messages.length} results
        </Typography>
      )}
    </Box>
  );
};

export default SearchPage;
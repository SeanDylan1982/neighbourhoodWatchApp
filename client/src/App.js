import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './styles/layout.css';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import OfflineIndicator from './components/Common/OfflineIndicator';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Chat from './pages/Chat/Chat';
import PrivateChat from './pages/PrivateChat/PrivateChat';
import NoticeBoard from './pages/NoticeBoard/NoticeBoard';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import Contacts from './pages/Contacts/Contacts';
import SearchPage from './pages/Search/SearchPage';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';


const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <OfflineIndicator />
        <AuthProvider>
          <SocketProvider>
            <Router>
              <ErrorBoundary>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={
                      <ErrorBoundary>
                        <Dashboard />
                      </ErrorBoundary>
                    } />
                    <Route path="chat" element={
                      <ErrorBoundary>
                        <Chat />
                      </ErrorBoundary>
                    } />
                    <Route path="notices" element={
                      <ErrorBoundary>
                        <NoticeBoard />
                      </ErrorBoundary>
                    } />
                    <Route path="notices/:id" element={
                      <ErrorBoundary>
                        <NoticeBoard />
                      </ErrorBoundary>
                    } />
                    <Route path="reports" element={
                      <ErrorBoundary>
                        <Reports />
                      </ErrorBoundary>
                    } />
                    <Route path="reports/:id" element={
                      <ErrorBoundary>
                        <Reports />
                      </ErrorBoundary>
                    } />
                    <Route path="contacts" element={
                      <ErrorBoundary>
                        <Contacts />
                      </ErrorBoundary>
                    } />
                    <Route path="private-chat" element={
                      <ErrorBoundary>
                        <PrivateChat />
                      </ErrorBoundary>
                    } />
                    <Route path="private-chat/:chatId" element={
                      <ErrorBoundary>
                        <PrivateChat />
                      </ErrorBoundary>
                    } />
                    <Route path="profile" element={
                      <ErrorBoundary>
                        <Profile />
                      </ErrorBoundary>
                    } />
                    <Route path="settings" element={
                      <ErrorBoundary>
                        <Settings />
                      </ErrorBoundary>
                    } />
                    <Route path="search" element={
                      <ErrorBoundary>
                        <SearchPage />
                      </ErrorBoundary>
                    } />
                    <Route path="notifications" element={
                      <ErrorBoundary>
                        <Notifications />
                      </ErrorBoundary>
                    } />
                    <Route path="admin" element={
                      <ErrorBoundary>
                        <ProtectedAdminRoute>
                          <AdminDashboard />
                        </ProtectedAdminRoute>
                      </ErrorBoundary>
                    } />

                  </Route>
                </Routes>
              </ErrorBoundary>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
import icons from '../../components/Common/Icons'
import React, { useState, useEffect } from "react";
import { ImageUpload, MediaPreview } from '../../components/Upload';
import ReportsWelcomeMessage from '../../components/Welcome/ReportsWelcomeMessage';
import EmptyState from '../../components/Common/EmptyState';
import LoadingState from '../../components/Common/LoadingState';
import TermsModal from '../../components/Legal/TermsModal';
import useTermsAcceptance from '../../hooks/useTermsAcceptance';
import useDataFetching from '../../hooks/useDataFetching';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Badge,
} from "@mui/material";
import {
  Add as AddIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Traffic as TrafficIcon,
  Pets as PetsIcon,
  Build as MaintenanceIcon,
  Report as ReportIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Visibility as ViewIcon,
  Comment as CommentIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingReportSubmission, setPendingReportSubmission] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingReport, setReportingReport] = useState(null);
  const [reportReason, setReportReason] = useState('');

  // Terms acceptance hook
  const { 
    canSubmitReport, 
    acceptTerms, 
    loading: termsLoading,
    error: termsError 
  } = useTermsAcceptance();

  // Data fetching hook
  const { fetchData, loading, error, clearError } = useDataFetching({
    timeout: 12000, // Longer timeout for reports
    retryAttempts: 2,
    onError: (error) => {
      console.error('Reports fetch error:', error);
    }
  });
  const [newReport, setNewReport] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    priority: "medium",
    isAnonymous: false,
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  const categories = [
    {
      value: "security",
      label: "Security Concern",
      icon: SecurityIcon,
      color: "#f44336",
    },
    {
      value: "traffic",
      label: "Traffic Issue",
      icon: TrafficIcon,
      color: "#ff9800",
    },
    {
      value: "maintenance",
      label: "Maintenance",
      icon: MaintenanceIcon,
      color: "#2196f3",
    },
    {
      value: "pets",
      label: "Lost/Found Pets",
      icon: PetsIcon,
      color: "#4caf50",
    },
    {
      value: "noise",
      label: "Noise Complaint",
      icon: WarningIcon,
      color: "#9c27b0",
    },
    { value: "other", label: "Other", icon: ReportIcon, color: "#607d8b" },
  ];

  const priorities = [
    { value: "low", label: "Low", color: "#4caf50" },
    { value: "medium", label: "Medium", color: "#ff9800" },
    { value: "high", label: "High", color: "#f44336" },
    { value: "urgent", label: "Urgent", color: "#e91e63" },
  ];

  // Fetch real data from API with proper error handling and timeout
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await fetchData('/api/reports?limit=50');
        
        const formattedReports = data.map(report => ({
          id: report._id,
          title: report.title,
          description: report.description,
          category: report.category,
          location: report.location?.address || 'Location not specified',
          priority: report.priority,
          status: report.status,
          reportedBy: report.isAnonymous ? 'Anonymous' : 
            `${report.reporterId?.firstName || 'Unknown'} ${report.reporterId?.lastName || 'User'}`,
          reportedAt: report.createdAt,
          anonymous: report.isAnonymous,
          comments: report.comments?.length || 0,
          views: report.viewCount || 0,
          likes: report.likes?.length || 0,
          media: report.media || []
        }));
        
        setReports(formattedReports);
      } catch (error) {
        // Error is already handled by the hook
        console.error('Failed to fetch reports:', error.message);
        setReports([]);
      }
    };

    fetchReports();
  }, [fetchData]);

  // Handle opening report dialog with terms check
  const handleOpenReportDialog = () => {
    // Directly open the report dialog
    setOpenDialog(true);
  };

  const handleCreateReport = async () => {

    try {
      const formData = new FormData();
      formData.append('title', newReport.title);
      formData.append('description', newReport.description);
      formData.append('category', newReport.category);
      formData.append('location', newReport.location);
      formData.append('priority', newReport.priority);
      formData.append('isAnonymous', newReport.isAnonymous);
      
      // Add media files
      selectedFiles.forEach(file => {
        formData.append('media', file);
      });

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await fetch(`${baseURL}/api/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      if (response.ok) {
        const createdReport = await response.json();
        const formattedReport = {
          id: createdReport._id,
          title: createdReport.title,
          description: createdReport.description,
          category: createdReport.category,
          location: createdReport.location?.address || 'Location not specified',
          priority: createdReport.priority,
          status: createdReport.status,
          reportedBy: createdReport.isAnonymous ? 'Anonymous' : 'You',
          reportedAt: createdReport.createdAt,
          anonymous: createdReport.isAnonymous,
          comments: 0,
          views: 0,
          likes: 0,
          media: createdReport.media || []
        };
        
        setReports([formattedReport, ...reports]);
        setNewReport({
          title: "",
          description: "",
          category: "",
          location: "",
          priority: "medium",
          isAnonymous: false,
        });
        setSelectedFiles([]);
        setOpenDialog(false);
      } else {
        const errorText = await response.text();
        console.error('Failed to create report:', response.status, errorText);
        alert(`Failed to create report: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating report:', error);
      alert(`Error creating report: ${error.message}`);
    }
  };

  // Handle terms acceptance
  const handleAcceptTerms = async () => {
    try {
      await acceptTerms('reportTerms');
      setShowTermsModal(false);
      
      // If there was a pending submission, proceed with it
      if (pendingReportSubmission) {
        setPendingReportSubmission(false);
        setOpenDialog(true);
      } else {
        // Otherwise, just open the dialog
        setOpenDialog(true);
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      // Error is handled by the hook and displayed in the modal
    }
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
    setPendingReportSubmission(false);
    // Don't open the dialog if terms are declined
  };

  const handleCloseTermsModal = () => {
    setShowTermsModal(false);
    setPendingReportSubmission(false);
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find((c) => c.value === category);
    const IconComponent = cat?.icon || ReportIcon;
    return <IconComponent sx={{ color: cat?.color || "#607d8b" }} />;
  };

  const getPriorityColor = (priority) => {
    return priorities.find((p) => p.value === priority)?.color || "#607d8b";
  };

  const getStatusColor = (status) => {
    const colors = {
      open: "#f44336",
      "in-progress": "#ff9800",
      resolved: "#4caf50",
      closed: "#607d8b",
    };
    return colors[status] || "#607d8b";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleReportReport = (report) => {
    setReportingReport(report);
    setReportDialogOpen(true);
  };

  const handleSubmitReportReport = async () => {
    if (!reportReason.trim()) {
      alert('Please provide a reason for reporting this report.');
      return;
    }

    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await fetch(`${baseURL}/api/moderation/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentType: 'report',
          contentId: reportingReport.id,
          reason: reportReason
        }),
      });

      if (response.ok) {
        alert('Report reported successfully. Thank you for helping keep our community safe.');
        setReportDialogOpen(false);
        setReportReason('');
        setReportingReport(null);
      } else {
        const errorText = await response.text();
        console.error('Failed to report report:', response.status, errorText);
        alert(`Failed to report report: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error reporting report:', error);
      alert(`Error reporting report: ${error.message}`);
    }
  };

  const handleCloseReportReportDialog = () => {
    setReportDialogOpen(false);
    setReportReason('');
    setReportingReport(null);
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, pb: 10 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" fontWeight="bold">
            Community Reports
          </Typography>
          <Chip
            label="Loading..."
            color="primary"
            variant="outlined"
          />
        </Box>
        <LoadingState 
          variant="cards" 
          count={6} 
          message="Loading community reports..."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Community Reports
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            label={`${reports.length} Reports`}
            color="primary"
            variant="outlined"
          />
          <Button
            variant="contained"
            startIcon={<icons.Add />}
            onClick={handleOpenReportDialog}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            New Report
          </Button>
        </Box>
      </Box>

      {/* Category Filter */}
      <Box mb={3}>
        <Grid container spacing={1}>
          {categories.map((category) => (
            <Grid item key={category.value}>
              <Chip
                icon={<category.icon />}
                label={category.label}
                variant="outlined"
                sx={{
                  borderColor: category.color,
                  color: category.color,
                  "&:hover": {
                    backgroundColor: `${category.color}20`,
                  },
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Welcome message for new users */}
      <ReportsWelcomeMessage 
        onCreateReport={handleOpenReportDialog}
      />

      {/* Reports List */}
      <Grid container spacing={2}>
        {reports.length === 0 ? (
          <Grid item xs={12}>
            <EmptyState
              type="reports"
              onAction={handleOpenReportDialog}
            />
          </Grid>
        ) : (
          reports.map((report) => (
          <Grid item xs={12} key={report.id}>
            <Card
              sx={{
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: 3,
                },
              }}
              onClick={() => setSelectedReport(report)}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={2}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {getCategoryIcon(report.category)}
                    <Typography variant="h6" fontWeight="bold">
                      {report.title}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Chip
                      label={report.priority}
                      size="small"
                      sx={{
                        backgroundColor: getPriorityColor(report.priority),
                        color: "white",
                        fontWeight: "bold",
                      }}
                    />
                    <Chip
                      label={report.status}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(report.status),
                        color: "white",
                      }}
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" mb={2}>
                  {report.description}
                </Typography>

                {/* Media Preview */}
                {report.media && report.media.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <MediaPreview 
                      media={report.media} 
                      maxHeight={150}
                      columns={{ xs: 1, sm: 2 }}
                      showFullscreen={false}
                    />
                  </Box>
                )}

                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <icons.LocationOn fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {report.location}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <icons.AccessTime fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(report.reportedAt)}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>
                      {report.reportedBy.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      {report.reportedBy}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <icons.Visibility fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {report.views}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <icons.Comment fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {report.comments}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<icons.Warning />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReportReport(report);
                  }}
                  color="error"
                >
                  Report
                </Button>
              </CardActions>
            </Card>
          </Grid>
          ))
        )}
      </Grid>



      {/* Create Report Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            Create New Report
            <IconButton onClick={() => setOpenDialog(false)}>
              <icons.Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Report Title"
              value={newReport.title}
              onChange={(e) =>
                setNewReport({ ...newReport, title: e.target.value })
              }
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={newReport.description}
              onChange={(e) =>
                setNewReport({ ...newReport, description: e.target.value })
              }
              margin="normal"
              multiline
              rows={3}
              required
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Category</InputLabel>
              <Select
                value={newReport.category}
                onChange={(e) =>
                  setNewReport({ ...newReport, category: e.target.value })
                }
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <category.icon sx={{ color: category.color }} />
                      {category.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Location"
              value={newReport.location}
              onChange={(e) =>
                setNewReport({ ...newReport, location: e.target.value })
              }
              margin="normal"
              required
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select
                value={newReport.priority}
                onChange={(e) =>
                  setNewReport({ ...newReport, priority: e.target.value })
                }
                label="Priority"
              >
                {priorities.map((priority) => (
                  <MenuItem key={priority.value} value={priority.value}>
                    <Chip
                      label={priority.label}
                      size="small"
                      sx={{
                        backgroundColor: priority.color,
                        color: "white",
                      }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Media Upload */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Attach Media (Optional)
              </Typography>
              <ImageUpload
                onFilesChange={setSelectedFiles}
                maxFiles={3}
                acceptedTypes="image/*,video/*"
                multiple={true}
                showPreview={true}
              />
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              Your report will be visible to all community members and local
              moderators.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateReport}
            variant="contained"
            disabled={
              !newReport.title ||
              !newReport.description ||
              !newReport.category ||
              !newReport.location
            }
          >
            Submit Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedReport && (
          <>
            <DialogTitle>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box display="flex" alignItems="center" gap={1}>
                  {getCategoryIcon(selectedReport.category)}
                  {selectedReport.title}
                </Box>
                <IconButton onClick={() => setSelectedReport(null)}>
                  <icons.Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 1 }}>
                <Box display="flex" gap={1} mb={2}>
                  <Chip
                    label={selectedReport.priority}
                    size="small"
                    sx={{
                      backgroundColor: getPriorityColor(
                        selectedReport.priority
                      ),
                      color: "white",
                      fontWeight: "bold",
                    }}
                  />
                  <Chip
                    label={selectedReport.status}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(selectedReport.status),
                      color: "white",
                    }}
                  />
                </Box>

                <Typography variant="body1" paragraph>
                  {selectedReport.description}
                </Typography>

                {/* Media Display */}
                {selectedReport.media && selectedReport.media.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <MediaPreview 
                      media={selectedReport.media} 
                      maxHeight={300}
                      columns={{ xs: 1, sm: 2, md: 3 }}
                    />
                  </Box>
                )}

                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <icons.LocationOn fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {selectedReport.location}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <icons.AccessTime fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Reported {formatDate(selectedReport.reportedAt)}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {selectedReport.reportedBy.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {selectedReport.reportedBy}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Community Member
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Badge badgeContent={selectedReport.views} color="primary">
                      <icons.Visibility color="action" />
                    </Badge>
                    <Badge
                      badgeContent={selectedReport.comments}
                      color="primary"
                    >
                      <icons.Comment color="action" />
                    </Badge>
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedReport(null)}>Close</Button>
              <Button variant="contained">Add Comment</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Report Report Dialog */}
      <Dialog open={reportDialogOpen} onClose={handleCloseReportReportDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Report Report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You are reporting: <strong>{reportingReport?.title}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for reporting"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Please explain why you are reporting this report..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReportReportDialog}>Cancel</Button>
          <Button onClick={handleSubmitReportReport} variant="contained" color="error">
            Submit Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terms and Conditions Modal */}
      <TermsModal
        open={showTermsModal}
        onClose={handleCloseTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
        type="report"
        loading={termsLoading}
      />
    </Box>
  );
};

export default Reports;

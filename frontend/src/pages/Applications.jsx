import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { studentApi } from '../services/api';
import DeleteIcon from '@mui/icons-material/Delete';

const Applications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const [requestsRes, offersRes] = await Promise.all([
          studentApi.getLoanRequests(),
          studentApi.getOffers(),
        ]);
        setRequests(requestsRes.data.requests);
        setOffers(offersRes.data.offers);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusChip = (status) => {
    const statusColors = {
      DRAFT: 'default',
      OPEN: 'info',
      UNDER_NEGOTIATION: 'warning',
      ACCEPTED: 'success',
      REJECTED: 'error',
    };
    return (
      <Chip 
        label={status.replace('_', ' ')} 
        color={statusColors[status] || 'default'} 
        size="small" 
      />
    );
  };

  const filteredRequests = requests.filter(request => {
    switch (activeTab) {
      case 0: // Active
        return ['OPEN', 'UNDER_NEGOTIATION'].includes(request.status);
      case 1: // Drafts
        return request.status === 'DRAFT';
      case 2: // Completed
        return ['ACCEPTED', 'REJECTED'].includes(request.status);
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Applications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track and manage your loan requests
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/loan-requests/new')}
        >
          New Application
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Active Applications" />
              <Tab label="Drafts" />
              <Tab label="Completed" />
            </Tabs>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>School</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Offers</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => {
                  const requestOffers = offers.filter(o => o.requestId._id === request._id);
                  const pendingOffers = requestOffers.filter(o => o.status === 'PENDING');
                  
                  return (
                    <TableRow key={request._id}>
                      <TableCell>{request.schoolAddress}</TableCell>
                      <TableCell>{request.program}</TableCell>
                      <TableCell>${Number(request.totalAmountDrops) / 1000000}</TableCell>
                      <TableCell>{getStatusChip(request.status)}</TableCell>
                      <TableCell>
                        {pendingOffers.length > 0 ? (
                          <Chip
                            label={`${pendingOffers.length} pending`}
                            color="warning"
                            size="small"
                          />
                        ) : (
                          requestOffers.length > 0 ? (
                            <Chip
                              label={`${requestOffers.length} total`}
                              color="info"
                              size="small"
                            />
                          ) : 'No offers'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {request.status === 'DRAFT' ? (
                          <Button
                            size="small"
                            onClick={() => navigate(`/student/create-request/${request._id}`)}
                          >
                            Continue
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            onClick={() => navigate(`/loan-requests/${request._id}`)}
                          >
                            View Details
                          </Button>
                        )}
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this loan request? This action cannot be undone.')) {
                              try {
                                await studentApi.deleteLoanRequest(request._id);
                                setRequests(prev => prev.filter(r => r._id !== request._id));
                              } catch (err) {
                                alert('Failed to delete loan request.');
                              }
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No {activeTab === 0 ? 'active' : activeTab === 1 ? 'draft' : 'completed'} applications
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Applications; 
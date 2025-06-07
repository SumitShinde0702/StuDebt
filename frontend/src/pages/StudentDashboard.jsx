import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { studentApi } from '../services/api';
import DeleteIcon from '@mui/icons-material/Delete';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [agreementsRes, requestsRes, offersRes] = await Promise.all([
          studentApi.getAgreements(),
          studentApi.getLoanRequests(),
          studentApi.getOffers(),
        ]);
        setAgreements(agreementsRes.data.agreements);
        setRequests(requestsRes.data.requests);
        setOffers(offersRes.data.offers);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusChip = (status) => {
    const statusColors = {
      OPEN: 'info',
      UNDER_NEGOTIATION: 'warning',
      ACCEPTED: 'success',
      FUNDED: 'success',
      REPAYING: 'primary',
      REPAID: 'success',
      CLOSED: 'default',
    };
    return (
      <Chip 
        label={status.replace('_', ' ')} 
        color={statusColors[status] || 'default'} 
        size="small" 
      />
    );
  };

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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.name || 'Student'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your loan requests and track active sponsorships
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Active Agreements Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Active Agreements</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/student/create-request')}
                >
                  New Loan Request
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Company</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Next Payment</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agreements.map((agreement) => (
                      <TableRow key={agreement._id}>
                        <TableCell>{agreement.companyAddress?.name}</TableCell>
                        <TableCell>${Number(agreement.totalOwedDrops) / 1000000}</TableCell>
                        <TableCell>{getStatusChip(agreement.status)}</TableCell>
                        <TableCell>
                          {agreement.feeSchedule?.find(f => !f.isReleased)?.dueDate 
                            ? new Date(agreement.feeSchedule.find(f => !f.isReleased).dueDate).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => navigate(`/agreements/${agreement._id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {agreements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No active agreements
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Loan Requests Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                To edit an application, please create a new application. Editing existing applications is not supported for completeness and audit reasons.
              </Alert>
              <Typography variant="h6" gutterBottom>
                My Loan Requests
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>School</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Offers</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>{request.schoolAddress}</TableCell>
                        <TableCell>{request.program}</TableCell>
                        <TableCell>${Number(request.totalAmountDrops) / 1000000}</TableCell>
                        <TableCell>{getStatusChip(request.status)}</TableCell>
                        <TableCell>
                          {offers.filter(o => o.requestId._id === request._id).length} offers
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
                    ))}
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No loan requests
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Offers Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Offers
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Company</TableCell>
                      <TableCell>Request</TableCell>
                      <TableCell>Interest Rate</TableCell>
                      <TableCell>Work Years</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {offers
                      .filter(offer => offer.status === 'PENDING')
                      .map((offer) => (
                        <TableRow key={offer._id}>
                          <TableCell>{offer.companyAddress?.name}</TableCell>
                          <TableCell>{offer.requestId?.program}</TableCell>
                          <TableCell>{(offer.interestRate * 100).toFixed(2)}%</TableCell>
                          <TableCell>{offer.workObligationYears}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => navigate(`/offers/${offer._id}`)}
                            >
                              Review Offer
                            </Button>
                          </TableCell>
                        </TableRow>
                    ))}
                    {offers.filter(o => o.status === 'PENDING').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No pending offers
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StudentDashboard; 
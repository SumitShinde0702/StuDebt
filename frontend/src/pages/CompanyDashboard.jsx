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
import { companyApi } from '../services/api';

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [offers, setOffers] = useState([]);
  const [availableRequests, setAvailableRequests] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [agreementsRes, offersRes, requestsRes] = await Promise.all([
        companyApi.getAgreements(),
        companyApi.getOffers(),
        companyApi.getAvailableRequests(),
      ]);
      setAgreements(agreementsRes.data.agreements);
      setOffers(offersRes.data.offers);
      setAvailableRequests(requestsRes.data.requests);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      PENDING: 'warning',
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
          Welcome, {user?.name || 'Company'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your sponsorships and view available loan requests
        </Typography>
      </Box>

      <Button onClick={fetchDashboardData} variant="outlined" sx={{ mb: 2 }}>
        Refresh
      </Button>

      <Grid container spacing={4}>
        {/* Active Sponsorships Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Sponsorships
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>School</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Next Payment</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {agreements.map((agreement) => (
                      <TableRow key={agreement._id}>
                        <TableCell>{agreement.studentAddress?.name}</TableCell>
                        <TableCell>{agreement.schoolAddress}</TableCell>
                        <TableCell>{agreement.studentAddress?.program}</TableCell>
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
                        <TableCell colSpan={7} align="center">
                          No active sponsorships
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
                      <TableCell>Student</TableCell>
                      <TableCell>School</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Interest Rate</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {offers.map((offer) => (
                      <TableRow key={offer._id}>
                        <TableCell>{offer.requestId?.studentAddress?.name}</TableCell>
                        <TableCell>{offer.requestId?.schoolAddress}</TableCell>
                        <TableCell>{offer.requestId?.program}</TableCell>
                        <TableCell>${Number(offer.requestId?.totalAmountDrops) / 1000000}</TableCell>
                        <TableCell>{(offer.interestRate * 100).toFixed(2)}%</TableCell>
                        <TableCell>{getStatusChip(offer.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => navigate(`/offers/${offer._id}`)}
                            disabled={offer.status === 'EXPIRED'}
                          >
                            View Details
                          </Button>
                          {offer.status === 'PENDING' && (
                            <Button
                              size="small"
                              color="error"
                              onClick={async () => {
                                if (window.confirm('Delete this pending offer?')) {
                                  await companyApi.deleteOffer(offer._id);
                                  // Remove from UI
                                  const newOffers = offers.filter(o => o._id !== offer._id);
                                  setOffers(newOffers);
                                }
                              }}
                              sx={{ ml: 1 }}
                            >
                              Delete
                            </Button>
                          )}
                          {offer.status === 'REJECTED' && (
                            <>
                              <Chip label="Rejected" color="error" size="small" sx={{ mr: 1 }} />
                              <Button
                                size="small"
                                color="error"
                                onClick={async () => {
                                  if (window.confirm('Delete this offer?')) {
                                    await companyApi.deleteOffer(offer._id);
                                    // Remove from UI
                                    const newOffers = offers.filter(o => o._id !== offer._id);
                                    setOffers(newOffers);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                          {offer.status === 'EXPIRED' && (
                            <Chip label="Expired" color="default" size="small" sx={{ ml: 1 }} />
                          )}
                          {offer.status === 'ACCEPTED' && (
                            <Chip label="Accepted" color="success" size="small" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {offers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No offers
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Available Requests Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Loan Requests
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>School</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Industry</TableCell>
                      <TableCell>Graduation</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availableRequests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell>{request.studentAddress?.name}</TableCell>
                        <TableCell>{request.schoolAddress}</TableCell>
                        <TableCell>{request.program}</TableCell>
                        <TableCell>${Number(request.totalAmountDrops) / 1000000}</TableCell>
                        <TableCell>{request.industry}</TableCell>
                        <TableCell>
                          {new Date(request.graduationDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => navigate(`/loan-requests/${request._id}/make-offer`)}
                          >
                            Make Offer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {availableRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No available loan requests
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

export default CompanyDashboard; 
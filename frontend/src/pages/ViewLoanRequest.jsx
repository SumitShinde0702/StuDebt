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
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const ViewLoanRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanRequest, setLoanRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openOfferDialog, setOpenOfferDialog] = useState(false);
  const [offerForm, setOfferForm] = useState({
    interestRate: '',
    workObligationYears: '',
    tAndC: '',
  });
  const [offerErrors, setOfferErrors] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchLoanRequest = async () => {
      try {
        const res = await axios.get(`/api/loan-requests/${id}`);
        setLoanRequest(res.data);
        setFormData(res.data);
      } catch (err) {
        setError('Failed to load loan request');
      } finally {
        setLoading(false);
      }
    };

    fetchLoanRequest();
  }, [id]);

  const handleOfferChange = (e) => {
    const { name, value } = e.target;
    setOfferForm(prev => ({ ...prev, [name]: value }));
    if (offerErrors[name]) {
      setOfferErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateOffer = () => {
    const newErrors = {};
    if (!offerForm.interestRate) newErrors.interestRate = 'Interest rate is required';
    if (isNaN(offerForm.interestRate) || Number(offerForm.interestRate) <= 0) {
      newErrors.interestRate = 'Please enter a valid interest rate';
    }
    if (!offerForm.workObligationYears) newErrors.workObligationYears = 'Work obligation years is required';
    if (isNaN(offerForm.workObligationYears) || Number(offerForm.workObligationYears) <= 0) {
      newErrors.workObligationYears = 'Please enter a valid number of years';
    }
    if (!offerForm.tAndC) newErrors.tAndC = 'Terms and conditions are required';

    setOfferErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitOffer = async () => {
    if (validateOffer()) {
      try {
        const response = await fetch(`/api/loan-requests/${id}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyAddress: user.address, // From auth context
            interestRate: Number(offerForm.interestRate),
            workObligationYears: Number(offerForm.workObligationYears),
            tAndC_URI: offerForm.tAndC, // In production, this should be a URI to stored terms
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit offer');
        }

        // Refresh loan request data to show new offer
        const updatedResponse = await fetch(`/api/loan-requests/${id}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setLoanRequest(updatedData);
        }

        setOpenOfferDialog(false);
        setOfferForm({ interestRate: '', workObligationYears: '', tAndC: '' });
      } catch (err) {
        setError(err.message || 'Failed to submit offer');
      }
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    // TODO: Implement PUT/PATCH to /api/loan-requests/:id
    // await axios.put(`/api/loan-requests/${id}`, formData);
    setEditMode(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!loanRequest) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Loan request not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        variant="outlined"
        sx={{ mb: 2 }}
        onClick={() => {
          if (user?.role === 'student') navigate('/student/dashboard');
          else if (user?.role === 'company') navigate('/company/dashboard');
          else navigate('/');
        }}
      >
        Back
      </Button>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Loan Request Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage loan request information
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Student Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Student Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Student Name
                  </Typography>
                  <Typography variant="body1">{loanRequest.studentName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    School
                  </Typography>
                  <TextField
                    label="School"
                    name="schoolAddress"
                    value={formData.schoolAddress || ''}
                    onChange={handleChange}
                    disabled={!editMode}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Program
                  </Typography>
                  <Typography variant="body1">{loanRequest.program}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Graduation Date
                  </Typography>
                  <Typography variant="body1">{loanRequest.graduationDate}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Financial Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount Needed
                  </Typography>
                  <Typography variant="body1">
                    ${Number(loanRequest.totalAmountDrops) / 1000000}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Fee Schedule
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Amount</TableCell>
                          <TableCell>Due Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loanRequest.feeSchedule.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>${Number(item.amountDrops) / 1000000}</TableCell>
                            <TableCell>{item.dueDate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Additional Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Industry
                  </Typography>
                  <Typography variant="body1">{loanRequest.industry}</Typography>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">{loanRequest.description}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Offers Section - Only visible to companies */}
        {user?.role === 'company' && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Offers</Typography>
                  {loanRequest.status === 'OPEN' && (
                    <Button
                      variant="contained"
                      onClick={() => setOpenOfferDialog(true)}
                    >
                      Make Offer
                    </Button>
                  )}
                </Box>

                {loanRequest.offers.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Company</TableCell>
                          <TableCell>Interest Rate</TableCell>
                          <TableCell>Work Obligation</TableCell>
                          <TableCell>Submitted Date</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loanRequest.offers.map((offer) => (
                          <TableRow key={offer.id}>
                            <TableCell>{offer.company}</TableCell>
                            <TableCell>{offer.interestRate}%</TableCell>
                            <TableCell>{offer.workObligationYears} years</TableCell>
                            <TableCell>{offer.submittedDate}</TableCell>
                            <TableCell>{offer.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">No offers have been made yet</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Make Offer Dialog */}
      <Dialog
        open={openOfferDialog}
        onClose={() => setOpenOfferDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Make an Offer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Interest Rate (%)"
                  name="interestRate"
                  type="number"
                  value={offerForm.interestRate}
                  onChange={handleOfferChange}
                  error={!!offerErrors.interestRate}
                  helperText={offerErrors.interestRate}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Work Obligation (Years)"
                  name="workObligationYears"
                  type="number"
                  value={offerForm.workObligationYears}
                  onChange={handleOfferChange}
                  error={!!offerErrors.workObligationYears}
                  helperText={offerErrors.workObligationYears}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Terms and Conditions"
                  name="tAndC"
                  value={offerForm.tAndC}
                  onChange={handleOfferChange}
                  error={!!offerErrors.tAndC}
                  helperText={offerErrors.tAndC}
                  required
                  placeholder="Enter the terms and conditions of your offer..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOfferDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitOffer} variant="contained">
            Submit Offer
          </Button>
        </DialogActions>
      </Dialog>

      {editMode ? (
        <Button variant="contained" onClick={handleSave}>Save</Button>
      ) : (
        <Button variant="outlined" onClick={() => setEditMode(true)}>Edit</Button>
      )}
    </Container>
  );
};

export default ViewLoanRequest; 
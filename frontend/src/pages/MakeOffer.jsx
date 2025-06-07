import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { companyApi } from '../services/api';

const DEFAULT_TNC = 'Standard company terms apply.';

const MakeOffer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanRequest, setLoanRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    interestRate: '',
    workObligationYears: '',
    tAndC: DEFAULT_TNC,
  });
  const [formError, setFormError] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchLoanRequest = async () => {
      try {
        setLoading(true);
        const res = await companyApi.getAvailableRequests();
        const found = res.data.requests.find(r => r._id === id);
        if (!found) throw new Error('Loan request not found or not available.');
        setLoanRequest(found);
      } catch (err) {
        setError(err.message || 'Failed to load loan request.');
      } finally {
        setLoading(false);
      }
    };
    fetchLoanRequest();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setFormError(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.interestRate) errors.interestRate = 'Interest rate is required';
    if (isNaN(form.interestRate) || Number(form.interestRate) <= 0) {
      errors.interestRate = 'Enter a valid interest rate';
    }
    if (!form.workObligationYears) errors.workObligationYears = 'Work obligation is required';
    if (isNaN(form.workObligationYears) || Number(form.workObligationYears) <= 0) {
      errors.workObligationYears = 'Enter a valid number of years';
    }
    if (!form.tAndC) errors.tAndC = 'T&C is required';
    setFormError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await companyApi.createOffer(id, {
        companyAddress: user.id || user._id,
        interestRate: Number(form.interestRate) / 100,
        workObligationYears: Number(form.workObligationYears),
        tAndC_URI: form.tAndC,
      });
      setSuccess('Offer submitted successfully!');
      setTimeout(() => navigate('/company/dashboard'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit offer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Container maxWidth="md" sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!loanRequest) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Make Offer</Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6">Loan Request Details</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}><b>Student:</b> {loanRequest.studentAddress?.name}</Grid>
            <Grid item xs={12} md={6}><b>School:</b> {loanRequest.schoolAddress}</Grid>
            <Grid item xs={12} md={6}><b>Program:</b> {loanRequest.program}</Grid>
            <Grid item xs={12} md={6}><b>Amount:</b> ${Number(loanRequest.totalAmountDrops) / 1000000}</Grid>
            <Grid item xs={12} md={6}><b>Industry:</b> {loanRequest.industry}</Grid>
            <Grid item xs={12} md={6}><b>Graduation:</b> {loanRequest.graduationDate ? new Date(loanRequest.graduationDate).toLocaleDateString() : ''}</Grid>
            <Grid item xs={12}><b>Description:</b> {loanRequest.description}</Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Make an Offer</Typography>
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Interest Rate (%)"
                  name="interestRate"
                  type="number"
                  value={form.interestRate}
                  onChange={handleChange}
                  error={!!formError.interestRate}
                  helperText={formError.interestRate}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Work Obligation (Years)"
                  name="workObligationYears"
                  type="number"
                  value={form.workObligationYears}
                  onChange={handleChange}
                  error={!!formError.workObligationYears}
                  helperText={formError.workObligationYears}
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
                  value={form.tAndC}
                  onChange={handleChange}
                  error={!!formError.tAndC}
                  helperText={formError.tAndC}
                  required
                  placeholder="Enter the terms and conditions of your offer..."
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Make Offer'}
                </Button>
                <Button
                  sx={{ ml: 2 }}
                  variant="outlined"
                  onClick={() => navigate('/company/dashboard')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default MakeOffer; 
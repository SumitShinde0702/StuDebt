import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Box,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const OfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/offers/${id}`);
        setOffer(res.data.offer);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load offer.');
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [id]);

  const handleAction = async (action) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (action === 'accept') {
        await api.post(`/loan-requests/${offer.requestId._id}/accept-offer`, { offerId: offer._id });
        setActionSuccess('Offer accepted!');
      } else if (action === 'reject') {
        await api.post(`/offers/${offer._id}/reject`);
        setActionSuccess('Offer rejected.');
      }
      setTimeout(() => navigate('/student/dashboard'), 1200);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Container maxWidth="md" sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!offer) return null;

  const isStudent = user?.role === 'student';
  const isCompany = user?.role === 'company';
  const canAct = isStudent && offer.status === 'PENDING';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Offer Details</Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6">Offer Information</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}><b>Status:</b> <Chip label={offer.status} color={offer.status === 'PENDING' ? 'warning' : offer.status === 'ACCEPTED' ? 'success' : 'default'} size="small" /></Grid>
            <Grid item xs={12} md={6}><b>Interest Rate:</b> {(offer.interestRate * 100).toFixed(2)}%</Grid>
            <Grid item xs={12} md={6}><b>Work Obligation:</b> {offer.workObligationYears} years</Grid>
            <Grid item xs={12} md={6}><b>Submitted:</b> {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : ''}</Grid>
            <Grid item xs={12}><b>Terms & Conditions:</b> <br />{offer.tAndC_URI}</Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6">Loan Request</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}><b>School:</b> {offer.requestId?.schoolAddress}</Grid>
            <Grid item xs={12} md={6}><b>Program:</b> {offer.requestId?.program}</Grid>
            <Grid item xs={12} md={6}><b>Amount:</b> ${Number(offer.requestId?.totalAmountDrops) / 1000000}</Grid>
            <Grid item xs={12} md={6}><b>Industry:</b> {offer.requestId?.industry}</Grid>
            <Grid item xs={12} md={6}><b>Graduation:</b> {offer.requestId?.graduationDate ? new Date(offer.requestId.graduationDate).toLocaleDateString() : ''}</Grid>
            <Grid item xs={12}><b>Description:</b> {offer.requestId?.description}</Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6">Company</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}><b>Name:</b> {offer.companyAddress?.name || offer.companyAddress}</Grid>
            <Grid item xs={12} md={6}><b>Industry:</b> {offer.companyAddress?.industry || ''}</Grid>
            <Grid item xs={12} md={6}><b>Location:</b> {offer.companyAddress?.location || ''}</Grid>
          </Grid>
        </CardContent>
      </Card>
      {canAct && (
        <Box sx={{ mb: 2 }}>
          {actionSuccess && <Alert severity="success" sx={{ mb: 2 }}>{actionSuccess}</Alert>}
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
          <Button
            variant="contained"
            color="success"
            sx={{ mr: 2 }}
            onClick={() => handleAction('accept')}
            disabled={actionLoading}
          >
            Accept Offer
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => handleAction('reject')}
            disabled={actionLoading}
          >
            Reject Offer
          </Button>
        </Box>
      )}
      <Button variant="text" onClick={() => navigate(-1)}>Back</Button>
    </Container>
  );
};

export default OfferDetails; 
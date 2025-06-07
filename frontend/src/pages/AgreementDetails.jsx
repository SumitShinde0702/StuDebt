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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

const AgreementDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgreement = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/loan-agreements/${id}`);
        if (!res.ok) throw new Error('Failed to fetch agreement');
        const data = await res.json();
        setAgreement(data.agreement);
      } catch (err) {
        setError(err.message || 'Failed to load agreement.');
      } finally {
        setLoading(false);
      }
    };
    fetchAgreement();
  }, [id]);

  if (loading) {
    return <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Container>;
  }
  if (error) {
    return <Container maxWidth="md" sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!agreement) {
    return null;
  }

  const company = agreement.companyAddress;
  const student = agreement.studentAddress;
  const totalPaid = Number(agreement.amountPaidDrops || 0);
  const totalOwed = Number(agreement.totalOwedDrops);
  const progress = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button variant="outlined" sx={{ mb: 2 }} onClick={() => navigate(-1)}>
        Back
      </Button>
      <Typography variant="h4" gutterBottom>
        Agreement Details
      </Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Company</Typography>
              <Typography>Name: {company?.name || '-'}</Typography>
              <Typography>Industry: {company?.industry || '-'}</Typography>
              <Typography>Location: {company?.location || '-'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Student</Typography>
              <Typography>Name: {student?.name || '-'}</Typography>
              <Typography>School: {student?.school || agreement.schoolAddress || '-'}</Typography>
              <Typography>Program: {student?.program || '-'}</Typography>
              <Typography>Graduation Year: {student?.graduationYear || '-'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Loan Info</Typography>
              <Typography>Principal: ${Number(agreement.principalDrops) / 1000000}</Typography>
              <Typography>Total Owed: ${Number(agreement.totalOwedDrops) / 1000000}</Typography>
              <Typography>Interest Rate: {(agreement.interestRate * 100).toFixed(2)}%</Typography>
              <Typography>Status: <Chip label={agreement.status.replace('_', ' ')} color="primary" size="small" /></Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Payment Progress</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1 }}>
                  <Box
                    sx={{
                      width: `${progress}%`,
                      height: 8,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {progress.toFixed(1)}%
                </Typography>
              </Box>
              <Typography>Paid: ${totalPaid / 1000000}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Fee Schedule</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Installment</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Escrow Index</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {agreement.feeSchedule.map((fee, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>${Number(fee.amountDrops) / 1000000}</TableCell>
                    <TableCell>{new Date(fee.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {fee.isReleased ? <Chip label="Released" color="success" size="small" /> : <Chip label="Pending" color="warning" size="small" />}
                    </TableCell>
                    <TableCell>{fee.escrowIndex || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AgreementDetails; 
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
import { companyApi } from '../services/api';

const Sponsorships = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchSponsorships = async () => {
      try {
        setLoading(true);
        const response = await companyApi.getAgreements();
        setAgreements(response.data.agreements);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load sponsorships');
      } finally {
        setLoading(false);
      }
    };

    fetchSponsorships();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusChip = (status) => {
    const statusColors = {
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

  const filteredAgreements = agreements.filter(agreement => {
    switch (activeTab) {
      case 0: // Active
        return ['FUNDED', 'REPAYING'].includes(agreement.status);
      case 1: // Completed
        return ['REPAID', 'CLOSED'].includes(agreement.status);
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sponsorships
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and track all your student sponsorships
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Active Sponsorships" />
              <Tab label="Completed Sponsorships" />
            </Tabs>
          </Box>

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
                  <TableCell>Payment Progress</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAgreements.map((agreement) => {
                  const totalPaid = Number(agreement.amountPaidDrops || 0);
                  const totalOwed = Number(agreement.totalOwedDrops);
                  const progress = (totalPaid / totalOwed) * 100;
                  
                  return (
                    <TableRow key={agreement._id}>
                      <TableCell>{agreement.studentAddress?.name}</TableCell>
                      <TableCell>{agreement.schoolAddress}</TableCell>
                      <TableCell>{agreement.studentAddress?.program}</TableCell>
                      <TableCell>${totalOwed / 1000000}</TableCell>
                      <TableCell>{getStatusChip(agreement.status)}</TableCell>
                      <TableCell>
                        {agreement.feeSchedule?.find(f => !f.isReleased)?.dueDate 
                          ? new Date(agreement.feeSchedule.find(f => !f.isReleased).dueDate).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
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
                  );
                })}
                {filteredAgreements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No {activeTab === 0 ? 'active' : 'completed'} sponsorships
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

export default Sponsorships; 
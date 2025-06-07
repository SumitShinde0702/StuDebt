import { useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Mock data - will be replaced with API calls
const mockActiveLoans = [
  {
    id: '1',
    company: 'TechCorp Inc.',
    amount: '5000',
    status: 'FUNDED',
    nextPayment: '2024-06-01',
  },
  {
    id: '2',
    company: 'InnovateX',
    amount: '3000',
    status: 'UNDER_REVIEW',
    nextPayment: null,
  },
];

const mockDraftRequests = [
  {
    id: '3',
    school: 'University of Technology',
    program: 'Computer Science',
    amount: '4000',
    lastUpdated: '2024-03-15',
  },
];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeLoans] = useState(mockActiveLoans);
  const [draftRequests] = useState(mockDraftRequests);

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
        {/* Active Loans Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Active Loans</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/loan-requests/new')}
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
                    {activeLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>{loan.company}</TableCell>
                        <TableCell>${loan.amount}</TableCell>
                        <TableCell>{loan.status}</TableCell>
                        <TableCell>{loan.nextPayment || 'N/A'}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => navigate(`/loan-requests/${loan.id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {activeLoans.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No active loans
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Draft Requests Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Draft Requests
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>School</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Last Updated</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {draftRequests.map((draft) => (
                      <TableRow key={draft.id}>
                        <TableCell>{draft.school}</TableCell>
                        <TableCell>{draft.program}</TableCell>
                        <TableCell>${draft.amount}</TableCell>
                        <TableCell>{draft.lastUpdated}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => navigate(`/loan-requests/${draft.id}/edit`)}
                          >
                            Continue Editing
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {draftRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No draft requests
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
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
  Tabs,
  Tab,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Mock data - will be replaced with API calls
const mockActiveSponsorships = [
  {
    id: '1',
    student: 'John Doe',
    school: 'University of Technology',
    program: 'Computer Science',
    amount: '5000',
    status: 'FUNDED',
    nextPayment: '2024-06-01',
  },
  {
    id: '2',
    student: 'Jane Smith',
    school: 'Tech Institute',
    program: 'Data Science',
    amount: '3000',
    status: 'REPAYING',
    nextPayment: '2024-05-15',
  },
];

const mockPendingOffers = [
  {
    id: '3',
    student: 'Mike Johnson',
    school: 'Engineering University',
    program: 'Software Engineering',
    amount: '4000',
    status: 'PENDING',
    submittedDate: '2024-03-15',
  },
];

const mockAvailableRequests = [
  {
    id: '4',
    student: 'Sarah Wilson',
    school: 'Business School',
    program: 'Business Analytics',
    amount: '6000',
    industry: 'Technology',
    submittedDate: '2024-03-20',
  },
];

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [activeSponsorships] = useState(mockActiveSponsorships);
  const [pendingOffers] = useState(mockPendingOffers);
  const [availableRequests] = useState(mockAvailableRequests);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderActiveSponsorships = () => (
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
          {activeSponsorships.map((sponsorship) => (
            <TableRow key={sponsorship.id}>
              <TableCell>{sponsorship.student}</TableCell>
              <TableCell>{sponsorship.school}</TableCell>
              <TableCell>{sponsorship.program}</TableCell>
              <TableCell>${sponsorship.amount}</TableCell>
              <TableCell>{sponsorship.status}</TableCell>
              <TableCell>{sponsorship.nextPayment}</TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => navigate(`/sponsorships/${sponsorship.id}`)}
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {activeSponsorships.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No active sponsorships
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderPendingOffers = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>School</TableCell>
            <TableCell>Program</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Submitted Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingOffers.map((offer) => (
            <TableRow key={offer.id}>
              <TableCell>{offer.student}</TableCell>
              <TableCell>{offer.school}</TableCell>
              <TableCell>{offer.program}</TableCell>
              <TableCell>${offer.amount}</TableCell>
              <TableCell>{offer.status}</TableCell>
              <TableCell>{offer.submittedDate}</TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => navigate(`/offers/${offer.id}`)}
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {pendingOffers.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No pending offers
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderAvailableRequests = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>School</TableCell>
            <TableCell>Program</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Industry</TableCell>
            <TableCell>Submitted Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {availableRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.student}</TableCell>
              <TableCell>{request.school}</TableCell>
              <TableCell>{request.program}</TableCell>
              <TableCell>${request.amount}</TableCell>
              <TableCell>{request.industry}</TableCell>
              <TableCell>{request.submittedDate}</TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => navigate(`/loan-requests/${request.id}`)}
                >
                  Make Offer
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {availableRequests.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No available requests
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.name || 'Company'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your sponsorships and explore new opportunities
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Active Sponsorships" />
              <Tab label="Pending Offers" />
              <Tab label="Available Requests" />
            </Tabs>
          </Box>

          {activeTab === 0 && renderActiveSponsorships()}
          {activeTab === 1 && renderPendingOffers()}
          {activeTab === 2 && renderAvailableRequests()}
        </CardContent>
      </Card>
    </Container>
  );
};

export default CompanyDashboard; 
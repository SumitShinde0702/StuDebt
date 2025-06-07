import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  School as SchoolIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';

const features = [
  {
    icon: <SchoolIcon fontSize="large" />,
    title: 'Student-Friendly',
    description: 'Easy access to education funding with transparent terms and flexible repayment options.',
  },
  {
    icon: <BusinessIcon fontSize="large" />,
    title: 'Company Benefits',
    description: 'Connect with talented students and build your future workforce through sponsorship.',
  },
  {
    icon: <SecurityIcon fontSize="large" />,
    title: 'Secure & Transparent',
    description: 'Built on XRPL blockchain for secure transactions and transparent fund management.',
  },
  {
    icon: <PaymentIcon fontSize="large" />,
    title: 'Automated Payments',
    description: 'Smart escrow system ensures timely payments to educational institutions.',
  },
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Computer Science Student',
    text: 'StuDebt made it possible for me to pursue my dream education without the burden of traditional student loans.',
  },
  {
    name: 'TechCorp Inc.',
    role: 'Technology Company',
    text: 'We\'ve found exceptional talent and built strong relationships with future leaders through the platform.',
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box style={{ background: '#2196f3', color: 'white', padding: '64px 0', width: '100%', textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Revolutionizing Student Funding
        </Typography>
        <Typography variant="h5" paragraph>
          Connect students with companies through transparent, blockchain-powered education funding.
        </Typography>
        <Box style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => navigate('/register')}
          >
            Get Started
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            onClick={() => navigate('/demo')}
          >
            Try Demo
          </Button>
        </Box>
      </Box>

      {/* Features Section */}
      <Box style={{ width: '100%', background: '#f5f5f5', padding: '48px 0', textAlign: 'center' }}>
        <Typography variant="h3" component="h2" gutterBottom>
          How It Works
        </Typography>
        <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', marginTop: 32 }}>
          {features.map((feature, index) => (
            <Box key={index} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, flex: '1 1 220px', maxWidth: 260, minWidth: 220, textAlign: 'center' }}>
              <Box style={{ color: '#2196f3', marginBottom: 12 }}>{feature.icon}</Box>
              <Typography variant="h6" gutterBottom>{feature.title}</Typography>
              <Typography variant="body2" color="textSecondary">{feature.description}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Testimonials Section */}
      <Box style={{ width: '100%', background: '#e3eaf6', padding: '48px 0', textAlign: 'center' }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Success Stories
        </Typography>
        <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', marginTop: 32 }}>
          {testimonials.map((testimonial, index) => (
            <Box key={index} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 24, flex: '1 1 320px', maxWidth: 400, minWidth: 280, textAlign: 'center' }}>
              <Typography variant="body1" paragraph>"{testimonial.text}"</Typography>
              <Typography variant="subtitle1" fontWeight="bold">{testimonial.name}</Typography>
              <Typography variant="body2" color="textSecondary">{testimonial.role}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* CTA Section */}
      <Box style={{ width: '100%', padding: '48px 0', textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Ready to Get Started?
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Join our platform today and be part of the future of education funding.
        </Typography>
        <Box style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => navigate('/register?role=student')}
          >
            Register as Student
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => navigate('/register?role=company')}
          >
            Register as Company
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Landing; 
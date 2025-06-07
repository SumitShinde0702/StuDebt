import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from './styles/theme';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import Profile from './pages/Profile';
import CreateLoanRequest from './pages/CreateLoanRequest';
import ViewLoanRequest from './pages/ViewLoanRequest';
import Applications from './pages/Applications';
import Sponsorships from './pages/Sponsorships';
import NotFound from './pages/NotFound';
import MakeOffer from './pages/MakeOffer';

// Create a client for React Query
const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected student routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/create-request/:id"
                element={
                  <ProtectedRoute roles={['student']}>
                    <CreateLoanRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/create-request"
                element={
                  <ProtectedRoute roles={['student']}>
                    <CreateLoanRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications"
                element={
                  <ProtectedRoute roles={['student']}>
                    <Applications />
                  </ProtectedRoute>
                }
              />

              {/* Protected company routes */}
              <Route
                path="/company/dashboard"
                element={
                  <ProtectedRoute roles={['company']}>
                    <CompanyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sponsorships"
                element={
                  <ProtectedRoute roles={['company']}>
                    <Sponsorships />
                  </ProtectedRoute>
                }
              />

              {/* Common protected routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loan-requests/:id"
                element={
                  <ProtectedRoute>
                    <ViewLoanRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loan-requests/:id/make-offer"
                element={
                  <ProtectedRoute roles={['company']}>
                    <MakeOffer />
                  </ProtectedRoute>
                }
              />

              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

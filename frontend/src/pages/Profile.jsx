import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

// Mock data - will be replaced with API calls
const mockDocuments = [
  {
    id: '1',
    name: 'Academic Records.pdf',
    type: 'Academic',
    uploadDate: '2024-03-15',
    status: 'Verified',
  },
  {
    id: '2',
    name: 'ID Card.jpg',
    type: 'Identification',
    uploadDate: '2024-03-10',
    status: 'Pending',
  },
];

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [documents] = useState(mockDocuments);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    // Additional fields based on role
    ...(user?.role === 'student' ? {
      school: '',
      program: '',
      graduationDate: '',
    } : {
      companyName: '',
      industry: '',
      location: '',
    }),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement profile update
    setIsEditing(false);
  };

  const handleFileUpload = (e) => {
    // TODO: Implement file upload
    console.log('File upload:', e.target.files[0]);
  };

  const handleDeleteDocument = (docId) => {
    // TODO: Implement document deletion
    console.log('Delete document:', docId);
  };

  const renderStudentFields = () => (
    <>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="School"
          name="school"
          value={formData.school}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Program"
          name="program"
          value={formData.program}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Graduation Date"
          name="graduationDate"
          type="date"
          value={formData.graduationDate}
          onChange={handleChange}
          disabled={!isEditing}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
    </>
  );

  const renderCompanyFields = () => (
    <>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Company Name"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Industry"
          name="industry"
          value={formData.industry}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </Grid>
    </>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account information and documents
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Profile Information</Typography>
                <IconButton onClick={() => setIsEditing(!isEditing)}>
                  <EditIcon />
                </IconButton>
              </Box>

              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </Grid>

                  {user?.role === 'student' ? renderStudentFields() : renderCompanyFields()}

                  {isEditing && (
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                      >
                        Save Changes
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Documents Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Documents</Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadIcon />}
                >
                  Upload
                  <input
                    type="file"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </Box>

              <List>
                {documents.map((doc, index) => (
                  <Box key={doc.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <DocumentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.name}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              Type: {doc.type}
                            </Typography>
                            <br />
                            <Typography variant="body2" component="span">
                              Uploaded: {doc.uploadDate}
                            </Typography>
                            <br />
                            <Typography
                              variant="body2"
                              component="span"
                              color={doc.status === 'Verified' ? 'success.main' : 'warning.main'}
                            >
                              Status: {doc.status}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </Box>
                ))}
                {documents.length === 0 && (
                  <Alert severity="info">
                    No documents uploaded yet
                  </Alert>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile; 
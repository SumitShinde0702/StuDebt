import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  TextField,
  Grid,
  MenuItem,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { studentApi } from '../services/api';

const steps = [
  'Basic Information',
  'Financial Details',
  'Additional Information',
  'Review & Submit',
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Engineering',
  'Business',
  'Arts',
  'Other',
];

const CreateLoanRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    school: '',
    program: '',
    currentYear: '',
    // Step 2: Financial Details
    totalAmount: '',
    feeSchedule: [{ amount: '', dueDate: '' }],
    // Step 3: Additional Information
    graduationDate: '',
    industry: '',
    description: '',
    skills: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      // Fetch the draft loan request and pre-fill the form
      (async () => {
        try {
          const res = await studentApi.getLoanRequestById(id);
          const draft = res.data;
          setFormData({
            school: draft.schoolAddress || '',
            program: draft.program || '',
            currentYear: '', // Not stored, so leave blank or parse from description if needed
            totalAmount: draft.totalAmountDrops ? Number(draft.totalAmountDrops) / 1000000 : '',
            feeSchedule: draft.feeSchedule?.map(item => ({
              amount: item.amountDrops ? Number(item.amountDrops) / 1000000 : '',
              dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
            })) || [{ amount: '', dueDate: '' }],
            graduationDate: draft.graduationDate ? draft.graduationDate.slice(0, 10) : '',
            industry: draft.industry || '',
            description: draft.description || '',
            skills: '', // Not stored, so leave blank or parse from description if needed
          });
        } catch (err) {
          // Could not load draft, ignore
        }
      })();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFeeScheduleChange = (index, field, value) => {
    const newSchedule = [...formData.feeSchedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setFormData(prev => ({ ...prev, feeSchedule: newSchedule }));
  };

  const addFeeScheduleItem = () => {
    setFormData(prev => ({
      ...prev,
      feeSchedule: [...prev.feeSchedule, { amount: '', dueDate: '' }],
    }));
  };

  const removeFeeScheduleItem = (index) => {
    setFormData(prev => ({
      ...prev,
      feeSchedule: prev.feeSchedule.filter((_, i) => i !== index),
    }));
  };

  const validateStep = () => {
    const newErrors = {};
    
    switch (activeStep) {
      case 0: // Basic Information
        if (!formData.school) newErrors.school = 'School is required';
        if (!formData.program) newErrors.program = 'Program is required';
        if (!formData.currentYear) newErrors.currentYear = 'Current year is required';
        break;
      case 1: // Financial Details
        if (!formData.totalAmount) newErrors.totalAmount = 'Total amount is required';
        if (isNaN(formData.totalAmount) || Number(formData.totalAmount) <= 0) {
          newErrors.totalAmount = 'Please enter a valid amount';
        }
        formData.feeSchedule.forEach((item, index) => {
          if (!item.amount) newErrors[`feeAmount${index}`] = 'Amount is required';
          if (!item.dueDate) newErrors[`feeDate${index}`] = 'Due date is required';
        });
        break;
      case 2: // Additional Information
        if (!formData.graduationDate) newErrors.graduationDate = 'Graduation date is required';
        if (!formData.industry) newErrors.industry = 'Industry is required';
        if (!formData.description) newErrors.description = 'Description is required';
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (activeStep === steps.length - 1) {
        handleSubmit();
      } else {
        setActiveStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        studentAddress: user.id || user._id,
        studentName: user.name,
        schoolAddress: formData.school,
        program: formData.program,
        totalAmountDrops: String(Number(formData.totalAmount) * 1000000),
        feeSchedule: formData.feeSchedule.map(item => ({
          amountDrops: String(Number(item.amount) * 1000000),
          dueDate: item.dueDate,
        })),
        graduationDate: formData.graduationDate,
        industry: formData.industry,
        description: `${formData.description}\n\nCurrent Year: ${formData.currentYear}\nSkills: ${formData.skills}`,
      };
      if (id) {
        // If editing a draft, update it
        await studentApi.updateLoanRequest(id, payload);
      } else {
        await studentApi.createLoanRequest(payload);
      }
      navigate('/student/dashboard');
    } catch (error) {
      console.error('Error creating loan request:', error);
      setErrors(prev => ({ ...prev, submit: 'Failed to create loan request' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      // Only include valid feeSchedule items for drafts
      const validFeeSchedule = formData.feeSchedule.filter(
        item => item.amount && item.dueDate
      ).map(item => ({
        amountDrops: String(Number(item.amount) * 1000000),
        dueDate: item.dueDate,
      }));

      const payload = {
        studentAddress: user.id || user._id,
        studentName: user.name,
        schoolAddress: formData.school,
        program: formData.program,
        totalAmountDrops: String(Number(formData.totalAmount) * 1000000),
        feeSchedule: validFeeSchedule, // Only valid items or []
        graduationDate: formData.graduationDate,
        industry: formData.industry,
        description: `${formData.description}\n\nCurrent Year: ${formData.currentYear}\nSkills: ${formData.skills}`,
        status: 'DRAFT',
      };

      if (id) {
        await studentApi.updateLoanRequest(id, payload);
      } else {
        await studentApi.createLoanRequest(payload);
      }
      navigate('/student/dashboard');
    } catch (error) {
      alert('Failed to save draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="School"
                name="school"
                value={formData.school}
                onChange={handleChange}
                error={!!errors.school}
                helperText={errors.school}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Program"
                name="program"
                value={formData.program}
                onChange={handleChange}
                error={!!errors.program}
                helperText={errors.program}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Year"
                name="currentYear"
                value={formData.currentYear}
                onChange={handleChange}
                error={!!errors.currentYear}
                helperText={errors.currentYear}
                required
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Total Amount Needed"
                name="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={handleChange}
                error={!!errors.totalAmount}
                helperText={errors.totalAmount}
                required
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Fee Schedule</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addFeeScheduleItem}
                >
                  Add Installment
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Amount</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell width="100px">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.feeSchedule.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleFeeScheduleChange(index, 'amount', e.target.value)}
                            error={!!errors[`feeAmount${index}`]}
                            helperText={errors[`feeAmount${index}`]}
                            InputProps={{
                              startAdornment: '$',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            type="date"
                            value={item.dueDate}
                            onChange={(e) => handleFeeScheduleChange(index, 'dueDate', e.target.value)}
                            error={!!errors[`feeDate${index}`]}
                            helperText={errors[`feeDate${index}`]}
                            InputLabelProps={{ shrink: true }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => removeFeeScheduleItem(index)}
                            disabled={formData.feeSchedule.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Graduation Date"
                name="graduationDate"
                type="date"
                value={formData.graduationDate}
                onChange={handleChange}
                error={!!errors.graduationDate}
                helperText={errors.graduationDate}
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                error={!!errors.industry}
                helperText={errors.industry}
                required
              >
                {industries.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                error={!!errors.description}
                helperText={errors.description}
                required
                placeholder="Describe your educational goals and how this loan will help you achieve them..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Skills"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="List your relevant skills (comma-separated)..."
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review Your Loan Request
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                Please review all information before submitting. You can go back to make changes.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Basic Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        School
                      </Typography>
                      <Typography variant="body1">{formData.school}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Program
                      </Typography>
                      <Typography variant="body1">{formData.program}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Current Year
                      </Typography>
                      <Typography variant="body1">{formData.currentYear}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Financial Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="body1">${formData.totalAmount}</Typography>
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
                            {formData.feeSchedule.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>${item.amount}</TableCell>
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

            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Additional Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Graduation Date
                      </Typography>
                      <Typography variant="body1">{formData.graduationDate}</Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Industry
                      </Typography>
                      <Typography variant="body1">{formData.industry}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body1">{formData.description}</Typography>
                    </Grid>
                    {formData.skills && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Skills
                        </Typography>
                        <Typography variant="body1">{formData.skills}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        variant="outlined"
        sx={{ mb: 2 }}
        onClick={() => navigate('/student/dashboard')}
      >
        Back
      </Button>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create Loan Request
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete the form below to create your loan request
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {errors.submit && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.submit}
            </Alert>
          )}

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            <Box>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveDraft}
                sx={{ mr: 1 }}
              >
                Save as Draft
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateLoanRequest; 
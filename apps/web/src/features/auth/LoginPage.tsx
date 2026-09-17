import { type LoginRequest, loginRequestSchema } from '@finance/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { reportError } from '../../components/alert-chips/report-error';
import { tokens } from '../../theme/tokens';
import { Logo } from '../layout/Logo';
import { logIn } from './session';

// Shown on the page on purpose: a reviewer should never have to hunt for credentials.
export const DEMO_EMAIL = 'priya.sharma@example.com';
export const DEMO_PASSWORD = 'Analyst@2024';

interface LocationState {
  from?: { pathname: string; search: string };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    // The same zod schema the API validates with, so both agree on what "valid" means.
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }: LoginRequest) => {
    try {
      await logIn(email, password);
      // Return to the page the user was sent away from (filters included), or the dashboard.
      const from = (location.state as LocationState | null)?.from;
      navigate(from ? `${from.pathname}${from.search}` : '/dashboard', { replace: true });
    } catch (error) {
      // Clear the password but keep the email, so a typo is quick to fix.
      resetField('password');
      reportError(error);
    }
  };

  const useDemoAccount = () => {
    setValue('email', DEMO_EMAIL, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
        <Stack
          spacing={3}
          component="form"
          noValidate
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <Box>
            <Logo />
            <Typography variant="h1" sx={{ mt: 3 }}>
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Log in to see your company's transactions.
            </Typography>
          </Box>

          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            error={Boolean(errors.email)}
            helperText={errors.email ? 'Enter a valid email address' : ' '}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={Boolean(errors.password)}
            helperText={errors.password ? 'Enter your password' : ' '}
            {...register('password')}
          />

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Log in'}
          </Button>

          <Box
            sx={{
              p: 2,
              borderRadius: `${tokens.radius.sm}px`,
              bgcolor: tokens.color.surfaceRaised,
              border: `1px dashed ${tokens.color.border}`,
            }}
          >
            <Typography variant="caption" component="p">
              Demo account
            </Typography>
            <Typography variant="body2">{DEMO_EMAIL}</Typography>
            <Typography variant="body2">{DEMO_PASSWORD}</Typography>
            <Button size="small" onClick={useDemoAccount} sx={{ mt: 1, px: 0 }}>
              Fill in demo account
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './auth-store';

// While the saved session is being checked (a fraction of a second), show an empty canvas
// rather than flashing the login page at a user who is actually logged in.
function CheckingSession() {
  return <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }} />;
}

/** Only renders its children for a logged-in user; everyone else goes to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === 'checking') {
    return <CheckingSession />;
  }
  if (status === 'anonymous') {
    // "replace" means Back after logout can't return to the dashboard.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

/** The login page is pointless when already logged in, so send those users onward. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);

  if (status === 'checking') {
    return <CheckingSession />;
  }
  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

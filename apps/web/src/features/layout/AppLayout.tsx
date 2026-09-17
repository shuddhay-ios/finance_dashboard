import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { Avatar, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { reportError } from '../../components/alert-chips/report-error';
import { tokens } from '../../theme/tokens';
import { useAuthStore } from '../auth/auth-store';
import { logOut } from '../auth/session';
import { Logo } from './Logo';

const HIDE_ON_MOBILE = { xs: 'none', md: 'flex' };
const SHOW_ON_MOBILE = { xs: 'flex', md: 'none' };

export function AppLayout() {
  const user = useAuthStore((state) => state.user);

  // After logout the route guard sees "anonymous" and sends the user to /login.
  const handleLogout = () => {
    logOut().catch(reportError);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="nav"
        aria-label="Main"
        sx={{
          display: HIDE_ON_MOBILE,
          flexDirection: 'column',
          width: tokens.layout.sidebarWidth,
          flexShrink: 0,
          bgcolor: 'background.paper',
          px: 3,
          py: 3,
        }}
      >
        <Logo />
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            mt: 5,
            py: 1,
            color: tokens.color.brand,
            // The yellow bar marks the current page, as in the design.
            borderRight: `3px solid ${tokens.color.warning}`,
          }}
          aria-current="page"
        >
          <DashboardOutlinedIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Dashboard
          </Typography>
        </Stack>

        <Box sx={{ mt: 'auto' }}>
          <Button
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ color: 'text.secondary', px: 0 }}
          >
            Log out
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          component="header"
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ bgcolor: 'background.paper', px: { xs: 2, md: 3 }, py: 2 }}
        >
          <Box sx={{ display: SHOW_ON_MOBILE }}>
            <Logo />
          </Box>
          <Typography variant="h1" sx={{ display: HIDE_ON_MOBILE }}>
            Dashboard
          </Typography>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ textAlign: 'right', display: HIDE_ON_MOBILE, flexDirection: 'column' }}>
              <Typography variant="body2">{user?.name}</Typography>
              <Typography variant="caption">{user?.email}</Typography>
            </Box>
            <Avatar src={user?.avatarUrl} alt={user?.name} sx={{ width: 36, height: 36 }} />
            <Tooltip title="Log out">
              <IconButton
                onClick={handleLogout}
                sx={{ display: SHOW_ON_MOBILE }}
                aria-label="Log out"
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box component="main" sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

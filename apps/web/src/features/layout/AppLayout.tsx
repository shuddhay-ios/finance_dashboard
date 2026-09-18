import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import {
  Avatar,
  Box,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { type ReactNode, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { reportError } from '../../components/alert-chips/report-error';
import { ThemeModeToggle } from '../../theme/ThemeModeToggle';
import { tokens } from '../../theme/tokens';
import { useAuthStore } from '../auth/auth-store';
import { logOut } from '../auth/session';
import { Logo } from './Logo';

interface NavItem {
  label: string;
  icon: ReactNode;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <DashboardOutlinedIcon />, to: '/dashboard' },
  { label: 'Transactions', icon: <ReceiptLongOutlinedIcon />, to: '/transactions' },
  { label: 'Analytics', icon: <InsightsOutlinedIcon />, to: '/analytics' },
  { label: 'Personal', icon: <PersonOutlineIcon />, to: '/profile' },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/profile': 'Personal',
};

const HIDE_ON_MOBILE = { xs: 'none', md: 'flex' };
const SHOW_ON_MOBILE = { xs: 'flex', md: 'none' };

export function AppLayout() {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // After logout the route guard sees "anonymous" and sends the user to /login.
  const handleLogout = () => {
    logOut().catch(reportError);
  };

  const sidebar = (
    <SidebarContent onNavigate={() => setIsDrawerOpen(false)} onLogout={handleLogout} />
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: HIDE_ON_MOBILE,
          flexDirection: 'column',
          width: tokens.layout.sidebarWidth,
          flexShrink: 0,
          bgcolor: 'background.paper',
        }}
      >
        {sidebar}
      </Box>

      {/* On small screens the same sidebar slides in from the left. */}
      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sx={{ display: SHOW_ON_MOBILE }}
        PaperProps={{ sx: { width: tokens.layout.sidebarWidth } }}
      >
        {sidebar}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          component="header"
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            bgcolor: 'background.paper',
            px: 2,
            py: 1.5,
            // Header and page share the same maximum width and both start right after the
            // sidebar, so nothing stretches edge to edge and nothing drifts to the right.
            width: '100%',
            maxWidth: tokens.layout.contentMaxWidth,
          }}
        >
          <IconButton
            aria-label="Open menu"
            onClick={() => setIsDrawerOpen(true)}
            sx={{ display: SHOW_ON_MOBILE }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h1" sx={{ flex: 1 }} noWrap>
            {PAGE_TITLES[location.pathname] ?? 'Dashboard'}
          </Typography>
          <ThemeModeToggle />
          <ProfileMenu onLogout={handleLogout} />
        </Stack>

        <Box component="main" sx={{ p: { xs: 2, md: 3 }, maxWidth: tokens.layout.contentMaxWidth }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

function SidebarContent({
  onNavigate,
  onLogout,
}: {
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <Box sx={{ px: 2, py: 3 }}>
      <Box sx={{ px: 1 }}>
        <Logo />
      </Box>
      <List component="nav" aria-label="Main" sx={{ mt: 4 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.label}
            component={NavLink}
            to={item.to}
            onClick={onNavigate}
            sx={{
              ...navItemSx,
              // NavLink adds the "active" class to the current page's link.
              '&.active': {
                color: tokens.color.brand,
                borderRight: `3px solid ${tokens.color.warning}`,
              },
              '&.active .MuiListItemIcon-root': { color: tokens.color.brand },
            }}
          >
            <ListItemIcon sx={navIconSx}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 1.5 }} />
      <ListItemButton onClick={onLogout} sx={navItemSx}>
        <ListItemIcon sx={navIconSx}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Log out" primaryTypographyProps={{ variant: 'body2' }} />
      </ListItemButton>
    </Box>
  );
}

const navItemSx = {
  borderRadius: `${tokens.radius.sm}px`,
  color: tokens.color.textSecondary,
  mb: 0.5,
};
const navIconSx = { minWidth: 36, color: 'inherit' };

function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        sx={{ borderRadius: `${tokens.radius.sm}px`, p: 0.5, gap: 1.5 }}
      >
        <Box sx={{ display: HIDE_ON_MOBILE, flexDirection: 'column', textAlign: 'right' }}>
          <Typography variant="body2">{user?.name}</Typography>
          <Typography variant="caption">{user?.email}</Typography>
        </Box>
        <Avatar src={user?.avatarUrl} alt={user?.name} sx={{ width: 36, height: 36 }} />
        <ExpandMoreIcon
          fontSize="small"
          sx={{ display: HIDE_ON_MOBILE, color: 'text.secondary' }}
        />
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user?.name}
          </Typography>
          <Typography variant="caption">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            navigate('/profile');
          }}
        >
          <ListItemIcon>
            <ManageAccountsOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Edit profile
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onLogout();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}

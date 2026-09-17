import { ThemeProvider } from '@mui/material';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertChipStack } from '../../components/alert-chips/AlertChipStack';
import { useAlertChips } from '../../components/alert-chips/alert-chip-store';
import { theme } from '../../theme/theme';
import { useAuthStore } from './auth-store';
import { DEMO_EMAIL, DEMO_PASSWORD, LoginPage } from './LoginPage';

function renderLoginPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
      <AlertChipStack />
    </ThemeProvider>,
  );
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('LoginPage', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useAlertChips.setState({ chips: [] });
    useAuthStore.setState({ status: 'anonymous', user: null });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('shows the error chip, clears the password and keeps the email on bad credentials', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        details: null,
        requestId: 'r1',
      }),
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), DEMO_EMAIL);
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue(DEMO_EMAIL);
  });

  it('logs in with the demo account and goes to the dashboard', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        accessToken: 'token',
        user: {
          id: '1',
          externalId: 'user_001',
          email: DEMO_EMAIL,
          name: 'Priya Sharma',
          avatarUrl: 'https://example.com/a.svg',
          role: 'analyst',
        },
      }),
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Fill in demo account' }));
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'));
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.body).toBe(JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }));
  });

  it('validates the email before calling the API', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

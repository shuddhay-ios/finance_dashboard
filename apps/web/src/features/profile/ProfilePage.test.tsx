import type { UserResponse } from '@finance/shared';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertChipStack } from '../../components/alert-chips/AlertChipStack';
import { useAlertChips } from '../../components/alert-chips/alert-chip-store';
import { theme } from '../../theme/theme';
import { useAuthStore } from '../auth/auth-store';
import { ProfilePage } from './ProfilePage';

const priya: UserResponse = {
  id: 'u1',
  externalId: 'user_001',
  email: 'priya.sharma@example.com',
  name: 'Priya Sharma',
  avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=user_001',
  role: 'analyst',
};

function renderPage() {
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={new QueryClient()}>
        <ProfilePage />
        <AlertChipStack />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe('ProfilePage', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({ status: 'authenticated', user: priya });
    useAlertChips.setState({ chips: [] });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('saves a new display name and updates the logged-in user everywhere', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...priya, name: 'Priya S.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const user = userEvent.setup();
    renderPage();

    const nameField = screen.getByLabelText('Display name');
    await user.clear(nameField);
    await user.type(nameField, 'Priya S.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Name updated')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.name).toBe('Priya S.');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/users/me');
    expect(init?.method).toBe('PATCH');
  });

  it('refuses a file that is not an image before uploading anything', async () => {
    // applyAccept: false lets the test pick a file the input's accept list would hide.
    const user = userEvent.setup({ applyAccept: false });
    renderPage();

    await user.upload(
      screen.getByLabelText('Choose profile photo'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    );

    expect(await screen.findByText('Choose a PNG, JPEG or WebP image')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('only offers "Remove photo" once a photo has been uploaded', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument();
  });
});

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AlertChipStack } from './components/alert-chips/AlertChipStack';
import { restoreSession } from './features/auth/session';
import { queryClient } from './lib/query-client';
import { ThemeProvider } from './theme/ThemeProvider';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element in index.html');
}

// Start restoring a saved session straight away; route guards wait for it to finish.
void restoreSession();

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <AlertChipStack />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);

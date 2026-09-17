import type { UserResponse } from '@finance/shared';
import { create } from 'zustand';

/** "checking" is the brief moment on page load while a saved session is being restored. */
export type SessionStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthState {
  status: SessionStatus;
  user: UserResponse | null;
  setAuthenticated: (user: UserResponse) => void;
  setAnonymous: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  user: null,
  setAuthenticated: (user) => set({ status: 'authenticated', user }),
  setAnonymous: () => set({ status: 'anonymous', user: null }),
}));

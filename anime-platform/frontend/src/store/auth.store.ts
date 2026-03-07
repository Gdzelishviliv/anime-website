import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string, rememberMe = false) => {
    const { data } = await authApi.login({ email, password, rememberMe });
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', data.accessToken);
    storage.setItem('refreshToken', data.refreshToken);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
    set({ user: data.user, isAuthenticated: true });
  },

  register: async (email: string, username: string, password: string) => {
    const { data } = await authApi.register({ email, username, password });
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('refreshToken', data.refreshToken);
    localStorage.removeItem('rememberMe');
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const refreshToken = storage.getItem('refreshToken');
      await authApi.logout(refreshToken || undefined);
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { data } = await authApi.getMe();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

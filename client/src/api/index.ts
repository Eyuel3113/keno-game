import axios from 'axios';
import { useStore } from '../store';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:5000/api`;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 – logout & redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  user: { id: string; email: string };
  balance: number;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (email: string, password: string) =>
    api.post<{ message: string }>('/auth/register', { email, password }),
};

// ─── Wallet ──────────────────────────────────────────────────────────────────
export const walletApi = {
  getBalance: () => api.get<{ balance: number }>('/wallet/balance'),

  deposit: (amount: number) =>
    api.post<{ balance: number }>('/wallet/deposit', { amount }),

  withdraw: (amount: number) =>
    api.post<{ balance: number }>('/wallet/withdraw', { amount }),

  getTransactions: () =>
    api.get<{
      transactions: Array<{
        id: string;
        type: 'DEPOSIT' | 'WITHDRAW';
        amount: number;
        createdAt: string;
      }>;
    }>('/wallet/transactions'),
};

// ─── Game ─────────────────────────────────────────────────────────────────────
export interface BetResponse {
  betId: string;
  balance: number;
  payout: number;
  hits: number;
  drawnNumbers: number[];
}

export const gameApi = {
  placeBet: (roundId: string, picks: number[], amount: number) =>
    api.post<BetResponse>('/game/bet', { roundId, picks, amount }),
};

// ─── History ─────────────────────────────────────────────────────────────────
export const historyApi = {
  getHistory: (limit = 20) =>
    api.get<{ bets: Array<{
      id: string;
      amount: number;
      picks: number[];
      payout: number;
      createdAt: string;
      gameRound: { drawnNumbers: number[] };
    }> }>(`/history?limit=${limit}`),
};

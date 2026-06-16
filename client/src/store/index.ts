import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BetHistoryItem {
  id: string;
  amount: number;
  picks: number[];
  roundId: string;
  drawnNumbers: number[];
  roundStatus?: string;
  hits: number;
  payout: number;
  createdAt: string;
}

export interface User {
  id: string;
  email?: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  role?: string;
}

interface GameState {
  // Auth
  user: User | null;
  token: string | null;
  isTelegram: boolean;

  // Wallet
  balance: number;

  // Game
  picks: number[];
  drawnNumbers: number[];
  isDrawing: boolean;
  currentRoundId: string | null;
  countdown: number;
  bettingDuration: number;

  // All numbers picked across ALL bets this round (for hit highlighting)
  allRoundPicks: number[];

  // Results
  lastPayout: number | null;
  lastHits: number | null;

  // History
  betHistory: BetHistoryItem[];

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsTelegram: (isTelegram: boolean) => void;
  setBalance: (balance: number) => void;
  setPicks: (picks: number[]) => void;
  setDrawnNumbers: (numbers: number[]) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setCurrentRoundId: (roundId: string | null) => void;
  setCountdown: (countdown: number) => void;
  setBettingDuration: (duration: number) => void;
  setAllRoundPicks: (picks: number[]) => void;
  setLastPayout: (payout: number | null, hits: number | null) => void;
  setBetHistory: (history: BetHistoryItem[]) => void;
  logout: () => void;
}

export const useStore = create<GameState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isTelegram: false,
      balance: 0,
      picks: [],
      drawnNumbers: [],
      isDrawing: false,
      currentRoundId: null,
      countdown: 0,
      bettingDuration: 60,
      allRoundPicks: [],
      lastPayout: null,
      lastHits: null,
      betHistory: [],

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setIsTelegram: (isTelegram) => set({ isTelegram }),
      setBalance: (balance) => set({ balance }),
      setPicks: (picks) => set({ picks }),
      setDrawnNumbers: (drawnNumbers) => set({ drawnNumbers }),
      setIsDrawing: (isDrawing) => set({ isDrawing }),
      setCurrentRoundId: (currentRoundId) => set({ currentRoundId }),
      setCountdown: (countdown) => set({ countdown }),
      setBettingDuration: (bettingDuration) => set({ bettingDuration }),
      setAllRoundPicks: (allRoundPicks) => set({ allRoundPicks }),
      setLastPayout: (lastPayout, lastHits) => set({ lastPayout, lastHits }),
      setBetHistory: (betHistory) => set({ betHistory }),
      logout: () =>
        set({
          user: null,
          token: null,
          isTelegram: false,
          balance: 0,
          picks: [],
          drawnNumbers: [],
          isDrawing: false,
          currentRoundId: null,
          countdown: 0,
          bettingDuration: 60,
          allRoundPicks: [],
          lastPayout: null,
          lastHits: null,
          betHistory: [],
        }),
    }),
    {
      name: 'keno-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof state.balance !== 'number') {
          state.balance = 0;
        }
      },
    }
  )
);

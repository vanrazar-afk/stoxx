import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Lot {
  id: string;
  symbol: string;
  name: string;
  qty: number;
  price: number; // cost per share
  date: string; // YYYY-MM-DD
}

export interface Account {
  mode: 'guest' | 'google';
  uid?: string;
  name?: string | null;
  email?: string | null;
  photo?: string | null;
}

interface AppState {
  disclaimerAcceptedAt: string | null;
  account: Account | null;
  setAccount: (a: Account | null) => void;
  replaceData: (d: { lots: Lot[]; watchlist: string[] }) => void;
  lots: Lot[];
  watchlist: string[];
  acceptDisclaimer: () => void;
  addLot: (lot: Omit<Lot, 'id'>) => void;
  removeLot: (id: string) => void;
  toggleWatch: (symbol: string) => void;
  resetAll: () => void;
}

/**
 * Guest mode: all user data lives ON THE DEVICE only.
 * Google mode: the same data is also synced to the user's own Firestore document (see auth.tsx).
 */
export const useApp = create<AppState>()(
  persist(
    (set) => ({
      disclaimerAcceptedAt: null,
      account: null,
      setAccount: (account) => set({ account }),
      replaceData: ({ lots, watchlist }) => set({ lots, watchlist }),
      lots: [],
      watchlist: [],
      acceptDisclaimer: () => set({ disclaimerAcceptedAt: new Date().toISOString() }),
      addLot: (lot) =>
        set((s) => ({ lots: [...s.lots, { ...lot, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }] })),
      removeLot: (id) => set((s) => ({ lots: s.lots.filter((l) => l.id !== id) })),
      toggleWatch: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol) ? s.watchlist.filter((x) => x !== symbol) : [...s.watchlist, symbol],
        })),
      resetAll: () => set({ lots: [], watchlist: [], disclaimerAcceptedAt: null, account: null }),
    }),
    { name: 'stoxx-user', storage: createJSONStorage(() => AsyncStorage), version: 2, migrate: (s: any) => ({ account: null, ...s }) },
  ),
);

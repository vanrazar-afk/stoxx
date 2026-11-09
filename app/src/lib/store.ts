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

interface AppState {
  disclaimerAcceptedAt: string | null;
  lots: Lot[];
  watchlist: string[];
  acceptDisclaimer: () => void;
  addLot: (lot: Omit<Lot, 'id'>) => void;
  removeLot: (id: string) => void;
  toggleWatch: (symbol: string) => void;
  resetAll: () => void;
}

/**
 * All user data lives ON THE DEVICE only (no account, no server).
 * This keeps the privacy footprint minimal for App Store / Play "Data safety" forms.
 */
export const useApp = create<AppState>()(
  persist(
    (set) => ({
      disclaimerAcceptedAt: null,
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
      resetAll: () => set({ lots: [], watchlist: [], disclaimerAcceptedAt: null }),
    }),
    { name: 'stoxx-user', storage: createJSONStorage(() => AsyncStorage), version: 1 },
  ),
);

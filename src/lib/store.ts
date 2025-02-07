import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AppState {
  initialized: boolean;
  setInitialized: (initialized: boolean) => void;
  exchangeKeys: any[];
  setExchangeKeys: (keys: any[]) => void;
  tradingPairs: any[];
  setTradingPairs: (pairs: any[]) => void;
  lastFetch: {
    exchangeKeys?: number;
    tradingPairs?: number;
  };
  setLastFetch: (key: string, time: number) => void;
}

export const useStore = create<AppState>()(
  devtools(
    (set) => ({
      initialized: false,
      setInitialized: (initialized) => set({ initialized }),
      exchangeKeys: [],
      setExchangeKeys: (keys) => set({ exchangeKeys: keys }),
      tradingPairs: [],
      setTradingPairs: (pairs) => set({ tradingPairs: pairs }),
      lastFetch: {},
      setLastFetch: (key, time) => 
        set((state) => ({
          lastFetch: {
            ...state.lastFetch,
            [key]: time
          }
        }))
    }),
    {
      name: 'app-store'
    }
  )
); 
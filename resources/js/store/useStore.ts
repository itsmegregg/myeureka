import { create } from 'zustand';

interface StoreState {
  selectedStore: string | undefined; // This should be the store_code
  setSelectedStore: (storeCode: string | undefined) => void;
}

export const useStore = create<StoreState>((set) => ({
  selectedStore: undefined,
  setSelectedStore: (storeName) => set({ selectedStore: storeName }),
}));

import { create } from 'zustand';

interface CashierState {
    selectedCashier: string | null;
    setSelectedCashier: (cashier: string | null) => void;
}

export const useCashierStore = create<CashierState>((set) => ({
    selectedCashier: null,
    setSelectedCashier: (cashier) => set({ selectedCashier: cashier }),
}));
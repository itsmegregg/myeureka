//save this

import { create } from 'zustand';

interface MonthState {
    selectedMonth: Date;
    setSelectedMonth: (date: Date) => void;
}

export const useMonthPicker = create<MonthState>((set) => ({
    selectedMonth: new Date(), // Set to current month and year by default
    setSelectedMonth: (date) => set({ selectedMonth: date }),
}));
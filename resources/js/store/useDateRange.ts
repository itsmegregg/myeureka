import { create } from 'zustand';
import { addDays } from 'date-fns';
import { type DateRange } from 'react-day-picker';

interface DateRangeState {
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange | undefined) => void;
}

export const useDateRange = create<DateRangeState>((set) => ({
  // Default date range: last 20 days to today
  dateRange: {
    from: addDays(new Date(), -20),
    to: new Date(),
  },
  setDateRange: (dateRange) =>
    set({ dateRange: dateRange || { from: undefined, to: undefined } }),
}));

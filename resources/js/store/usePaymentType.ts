import { create } from 'zustand';

interface PaymentTypeState {
  selectedPaymentType: string | null;
  setSelectedPaymentType: (paymentType: string) => void;
}

export const usePaymentTypeStore = create<PaymentTypeState>((set) => ({
  selectedPaymentType: null,
  setSelectedPaymentType: (paymentType) => set({ selectedPaymentType: paymentType }),
}));

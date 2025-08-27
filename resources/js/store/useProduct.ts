import { create } from 'zustand';

interface ProductState {
  selectedProduct: string | null;
  setSelectedProduct: (product: string | null) => void;
}

export const useProduct = create<ProductState>((set) => ({
  selectedProduct: 'ALL', // Default to 'ALL' for "All Products"
  setSelectedProduct: (product) => set({ selectedProduct: product }),
}));

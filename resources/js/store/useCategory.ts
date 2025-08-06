import { create } from 'zustand';

interface CategoryState {
    selectedCategory: string | null;
    setSelectedCategory: (category: string) => void;
}

export const useCategory = create<CategoryState>((set) => ({
    selectedCategory: null,
    setSelectedCategory: (category) => set({ selectedCategory: category }),
}));

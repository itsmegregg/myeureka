import { create } from 'zustand';

interface SidebarState {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
    isOpen: true, // Default to closed
    setIsOpen: (open) => set({ isOpen: open }),
}));

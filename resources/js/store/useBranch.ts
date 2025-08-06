//file this

import { create } from 'zustand';
import { Branch } from '@/types';

interface BranchState {
    selectedBranch: Branch | null;
    setSelectedBranch: (branch: Branch | null) => void;
}

export const useBranchStore = create<BranchState>((set) => ({
    selectedBranch: null,
    setSelectedBranch: (branch) => set({ selectedBranch: branch }),
}));
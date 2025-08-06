import {create} from 'zustand';


interface TerminalState {
    selectedTerminal: string | null;
    setSelectedTerminal: (terminal: string | null) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
    selectedTerminal: null,
    setSelectedTerminal: (terminal) => set({ selectedTerminal: terminal }),
}));
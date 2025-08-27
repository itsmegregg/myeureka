import { useEffect, useState } from "react";
import { create } from "zustand";

type Theme = "dark" | "light" | "system";

type ThemeStore = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Create a Zustand store for theme management
export const useThemeStore = create<ThemeStore>((set) => ({
  theme: typeof window !== 'undefined' ? 
    (localStorage.getItem('theme') as Theme || 'dark') : 
    'dark',
  setTheme: (theme: Theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  },
}));

export function useTheme() {
  const { theme, setTheme } = useThemeStore();
  
  // For SSR safety
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      
      root.classList.add(systemTheme);
      return;
    }
    
    root.classList.add(theme);
  }, [theme, mounted]);

  return { theme, setTheme, mounted };
}

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeCtxType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeCtxType>({ theme: "dark", toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read from localStorage, default to dark
    const saved = localStorage.getItem("morph_theme") as Theme | null;
    const resolved: Theme = saved === "light" ? "light" : "dark";
    setTheme(resolved);
    document.documentElement.classList.toggle("light", resolved === "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("morph_theme", next);
      document.documentElement.classList.toggle("light", next === "light");
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

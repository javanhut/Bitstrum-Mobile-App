import { createContext, useContext, useMemo, type ReactNode } from "react";
import { findTheme, type Theme, type ThemeColors } from "./colors";

type Ctx = {
  theme: Theme;
  colors: ThemeColors;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({
  themeId,
  children,
}: {
  themeId: string;
  children: ReactNode;
}) {
  const value = useMemo<Ctx>(() => {
    const theme = findTheme(themeId);
    return { theme, colors: theme.colors };
  }, [themeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}

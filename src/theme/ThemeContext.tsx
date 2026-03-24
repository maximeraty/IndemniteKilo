import React, { createContext, useContext } from 'react';
import { lightColors, Colors } from './colors';

interface ThemeContextValue {
  colors: Colors;
  isDark: boolean;
}

const themeValue: ThemeContextValue = {
  colors: lightColors,
  isDark: false,
};

const ThemeContext = createContext<ThemeContextValue>(themeValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

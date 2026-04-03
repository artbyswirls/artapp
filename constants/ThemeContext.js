// ============================================
// constants/ThemeContext.js
// This controls dark mode for the WHOLE app
// ============================================

import { createContext, useContext, useState } from 'react';

// The colors for light and dark mode
export const theme = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
    subtext: '#666666',
    border: '#E0E0E0',
    primary: '#6200EA',
    icon: '#333333',
    header: '#FFFFFF',
    tabBar: '#FFFFFF',
    inputBackground: '#F5F5F5',
    placeholder: '#999999',
    like: '#FF4444',
    shadow: '#000000',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    card: '#1E1E1E',
    text: '#FFFFFF',
    subtext: '#AAAAAA',
    border: '#333333',
    primary: '#BB86FC',
    icon: '#FFFFFF',
    header: '#1E1E1E',
    tabBar: '#1E1E1E',
    inputBackground: '#2C2C2C',
    placeholder: '#777777',
    like: '#FF4444',
    shadow: '#000000',
  },
};

// Create the context
const ThemeContext = createContext();

// This wraps your whole app and provides dark mode to every screen
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  function toggleTheme() {
    setIsDark((prev) => !prev);
  }

  const colors = isDark ? theme.dark : theme.light;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

// This is what every screen will use to get colors and toggle
export function useTheme() {
  return useContext(ThemeContext);
}
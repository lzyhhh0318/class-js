import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('light');
    localStorage.removeItem('theme');
  }, [theme]);

  const toggleTheme = () => {
    setTheme('light');
  };

  return {
    theme,
    toggleTheme,
    isDark: false
  };
} 
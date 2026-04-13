'use client';

import { useEffect } from 'react';
import { useUI, type AppTheme } from '@/app/store/useUI';

const VALID_THEMES: AppTheme[] = ['dark', 'light', 'neumorphism', 'cyberpunk'];

export function ThemeManager() {
  const { appTheme, setAppTheme } = useUI();

  useEffect(() => {
    // If persisted theme is stale (from old 5-theme system), reset to dark
    const theme = VALID_THEMES.includes(appTheme) ? appTheme : 'dark';
    if (theme !== appTheme) setAppTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [appTheme, setAppTheme]);

  return null;
}
'use client';

import { useEffect } from 'react';
import { useUI } from '@/app/store/useUI';

export function ThemeManager() {
  const { appTheme } = useUI();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
  }, [appTheme]);

  return null;
}
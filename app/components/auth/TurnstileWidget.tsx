'use client';

import { useEffect, useRef } from 'react';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function TurnstileWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || loaded.current) return;
    loaded.current = true;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (containerRef.current && (window as any).turnstile) {
        (window as any).turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          size: 'normal',
          callback: (token: string) => {
            // Store turnstile token for use in auth requests
            sessionStorage.setItem('turnstile_token', token);
          },
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  return <div ref={containerRef} className="mt-2" />;
}
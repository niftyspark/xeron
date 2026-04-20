'use client';

/**
 * Cloudflare Turnstile widget.
 *
 * Audit #9: the previous implementation stashed the verified token in
 * sessionStorage, where nothing ever read it — rendering the anti-bot check
 * non-functional. This version exposes the token via an `onToken` callback
 * that the parent form stores in component state and submits with the login.
 */

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        config: {
          sitekey: string;
          theme?: 'dark' | 'light' | 'auto';
          size?: 'normal' | 'compact' | 'invisible';
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!SITE_KEY || rendered.current) return;
    rendered.current = true;

    const render = () => {
      if (!containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        size: 'normal',
        callback: (token) => onToken(token),
        'error-callback': () => onToken(null),
        'expired-callback': () => onToken(null),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing && window.turnstile) {
      render();
      return;
    }
    if (existing) {
      existing.addEventListener('load', render, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [onToken]);

  if (!SITE_KEY) {
    // Configuration error is visible rather than silently disabling protection.
    return (
      <p className="text-xs text-amber-400 text-center max-w-[280px]">
        Bot verification is not configured. Sign-in is disabled.
      </p>
    );
  }

  return <div ref={containerRef} className="mt-2" />;
}

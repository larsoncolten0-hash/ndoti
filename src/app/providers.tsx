'use client';
import { useEffect, type ReactNode } from 'react';
import i18n from '@/i18n';
import { AuthProvider } from '@/lib/auth';
import { flushOutbox } from '@/lib/outbox';

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Saved language (see i18n/index.ts for why this happens after load).
    try {
      const saved = localStorage.getItem('lang') ?? (navigator.language.startsWith('en') ? 'en' : 'fr');
      if (saved !== i18n.language) void i18n.changeLanguage(saved);
    } catch { /* storage unavailable */ }
    const saveLang = (l: string) => { try { localStorage.setItem('lang', l); } catch { /* ignore */ } };
    i18n.on('languageChanged', saveLang);

    // Offline support: service worker + send queued actions when the network returns.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    const flush = () => { void flushOutbox(); };
    flush();
    window.addEventListener('online', flush);
    const timer = setInterval(flush, 30000);

    return () => { i18n.off('languageChanged', saveLang); window.removeEventListener('online', flush); clearInterval(timer); };
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}

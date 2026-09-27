'use client';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { useOnline } from '@/lib/hooks';

export default function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const online = useOnline();
  const router = useRouter();

  const toggleLang = () => {
    const next = i18n.language === 'fr' ? 'en' : 'fr';
    void i18n.changeLanguage(next);
    if (user) api('/api/me', { lang: next }, 'PATCH').catch(() => {});
  };

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-forest px-4 py-3 text-white">
        <img src="/icons/favicon.svg" alt="" className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{title ?? t('app.name')}</div>
          {user && <div className="truncate text-sm text-white/75">{user.name}</div>}
        </div>
        <button onClick={toggleLang} className="rounded-lg px-3 py-2 text-sm font-bold underline-offset-4 hover:underline">
          {t('app.language')}
        </button>
        {user && (
          <button onClick={async () => { await logout(); router.replace('/login'); }}
            className="rounded-lg px-3 py-2 text-sm font-bold underline-offset-4 hover:underline">
            {t('app.logout')}
          </button>
        )}
      </header>
      {!online && <div role="status" className="bg-vest px-4 py-2 text-base font-bold text-ink">{t('app.offline')}</div>}
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import { homeFor } from '@/components/RequireRole';
import { useAuth } from '@/lib/auth';

export default function Pending() {
  const { t } = useTranslation();
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!loading && user?.status !== 'pending') router.replace(homeFor(user)); }, [loading, user, router]);
  // Check every minute whether an admin has approved the account.
  useEffect(() => { const t = setInterval(refresh, 60000); return () => clearInterval(t); }, [refresh]);

  return (
    <AppShell>
      <h1 className="mb-3 text-2xl font-bold">{t('pending.title')}</h1>
      <p>{t('pending.body')}</p>
    </AppShell>
  );
}

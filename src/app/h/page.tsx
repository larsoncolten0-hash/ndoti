'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import GatePlate from '@/components/GatePlate';
import RequireRole from '@/components/RequireRole';
import StatusPill from '@/components/StatusPill';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { formatFcfa } from '@/lib/pricing';
import type { Pickup } from '@/lib/types';

export default function HouseholdPage() {
  return <RequireRole role="household"><HouseholdHome /></RequireRole>;
}

function HouseholdHome() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, reload } = useApi<{ pickups: Pickup[] }>('/api/pickups', 15000);
  const pickups = data?.pickups ?? [];

  return (
    <AppShell>
      <section className="mb-6">
        <p className="mb-2 font-bold">{t('household.yourCode')}</p>
        {user?.gateCode ? <GatePlate code={user.gateCode} /> : <p className="text-ink/70">{t('household.codeSoon')}</p>}
      </section>

      <Link href="/h/request" className="btn-vest mb-8">{t('household.request')}</Link>

      <h2 className="mb-3 text-xl font-bold">{t('household.myPickups')}</h2>
      {data && pickups.length === 0 && <p className="text-ink/70">{t('household.none')}</p>}
      <ul className="space-y-4">
        {pickups.map((p) => <PickupCard key={p.id} p={p} onChange={reload} />)}
      </ul>
    </AppShell>
  );
}

function PickupCard({ p, onChange }: { p: Pickup; onChange: () => void }) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const act = async (body: object) => {
    setError('');
    try { await api(`/api/pickups/${p.id}`, body); onChange(); } catch { setError(t('auth.errGeneric')); }
  };

  return (
    <li className="rounded-xl border-2 border-ink/15 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-bold">{t(`request.${p.volume}`)}, {formatFcfa(p.price)}</span>
        <StatusPill status={p.status} />
      </div>
      {p.collectorName && <p className="text-ink/80">{p.collectorName}</p>}

      {p.code && (
        <div className="mt-3 rounded-lg bg-mist p-3">
          <p className="text-sm font-bold">{t('household.giveCode')}</p>
          <p className="text-4xl font-bold tracking-[0.3em]">{p.code}</p>
        </div>
      )}

      {p.status !== 'cancelled' && <Payment p={p} onPay={(paymentRef) => act({ action: 'pay', paymentRef })} />}

      {p.status === 'requested' && (
        <button onClick={() => act({ action: 'cancel' })} className="mt-3 font-bold text-alarm underline">{t('household.cancel')}</button>
      )}
      {error && <p role="alert" className="mt-2 font-bold text-alarm">{error}</p>}
    </li>
  );
}

function Payment({ p, onPay }: { p: Pickup; onPay: (ref: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tx, setTx] = useState('');

  if (p.paymentStatus === 'confirmed') return <p className="mt-3 font-bold text-leaf">✓ {t('household.paid')}</p>;
  if (p.paymentStatus === 'to_verify') return <p className="mt-3 font-bold">{t('household.paymentPending')}</p>;
  if (!open) return <button className="btn-primary mt-3" onClick={() => setOpen(true)}>{t('household.pay')}</button>;

  // Pilot: manual Mobile Money, confirmed by an admin (requirement M-01).
  return (
    <div className="mt-3 space-y-3 rounded-lg bg-mist p-3">
      <p className="font-bold">{t('household.payTitle')}</p>
      <p>{t('household.payBody', { amount: formatFcfa(p.price) })}</p>
      <ul className="font-bold">
        {process.env.NEXT_PUBLIC_MOMO_NUMBER && <li>MTN MoMo: {process.env.NEXT_PUBLIC_MOMO_NUMBER}</li>}
        {process.env.NEXT_PUBLIC_OM_NUMBER && <li>Orange Money: {process.env.NEXT_PUBLIC_OM_NUMBER}</li>}
      </ul>
      <input className="field" placeholder={t('household.txId')} value={tx} onChange={(e) => setTx(e.target.value)} />
      <button className="btn-primary" disabled={tx.trim().length < 3} onClick={() => onPay(tx.trim())}>{t('household.sendTx')}</button>
    </div>
  );
}

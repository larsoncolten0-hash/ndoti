'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import RequireRole from '@/components/RequireRole';
import { api } from '@/lib/client';
import { PRICES, formatFcfa } from '@/lib/pricing';
import type { Volume } from '@/lib/types';

const VOLUMES: Volume[] = ['small_bag', 'big_sack', 'bucket', 'multiple'];

export default function RequestPage() {
  return <RequireRole role="household"><RequestPickup /></RequireRole>;
}

function RequestPickup() {
  const { t } = useTranslation();
  const router = useRouter();
  const [volume, setVolume] = useState<Volume>('small_bag');
  const [when, setWhen] = useState<'now' | 'scheduled'>('now');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try { await api('/api/pickups', { volume, when }); router.replace('/h'); }
    catch { setError(t('auth.errGeneric')); setBusy(false); }
  };

  const option = (active: boolean) =>
    `flex min-h-16 items-center justify-between rounded-xl border-2 px-4 text-left font-bold ${active ? 'border-forest bg-forest text-white' : 'border-ink/25 bg-white'}`;

  return (
    <AppShell title={t('request.title')}>
      <fieldset className="mb-6">
        <legend className="label">{t('request.volume')}</legend>
        <div className="grid gap-3">
          {VOLUMES.map((v) => (
            <button key={v} className={option(volume === v)} onClick={() => setVolume(v)}>
              <span>{t(`request.${v}`)}</span><span>{formatFcfa(PRICES[v])}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mb-8">
        <legend className="label">{t('request.when')}</legend>
        <div className="flex gap-3">
          {(['now', 'scheduled'] as const).map((w) => (
            <button key={w} className={`${option(when === w)} flex-1 justify-center`} onClick={() => setWhen(w)}>{t(`request.${w}`)}</button>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="mb-4 font-bold text-alarm">{error}</p>}
      <button className="btn-vest" disabled={busy} onClick={submit}>
        {t('request.confirm')} ({formatFcfa(PRICES[volume])})
      </button>
    </AppShell>
  );
}

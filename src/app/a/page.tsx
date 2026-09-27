'use client';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import RequireRole from '@/components/RequireRole';
import StatusPill from '@/components/StatusPill';
import { api } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { formatFcfa } from '@/lib/pricing';
import type { AppUser, Dump, Pickup } from '@/lib/types';

interface Overview {
  pendingCollectors: AppUser[];
  payments: Pickup[];
  dumps: Dump[];
  recent: Pickup[];
  today: { total: number; collected: number; failed: number };
}

export default function AdminPage() {
  return <RequireRole role="admin"><AdminHome /></RequireRole>;
}

function AdminHome() {
  const { t } = useTranslation();
  const { data, reload } = useApi<Overview>('/api/admin', 30000);
  const [error, setError] = useState('');
  const act = async (body: object) => {
    setError('');
    try { await api('/api/admin', body); } catch { setError(t('auth.errGeneric')); }
    void reload();
  };
  if (!data) return <AppShell title={t('admin.title')}><p /></AppShell>;

  return (
    <AppShell title={t('admin.title')}>
      {error && <p role="alert" className="mb-4 font-bold text-alarm">{error}</p>}
      <section className="mb-8 grid grid-cols-3 gap-3 text-center">
        <Stat n={data.today.total} label={t('admin.today')} />
        <Stat n={data.today.collected} label={t('status.picked_up')} />
        <Stat n={data.today.failed} label={t('status.failed')} />
      </section>

      <Queue title={t('admin.pendingCollectors')} count={data.pendingCollectors.length}>
        {data.pendingCollectors.map((c) => (
          <Row key={c.id} main={`${c.name}, ${c.phone}`} sub={`CNI ${c.cniNumber ?? '?'}, ${t(`auth.${c.transport ?? 'pushcart'}`)}, zone ${c.zoneIds?.join(', ')}`}>
            <button className="btn-primary" onClick={() => act({ type: 'approve_collector', id: c.id })}>{t('admin.approve')}</button>
          </Row>
        ))}
      </Queue>

      <Queue title={t('admin.payments')} count={data.payments.length}>
        {data.payments.map((p) => (
          <Row key={p.id} main={`${p.householdName}, ${formatFcfa(p.price)}`} sub={`ID ${p.paymentRef}`}>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={() => act({ type: 'payment', id: p.id, decision: 'confirm' })}>{t('admin.confirmPayment')}</button>
              <button className="btn-ghost" onClick={() => act({ type: 'payment', id: p.id, decision: 'reject' })}>{t('admin.reject')}</button>
            </div>
          </Row>
        ))}
      </Queue>

      <Queue title={t('admin.dumps')} count={data.dumps.length}>
        {data.dumps.map((d) => (
          <Row key={d.id} main={`${d.collectorName}, ${d.pickupIds.length} pickups`}
            sub={d.distanceMeters != null ? `${d.distanceMeters} m` : 'GPS ?'}>
            <img src={d.photoUrl.replace('/upload/', '/upload/w_800,q_auto/')} alt="" className="mb-3 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={() => act({ type: 'dump', id: d.id, decision: 'approved' })}>{t('admin.approve')}</button>
              <button className="btn-ghost" onClick={() => act({ type: 'dump', id: d.id, decision: 'rejected' })}>{t('admin.reject')}</button>
            </div>
          </Row>
        ))}
      </Queue>

      <h2 className="mb-3 text-xl font-bold">{t('admin.allPickups')}</h2>
      <ul className="divide-y divide-ink/10">
        {data.recent.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-3">
            <span>{p.gateCode ?? p.householdName}, {p.zoneId}</span>
            <StatusPill status={p.status} />
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div className="rounded-xl bg-mist py-3"><div className="text-3xl font-bold">{n}</div><div className="text-sm">{label}</div></div>;
}

function Queue({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-bold">{title} ({count})</h2>
      {count === 0 ? <p className="text-ink/70">{t('admin.empty')}</p> : <ul className="space-y-3">{children}</ul>}
    </section>
  );
}

function Row({ main, sub, children }: { main: string; sub?: string; children: ReactNode }) {
  return (
    <li className="rounded-xl border-2 border-ink/15 p-4">
      <p className="font-bold">{main}</p>
      {sub && <p className="mb-3 text-ink/70">{sub}</p>}
      {children}
    </li>
  );
}

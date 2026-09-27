'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import GatePlate from '@/components/GatePlate';
import RequireRole from '@/components/RequireRole';
import StatusPill from '@/components/StatusPill';
import { api, ApiError } from '@/lib/client';
import { mapsLink } from '@/lib/geo';
import { useApi, useOnline, useOutbox } from '@/lib/hooks';
import { enqueue, type OutboxItem } from '@/lib/outbox';
import { COLLECTOR_SHARE, formatFcfa } from '@/lib/pricing';
import type { Pickup, PickupAction, PickupStatus } from '@/lib/types';

const FAIL_REASONS = ['nobody_home', 'no_trash', 'wrong_address', 'refused'] as const;

export default function CollectorPage() {
  return <RequireRole role="collector"><CollectorHome /></RequireRole>;
}

function CollectorHome() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'mine' | 'open'>('mine');
  const [notice, setNotice] = useState('');
  const mineQ = useApi<{ pickups: Pickup[] }>('/api/pickups?view=mine');
  const openQ = useApi<{ pickups: Pickup[] }>('/api/pickups?view=open');
  const outbox = useOutbox();

  // Tell the collector when the server refused a queued action (e.g. pickup cancelled meanwhile).
  useEffect(() => {
    const on = () => setNotice(t('collector.rejected'));
    window.addEventListener('ndoti:outbox-rejected', on);
    return () => window.removeEventListener('ndoti:outbox-rejected', on);
  }, [t]);

  const queued = new Map<string, PickupAction>();
  for (const i of outbox) if (i.kind === 'pickup_action') queued.set(i.pickupId, i.body);
  const queuedDumps = outbox.filter((i): i is Extract<OutboxItem, { kind: 'dump' }> => i.kind === 'dump').length;

  const recent = mineQ.data?.pickups ?? [];
  const mine = recent
    .filter((p) => ['assigned', 'on_the_way', 'picked_up'].includes(p.status) && !(p.status === 'picked_up' && p.dumpId))
    .sort((a, b) => (a.gateCode ?? '').localeCompare(b.gateCode ?? '')); // gate codes follow the walking order
  const open = openQ.data?.pickups ?? [];
  const toDump = recent.filter((p) => p.status === 'picked_up' && !p.dumpId).length;

  // Half at pickup, half once the dump is approved (P-02).
  const today = new Date().toDateString();
  const earnings = recent
    .filter((p) => new Date(p.createdAt).toDateString() === today)
    .reduce((s, p) => s + p.price * COLLECTOR_SHARE * (p.status === 'dumped' ? 1 : p.status === 'picked_up' ? 0.5 : 0), 0);

  const reloadAll = () => { void mineQ.reload(); void openQ.reload(); };
  const tabClass = (a: boolean) => `min-h-12 flex-1 rounded-lg font-bold ${a ? 'bg-forest text-white' : 'bg-mist'}`;

  return (
    <AppShell>
      <p className="text-sm font-bold text-ink/70">{t('collector.earnings')}</p>
      <p className="mb-4 text-3xl font-bold">{formatFcfa(Math.round(earnings))}</p>

      {notice && (
        <button onClick={() => setNotice('')} className="mb-4 w-full rounded-lg bg-alarm px-4 py-3 text-left font-bold text-white">{notice}</button>
      )}
      {queuedDumps > 0 && <p className="mb-4 rounded-lg bg-mist px-4 py-3 font-bold">{t('dump.waiting', { count: queuedDumps })}</p>}
      {toDump > 0 && queuedDumps === 0 && (
        <Link href="/c/dump" className="btn-vest mb-5">{t('collector.dump')}: {t('collector.toDump', { count: toDump })}</Link>
      )}

      <div className="mb-4 flex gap-2">
        <button className={tabClass(tab === 'mine')} onClick={() => setTab('mine')}>{t('collector.mine')} ({mine.length})</button>
        <button className={tabClass(tab === 'open')} onClick={() => setTab('open')}>{t('collector.open')} ({open.length})</button>
      </div>

      {tab === 'open' ? (
        <>
          {openQ.data && open.length === 0 && <p className="text-ink/70">{t('collector.noneOpen')}</p>}
          <ul className="space-y-4">{open.map((p) => <OpenCard key={p.id} p={p} onDone={reloadAll} />)}</ul>
        </>
      ) : (
        <>
          {mineQ.data && mine.length === 0 && <p className="text-ink/70">{t('collector.noneMine')}</p>}
          <ul className="space-y-4">{mine.map((p) => <MyCard key={p.id} p={p} queued={queued.get(p.id)} />)}</ul>
        </>
      )}
    </AppShell>
  );
}

function Header({ p, status }: { p: Pickup; status?: PickupStatus }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        {p.gateCode ? <GatePlate code={p.gateCode} size="sm" /> : <span className="font-bold">{p.householdName}</span>}
        <StatusPill status={status ?? p.status} />
      </div>
      <p className="font-bold">{t(`request.${p.volume}`)}, {formatFcfa(p.price)}</p>
      {p.landmark && <p className="text-ink/80">{p.landmark}</p>}
    </>
  );
}

function OpenCard({ p, onDone }: { p: Pickup; onDone: () => void }) {
  const { t } = useTranslation();
  const online = useOnline();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Accepting is done live (not queued) so two collectors never think they both have the job.
  const accept = async () => {
    setBusy(true); setErr('');
    try { await api(`/api/pickups/${p.id}`, { action: 'accept' }); onDone(); }
    catch (e) { setErr(e instanceof ApiError && e.code === 'already_taken' ? t('collector.taken') : t('auth.errGeneric')); onDone(); }
    finally { setBusy(false); }
  };

  return (
    <li className="rounded-xl border-2 border-ink/15 p-4">
      <Header p={p} />
      {err && <p className="mt-2 font-bold text-alarm">{err}</p>}
      {!online && <p className="mt-2 text-ink/70">{t('collector.needsNetwork')}</p>}
      <button className="btn-primary mt-3" disabled={!online || busy} onClick={accept}>{t('collector.accept')}</button>
    </li>
  );
}

const PREVIEW: Partial<Record<PickupAction['action'], PickupStatus>> = { on_the_way: 'on_the_way', fail: 'failed' };

function MyCard({ p, queued }: { p: Pickup; queued?: PickupAction }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [failing, setFailing] = useState(false);
  // Queued actions work offline and are sent automatically (outbox).
  const send = (body: PickupAction) => { void enqueue({ kind: 'pickup_action', pickupId: p.id, body }); setFailing(false); setCode(''); };
  const canAct = !queued && (p.status === 'assigned' || p.status === 'on_the_way');

  return (
    <li className="rounded-xl border-2 border-ink/15 p-4">
      <Header p={p} status={queued ? PREVIEW[queued.action] : undefined} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a className="btn-ghost" href={`tel:${p.householdPhone}`}>{t('collector.call')}</a>
        {p.location ? <a className="btn-ghost" href={mapsLink(p.location)} target="_blank" rel="noreferrer">{t('collector.map')}</a> : <span />}
      </div>

      {queued && (
        <p className="mt-3 rounded-lg bg-mist px-3 py-2 font-bold">
          {queued.action === 'submit_code' ? t('collector.codeSaved') : t('collector.queued')}
        </p>
      )}

      {canAct && p.status === 'assigned' && (
        <button className="btn-vest mt-3" onClick={() => send({ action: 'on_the_way' })}>{t('collector.onMyWay')}</button>
      )}

      {canAct && !failing && (
        <div className="mt-4 space-y-3">
          {p.codeAttempts ? <p className="font-bold text-alarm">{t('collector.codeWrong')}</p> : null}
          <label className="label" htmlFor={`code-${p.id}`}>{t('collector.enterCode')}</label>
          <input id={`code-${p.id}`} className="field text-center text-3xl tracking-[0.4em]" inputMode="numeric"
            maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <button className="btn-primary" disabled={code.length !== 4}
            onClick={() => send({ action: 'submit_code', code })}>{t('collector.confirmCode')}</button>
          <button className="w-full py-2 font-bold text-alarm underline" onClick={() => setFailing(true)}>{t('collector.fail')}</button>
        </div>
      )}

      {canAct && failing && (
        <fieldset className="mt-4">
          <legend className="label">{t('collector.failReason')}</legend>
          <div className="grid gap-2">
            {FAIL_REASONS.map((r) => (
              <button key={r} className="btn-ghost" onClick={() => send({ action: 'fail', reason: r })}>{t(`collector.${r}`)}</button>
            ))}
          </div>
        </fieldset>
      )}
    </li>
  );
}

'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import { homeFor } from '@/components/RequireRole';
import { useAuth, type RegisterData } from '@/lib/auth';
import { ApiError } from '@/lib/client';
import { getCurrentLocation } from '@/lib/geo';
import { useApi } from '@/lib/hooks';
import { isValidPin, normalizePhone } from '@/lib/phone';
import type { GeoPoint, Lang, Zone } from '@/lib/types';

export default function Register() {
  const { t, i18n } = useTranslation();
  const { register, user } = useAuth();
  const router = useRouter();
  const zones = useApi<{ zones: Zone[] }>('/api/zones', 300000).data?.zones ?? [];
  const [role, setRole] = useState<'household' | 'collector'>('household');
  const [f, setF] = useState({ name: '', phone: '', pin: '', zoneId: '', landmark: '', cni: '', momo: '' });
  const [transport, setTransport] = useState<'foot' | 'pushcart' | 'tricycle'>('pushcart');
  const [location, setLocation] = useState<GeoPoint>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Read from the URL client-side only: it just preselects a tab, not something SSR needs to know,
  // and doing it this way (instead of useSearchParams) avoids a Suspense boundary that raced against
  // the language-switch effect in Providers and caused a hydration mismatch here.
  useEffect(() => { if (new URLSearchParams(window.location.search).get('role') === 'collector') setRole('collector'); }, []);
  useEffect(() => { if (user) router.replace(homeFor(user)); }, [user, router]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const saveLocation = async () => {
    try { setLocation(await getCurrentLocation()); } catch { setError(t('dump.noGps')); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(f.phone);
    if (!phone) return setError(t('auth.errBadPhone'));
    if (!isValidPin(f.pin)) return setError(t('auth.errBadPin'));
    if (!f.name.trim() || !f.zoneId) return setError(t('auth.errGeneric'));
    const data: RegisterData = {
      role, name: f.name.trim(), phone, pin: f.pin, lang: i18n.language as Lang, zoneId: f.zoneId,
      ...(role === 'household'
        ? { landmark: f.landmark.trim(), location }
        : { transport, cniNumber: f.cni.trim(), momoNumber: f.momo.trim() || undefined }),
    };
    setBusy(true); setError('');
    try { await register(data); }
    catch (err) {
      setError(err instanceof ApiError && err.code === 'phone_exists' ? t('auth.errExists') : t('auth.errGeneric'));
    } finally { setBusy(false); }
  };

  const choice = (active: boolean) =>
    `min-h-14 flex-1 rounded-xl border-2 px-3 font-bold ${active ? 'border-forest bg-forest text-white' : 'border-ink/25 bg-white'}`;

  return (
    <AppShell title={t('auth.registerTitle')}>
      <form onSubmit={submit} className="space-y-5">
        <fieldset>
          <legend className="label">{t('auth.iAm')}</legend>
          <div className="flex gap-3">
            <button type="button" className={choice(role === 'household')} onClick={() => setRole('household')}>{t('auth.household')}</button>
            <button type="button" className={choice(role === 'collector')} onClick={() => setRole('collector')}>{t('auth.collector')}</button>
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="name">{t('auth.name')}</label>
          <input id="name" className="field" autoComplete="name" value={f.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="phone">{t('auth.phone')}</label>
          <input id="phone" className="field" type="tel" inputMode="tel" placeholder="6 77 12 34 56" value={f.phone} onChange={set('phone')} />
        </div>
        <div>
          <label className="label" htmlFor="pin">{t('auth.pin')}</label>
          <input id="pin" className="field tracking-[0.5em]" type="password" inputMode="numeric" maxLength={6}
            autoComplete="new-password" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} />
        </div>
        <div>
          <label className="label" htmlFor="zone">{t('auth.zone')}</label>
          <select id="zone" className="field" value={f.zoneId} onChange={set('zoneId')}>
            <option value="">{t('auth.chooseZone')}</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>

        {role === 'household' ? (
          <>
            <div>
              <label className="label" htmlFor="landmark">{t('auth.landmark')}</label>
              <textarea id="landmark" className="field py-3" rows={2} placeholder={t('auth.landmarkHint')}
                value={f.landmark} onChange={set('landmark')} />
            </div>
            <button type="button" className="btn-ghost" onClick={saveLocation}>
              {location ? `✓ ${t('auth.locationSaved')}` : t('auth.saveLocation')}
            </button>
          </>
        ) : (
          <>
            <fieldset>
              <legend className="label">{t('auth.transport')}</legend>
              <div className="flex gap-2">
                {(['foot', 'pushcart', 'tricycle'] as const).map((k) => (
                  <button key={k} type="button" className={choice(transport === k)} onClick={() => setTransport(k)}>{t(`auth.${k}`)}</button>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="label" htmlFor="cni">{t('auth.cni')}</label>
              <input id="cni" className="field" value={f.cni} onChange={set('cni')} />
            </div>
            <div>
              <label className="label" htmlFor="momo">{t('auth.momo')}</label>
              <input id="momo" className="field" type="tel" inputMode="tel" value={f.momo} onChange={set('momo')} />
            </div>
          </>
        )}

        {error && <p role="alert" className="font-bold text-alarm">{error}</p>}
        <button className="btn-primary" disabled={busy}>{t('auth.register')}</button>
      </form>
      <p className="mt-8 text-center">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="font-bold text-forest underline">{t('auth.login')}</Link>
      </p>
    </AppShell>
  );
}

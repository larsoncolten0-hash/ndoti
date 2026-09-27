'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import { homeFor } from '@/components/RequireRole';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/client';
import { isValidPin, normalizePhone } from '@/lib/phone';

export default function Login() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) router.replace(homeFor(user)); }, [user, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const p = normalizePhone(phone);
    if (!p) return setError(t('auth.errBadPhone'));
    if (!isValidPin(pin)) return setError(t('auth.errBadPin'));
    setBusy(true); setError('');
    try { await login(p, pin); }
    catch (err) {
      const code = err instanceof ApiError ? err.code : '';
      setError(code === 'locked' ? t('auth.errLocked') : code === 'bad_login' ? t('auth.errLogin') : t('auth.errGeneric'));
    } finally { setBusy(false); }
  };

  return (
    <AppShell title={t('auth.loginTitle')}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="phone">{t('auth.phone')}</label>
          <input id="phone" className="field" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="6 77 12 34 56" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pin">{t('auth.pin')}</label>
          <input id="pin" className="field tracking-[0.5em]" type="password" inputMode="numeric"
            maxLength={6} autoComplete="current-password" value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        {error && <p role="alert" className="font-bold text-alarm">{error}</p>}
        <button className="btn-primary" disabled={busy}>{t('auth.login')}</button>
      </form>
      <p className="mt-8 text-center">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="font-bold text-forest underline">{t('auth.createAccount')}</Link>
      </p>
    </AppShell>
  );
}

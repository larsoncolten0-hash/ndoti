'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { homeFor, Splash } from '@/components/RequireRole';
import { useAuth } from '@/lib/auth';
import {
  BagIcon, CheckCircleIcon, GlobeIcon, KeyIcon, PinCheckIcon, ShieldCheckIcon, WifiOffIcon,
} from '@/components/icons';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Logged-in visitors go straight to their mode; everyone else sees the pitch below.
  useEffect(() => { if (!loading && user) router.replace(homeFor(user)); }, [loading, user, router]);
  if (loading || user) return <Splash />;

  return (
    <div className="min-h-full bg-white">
      <HomeHeader />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <Roles />
      <Features />
      <HomeFooter />
    </div>
  );
}

function HomeHeader() {
  const { t, i18n } = useTranslation();
  return (
    <header className="sticky top-0 z-10 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <img src="/icons/favicon.svg" alt="" className="h-9 w-9" />
        <span className="flex-1 truncate text-lg font-bold">{t('app.name')}</span>
        <button onClick={() => void i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
          className="rounded-lg px-3 py-2 text-sm font-bold text-ink/70 hover:text-ink">
          {t('app.language')}
        </button>
        <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-bold text-forest underline-offset-4 hover:underline">
          {t('auth.login')}
        </Link>
        <Link href="/register" className="hidden rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white sm:inline-block">
          {t('auth.createAccount')}
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #123B2E 0%, #0B2A20 100%)' }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <span className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-vest">{t('home.kicker')}</span>
          <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl">{t('home.tagline')}</h1>
          <p className="mb-7 text-lg text-white/80">{t('home.subtitle')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register?role=household" className="btn-vest !w-auto">{t('home.householdCta')}</Link>
            <Link href="/login" className="btn !w-auto border-2 border-white/40 text-white active:bg-white/10">{t('auth.login')}</Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
            <li className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-vest" />{t('home.badgeMomo')}</li>
            <li className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-vest" />{t('home.badgeOffline')}</li>
            <li className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-vest" />{t('home.badgeBilingual')}</li>
          </ul>
        </div>
        <img src="/images/hero.svg" alt="" className="mx-auto w-full max-w-md" />
      </div>
    </section>
  );
}

function TrustBar() {
  const { t } = useTranslation();
  const stats = [
    [t('home.stat1Value'), t('home.stat1Label')],
    [t('home.stat2Value'), t('home.stat2Label')],
    [t('home.stat3Value'), t('home.stat3Label')],
    [t('home.stat4Value'), t('home.stat4Label')],
  ];
  return (
    <section className="border-b border-ink/10 bg-mist">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="text-center">
            <div className="text-2xl font-bold text-forest sm:text-3xl">{value}</div>
            <div className="text-sm text-ink/70">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { Icon: BagIcon, title: t('home.how1Title'), body: t('home.how1') },
    { Icon: KeyIcon, title: t('home.how2Title'), body: t('home.how2') },
    { Icon: PinCheckIcon, title: t('home.how3Title'), body: t('home.how3') },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">{t('home.howTitle')}</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="relative rounded-2xl border-2 border-ink/10 p-6">
            <span className="absolute right-5 top-5 text-3xl font-bold text-ink/10">{i + 1}</span>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-forest text-white">
              <s.Icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
            <p className="text-ink/70">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Roles() {
  const { t } = useTranslation();
  return (
    <section className="bg-mist py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">{t('home.rolesTitle')}</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <RoleCard tone="vest" title={t('home.householdTitle')} body={t('home.householdBody')}
            points={[t('home.householdPoint1'), t('home.householdPoint2'), t('home.householdPoint3')]}
            cta={t('home.householdCta')} href="/register?role=household" />
          <RoleCard tone="forest" title={t('home.collectorTitle')} body={t('home.collectorBody')}
            points={[t('home.collectorPoint1'), t('home.collectorPoint2'), t('home.collectorPoint3')]}
            cta={t('home.collectorCta')} href="/register?role=collector" />
        </div>
      </div>
    </section>
  );
}

function RoleCard({ tone, title, body, points, cta, href }:
  { tone: 'vest' | 'forest'; title: string; body: string; points: string[]; cta: string; href: string }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-ink/5">
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mb-5 text-ink/70">{body}</p>
      <ul className="mb-6 flex-1 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <CheckCircleIcon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${tone === 'vest' ? 'text-vest' : 'text-forest'}`} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className={tone === 'vest' ? 'btn-vest' : 'btn-primary'}>{cta}</Link>
    </div>
  );
}

function Features() {
  const { t } = useTranslation();
  const items = [
    { Icon: WifiOffIcon, title: t('home.feature1Title'), body: t('home.feature1Body') },
    { Icon: GlobeIcon, title: t('home.feature2Title'), body: t('home.feature2Body') },
    { Icon: ShieldCheckIcon, title: t('home.feature3Title'), body: t('home.feature3Body') },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="mb-3 text-2xl font-bold sm:text-3xl">{t('home.featuresTitle')}</h2>
        <p className="text-ink/70">{t('home.featuresSubtitle')}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <div key={f.title} className="rounded-2xl border-2 border-ink/10 p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-leaf/10 text-leaf">
              <f.Icon className="h-6 w-6" />
            </div>
            <h3 className="mb-1 font-bold">{f.title}</h3>
            <p className="text-sm text-ink/70">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-ink/10 bg-forest text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/icons/favicon.svg" alt="" className="h-7 w-7" />
            <span className="font-bold">{t('app.name')}</span>
          </div>
          <div className="flex gap-5 text-sm font-bold">
            <Link href="/login" className="underline-offset-4 hover:underline">{t('auth.login')}</Link>
            <Link href="/register" className="underline-offset-4 hover:underline">{t('auth.createAccount')}</Link>
          </div>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} {t('app.name')} — {t('home.footerNote')}</p>
      </div>
    </footer>
  );
}

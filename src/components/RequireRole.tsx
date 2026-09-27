'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

export function homeFor(u: { role: Role; status: string } | null) {
  if (!u) return '/login';
  if (u.status === 'pending') return '/pending';
  if (u.status === 'suspended') return '/login';
  return { household: '/h', collector: '/c', admin: '/a' }[u.role];
}

/** Screen-level guard. Real protection is on the server: every API route checks the role. */
export default function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = !!user && user.role === role && user.status === 'active';

  useEffect(() => {
    if (!loading && !allowed) router.replace(homeFor(user));
  }, [loading, allowed, user, router]);

  return allowed ? <>{children}</> : <Splash />;
}

export function Splash() {
  return (
    <div className="flex h-full items-center justify-center bg-forest">
      <img src="/icons/favicon.svg" alt="Ndoti" className="h-20 w-20" />
    </div>
  );
}

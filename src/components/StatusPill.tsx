'use client';
import { useTranslation } from 'react-i18next';
import type { PickupStatus } from '@/lib/types';

const tone: Record<PickupStatus, string> = {
  requested: 'bg-mist text-ink',
  assigned: 'bg-vest text-ink',
  on_the_way: 'bg-vest text-ink',
  picked_up: 'bg-leaf text-white',
  dumped: 'bg-forest text-white',
  failed: 'bg-alarm text-white',
  cancelled: 'bg-mist text-ink/60',
};

export default function StatusPill({ status }: { status: PickupStatus }) {
  const { t } = useTranslation();
  return <span className={`rounded-full px-3 py-1 text-sm font-bold ${tone[status]}`}>{t(`status.${status}`)}</span>;
}

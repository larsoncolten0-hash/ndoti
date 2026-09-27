'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/AppShell';
import RequireRole from '@/components/RequireRole';
import { getCurrentLocation } from '@/lib/geo';
import { useApi } from '@/lib/hooks';
import { enqueue } from '@/lib/outbox';
import type { Pickup } from '@/lib/types';

export default function DumpPage() {
  return <RequireRole role="collector"><DumpCapture /></RequireRole>;
}

/**
 * Dump proof (C-11, Q-01): live camera only (no gallery), GPS attached.
 * The photo is saved on the phone first and uploaded by the outbox, so it
 * works without network. The server checks the distance to approved bacs.
 */
function DumpCapture() {
  const { t } = useTranslation();
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream>();
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; takenAt: string }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data } = useApi<{ pickups: Pickup[] }>('/api/pickups?view=mine', 60000);
  const count = (data?.pickups ?? []).filter((p) => p.status === 'picked_up' && !p.dumpId).length;

  useEffect(() => () => stream?.getTracks().forEach((tr) => tr.stop()), [stream]);
  useEffect(() => { if (stream && video.current) video.current.srcObject = stream; }, [stream]);

  const start = async () => {
    setError('');
    try {
      setPhoto(undefined);
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }));
    } catch { setError(t('dump.noCamera')); }
  };

  const take = () => {
    const v = video.current; if (!v) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (!b) return;
      setPhoto({ blob: b, url: URL.createObjectURL(b), takenAt: new Date().toISOString() });
      stream?.getTracks().forEach((tr) => tr.stop());
      setStream(undefined);
    }, 'image/jpeg', 0.85);
  };

  const save = async () => {
    if (!photo) return;
    setBusy(true);
    const location = await getCurrentLocation().catch(() => null);
    await enqueue({ kind: 'dump', photo: photo.blob, location, takenAt: photo.takenAt });
    router.replace('/c');
  };

  return (
    <AppShell title={t('dump.title')}>
      {data && count === 0 ? <p>{t('dump.nothing')}</p> : (
        <>
          <p className="mb-4">{t('dump.help')}</p>
          <p className="mb-4 font-bold">{t('collector.toDump', { count })}</p>
          {stream && <video ref={video} autoPlay playsInline muted className="mb-4 w-full rounded-xl bg-ink" />}
          {photo && <img src={photo.url} alt="" className="mb-4 w-full rounded-xl" />}
          {error && <p role="alert" className="mb-4 font-bold text-alarm">{error}</p>}
          <div className="space-y-3">
            {!stream && !photo && <button className="btn-vest" onClick={start}>{t('dump.start')}</button>}
            {stream && <button className="btn-vest" onClick={take}>{t('dump.take')}</button>}
            {photo && <button className="btn-primary" disabled={busy} onClick={save}>{t('dump.send')}</button>}
            {photo && <button className="btn-ghost" onClick={start}>{t('dump.retake')}</button>}
          </div>
        </>
      )}
    </AppShell>
  );
}

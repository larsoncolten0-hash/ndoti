'use client';
/**
 * Offline outbox for collectors (requirement N-05).
 * Actions and dump photos are saved on the phone (IndexedDB) and sent in order
 * when the network is available. The server treats every action as safe to replay.
 */
import { get, set } from 'idb-keyval';
import imageCompression from 'browser-image-compression';
import { api, ApiError } from './client';
import type { GeoPoint, PickupAction } from './types';

export type OutboxItem =
  | { id: string; kind: 'pickup_action'; pickupId: string; body: PickupAction; createdAt: number }
  | { id: string; kind: 'dump'; photo: Blob; location: GeoPoint | null; takenAt: string; createdAt: number };

type NewItem =
  | Omit<Extract<OutboxItem, { kind: 'pickup_action' }>, 'id' | 'createdAt'>
  | Omit<Extract<OutboxItem, { kind: 'dump' }>, 'id' | 'createdAt'>;

const KEY = 'ndoti-outbox-v1';
const listeners = new Set<() => void>();
let flushing: Promise<void> | null = null;

const notify = () => listeners.forEach((l) => l());
export const onOutboxChange = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export async function listOutbox(): Promise<OutboxItem[]> {
  return (await get<OutboxItem[]>(KEY)) ?? [];
}

export async function enqueue(item: NewItem) {
  const full = { ...item, id: crypto.randomUUID(), createdAt: Date.now() } as OutboxItem;
  await set(KEY, [...(await listOutbox()), full]);
  notify();
  void flushOutbox();
}

async function remove(id: string) {
  await set(KEY, (await listOutbox()).filter((i) => i.id !== id));
  notify();
}

async function sendDump(item: Extract<OutboxItem, { kind: 'dump' }>) {
  const sig = await api<{ cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string }>('/api/dumps/sign', {});
  const file = await imageCompression(new File([item.photo], 'dump.jpg', { type: 'image/jpeg' }),
    { maxSizeMB: 0.2, maxWidthOrHeight: 1280, useWebWorker: true });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('folder', sig.folder);
  form.append('signature', sig.signature);
  const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: form });
  if (!up.ok) throw new ApiError(up.status, 'upload_failed');
  const photo = await up.json() as { secure_url: string; public_id: string };
  await api('/api/dumps', { clientId: item.id, photoUrl: photo.secure_url, photoPublicId: photo.public_id,
    location: item.location, takenAt: item.takenAt });
}

/** Sends queued items in order. Stops at the first network failure and retries later. */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      for (const item of await listOutbox()) {
        if (!navigator.onLine) return;
        try {
          if (item.kind === 'dump') await sendDump(item);
          else await api(`/api/pickups/${item.pickupId}`, item.body);
          await remove(item.id);
        } catch (e) {
          // The server refused it (e.g. pickup cancelled meanwhile): drop it, it will never succeed.
          if (e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 408, 429].includes(e.status)) {
            await remove(item.id);
            window.dispatchEvent(new CustomEvent('ndoti:outbox-rejected', { detail: { item, code: e.code } }));
            continue;
          }
          return; // network or server error: keep the item and try again later
        }
      }
    } finally {
      flushing = null;
      window.dispatchEvent(new Event('ndoti:outbox-flushed'));
    }
  })();
  return flushing;
}

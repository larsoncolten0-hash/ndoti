'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './client';
import { listOutbox, onOutboxChange, type OutboxItem } from './outbox';

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

/**
 * Loads an API URL and keeps it fresh: every `intervalMs`, when the app comes
 * back into view, when the network returns and after the outbox syncs.
 * Offline, the service worker answers with the last saved response.
 */
export function useApi<T>(url: string | null, intervalMs = 20000) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    if (!url) return;
    try { setData(await api<T>(url)); setError(undefined); }
    catch (e) { setError(e instanceof Error ? e.message : 'error'); }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    void reload();
    const t = setInterval(reload, intervalMs);
    const onVisible = () => { if (document.visibilityState === 'visible') void reload(); };
    window.addEventListener('online', reload);
    window.addEventListener('ndoti:outbox-flushed', reload);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', reload);
      window.removeEventListener('ndoti:outbox-flushed', reload);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [url, intervalMs, reload]);

  return { data, error, reload };
}

export function useOutbox() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  useEffect(() => {
    const load = () => { void listOutbox().then(setItems); };
    load();
    return onOutboxChange(load);
  }, []);
  return items;
}

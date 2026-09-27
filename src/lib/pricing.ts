import type { Volume } from './types';

// Pilot defaults in FCFA. The server is the source of truth: prices sent by
// phones are ignored. Next step: a `config` collection editable by admins (M-02).
export const PRICES: Record<Volume, number> = {
  small_bag: 200,
  big_sack: 400,
  bucket: 300,
  multiple: 700,
};

export const COLLECTOR_SHARE = 0.8; // one-time pickups (M-03)
export const DUMP_RADIUS_M = 100;   // L-09
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_PICKUPS_PER_DUMP = 15; // Q-02

export const formatFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

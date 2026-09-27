// Shared between server and browser. IDs are strings in API responses.

export type Role = 'household' | 'collector' | 'admin';
export type Lang = 'fr' | 'en';
export type UserStatus = 'active' | 'pending' | 'suspended';
export type Transport = 'foot' | 'pushcart' | 'tricycle';

export interface GeoPoint { lat: number; lng: number; accuracy?: number }

export interface AppUser {
  id: string;
  role: Role;
  status: UserStatus;
  name: string;
  phone: string;          // +2376XXXXXXXX
  lang: Lang;
  zoneId?: string;
  zoneIds?: string[];     // collector: assigned zones
  landmark?: string;
  location?: GeoPoint;
  gateCode?: string;      // ND-B-017
  routeOrder?: number;
  transport?: Transport;
  cniNumber?: string;
  momoNumber?: string;
  createdAt: string;
}

export type Volume = 'small_bag' | 'big_sack' | 'bucket' | 'multiple';

export type PickupStatus =
  | 'requested' | 'assigned' | 'on_the_way' | 'picked_up' | 'failed' | 'dumped' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'to_verify' | 'confirmed' | 'refunded';

export interface Pickup {
  id: string;
  householdId: string;
  householdName: string;
  householdPhone: string;
  gateCode?: string;
  zoneId: string;
  landmark: string;
  location?: GeoPoint;
  volume: Volume;
  when: 'now' | 'scheduled';
  price: number;              // FCFA, set by the server
  status: PickupStatus;
  code?: string;              // 4-digit confirmation code: only ever sent to the household
  codeAttempts?: number;
  collectorId?: string;
  collectorName?: string;
  failReason?: string;
  dumpId?: string;
  dumpRejected?: boolean;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  source: 'one_time' | 'subscription';
  createdAt: string;
  updatedAt?: string;
}

export interface Zone { id: string; name: string; boundaries: string }

export interface Dump {
  id: string;
  collectorId: string;
  collectorName: string;
  pickupIds: string[];
  photoUrl: string;
  location?: GeoPoint;
  nearestDumpPointId?: string;
  distanceMeters?: number;
  review: 'auto_approved' | 'needs_review' | 'approved' | 'rejected';
  createdAt: string;
}

/** Actions a user can take on a pickup (POST /api/pickups/:id). */
export type PickupAction =
  | { action: 'cancel' }
  | { action: 'pay'; paymentRef: string }
  | { action: 'accept' }
  | { action: 'on_the_way' }
  | { action: 'submit_code'; code: string }
  | { action: 'fail'; reason: 'nobody_home' | 'no_trash' | 'wrong_address' | 'refused' };

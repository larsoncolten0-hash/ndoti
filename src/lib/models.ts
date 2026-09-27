import 'server-only';
import type { ObjectId, WithId } from 'mongodb';
import type { AppUser, Dump, Pickup, Role } from './types';

// Shapes stored in MongoDB.
export interface UserDoc extends Omit<AppUser, 'id' | 'createdAt'> {
  pinHash: string;
  pinFailures?: number;
  lockedUntil?: Date;
  createdAt: Date;
}
export interface PickupDoc extends Omit<Pickup, 'id' | 'householdId' | 'collectorId' | 'dumpId' | 'createdAt' | 'updatedAt'> {
  householdId: ObjectId;
  collectorId?: ObjectId;
  dumpId?: ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  pickedUpAt?: Date;
  dumpedAt?: Date;
}
export interface DumpDoc extends Omit<Dump, 'id' | 'collectorId' | 'pickupIds' | 'createdAt'> {
  collectorId: ObjectId;
  pickupIds: ObjectId[];
  photoPublicId: string;
  createdAt: Date;
}
export interface ZoneDoc { _id: string; name: string; boundaries: string; nextHouseNumber: number }
export interface DumpPointDoc { _id: ObjectId; name: string; location: { lat: number; lng: number } }

// Converters to the API shape. Secrets never leave the server.
export function toUser(u: WithId<UserDoc>): AppUser {
  const { _id, pinHash: _p, pinFailures: _f, lockedUntil: _l, createdAt, ...rest } = u;
  return { ...rest, id: _id.toString(), createdAt: createdAt.toISOString() };
}

export function toPickup(p: WithId<PickupDoc>, viewer: { id: string; role: Role }): Pickup {
  const { _id, householdId, collectorId, dumpId, createdAt, updatedAt, pickedUpAt: _a, dumpedAt: _b, code, ...rest } = p;
  const isOwner = viewer.role === 'household' && householdId.toString() === viewer.id;
  return {
    ...rest,
    id: _id.toString(),
    householdId: householdId.toString(),
    collectorId: collectorId?.toString(),
    dumpId: dumpId?.toString(),
    // The confirmation code is only shown to the household, and only while it is useful.
    code: isOwner && ['requested', 'assigned', 'on_the_way'].includes(p.status) ? code : undefined,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  };
}

export function toDump(d: WithId<DumpDoc>): Dump {
  const { _id, collectorId, pickupIds, photoPublicId: _p, createdAt, ...rest } = d;
  return { ...rest, id: _id.toString(), collectorId: collectorId.toString(), pickupIds: pickupIds.map(String), createdAt: createdAt.toISOString() };
}

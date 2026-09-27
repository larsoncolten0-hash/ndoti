import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { route, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { isOurPhoto } from '@/lib/cloudinary';
import { distanceMeters } from '@/lib/geo';
import { DUMP_RADIUS_M, MAX_PICKUPS_PER_DUMP } from '@/lib/pricing';
import { toDump, type DumpDoc, type DumpPointDoc, type PickupDoc } from '@/lib/models';

const Body = z.object({
  clientId: z.string().min(8).max(64), // lets a queued dump be resent without creating duplicates
  photoUrl: z.string().url(),
  photoPublicId: z.string(),
  location: z.object({ lat: z.number(), lng: z.number(), accuracy: z.number().optional() }).nullable(),
  takenAt: z.string().datetime(),
});

/** Dump proof (C-11, L-09, Q-01, Q-02): covers the collector's picked-up pickups not yet dumped. */
export const POST = route(async (req) => {
  const u = await requireUser('collector');
  const b = Body.parse(await req.json());
  const folder = `ndoti/dumps/${u._id.toString()}`;
  if (!isOurPhoto(b.photoUrl, folder)) throw new HttpError(400, 'bad_photo');

  const db = await getDb();
  const dumps = db.collection<DumpDoc & { clientId: string }>('dumps');
  const existing = await dumps.findOne({ collectorId: u._id, clientId: b.clientId });
  if (existing) return { dump: toDump(existing) };

  const pickups = db.collection<PickupDoc>('pickups');
  const covered = await pickups
    .find({ collectorId: u._id, status: 'picked_up', dumpId: { $exists: false } })
    .sort({ pickedUpAt: 1 }).limit(MAX_PICKUPS_PER_DUMP * 2).project<{ _id: ObjectId }>({ _id: 1 }).toArray();
  if (covered.length === 0) throw new HttpError(409, 'nothing_to_dump');

  let nearest: { id: ObjectId; dist: number } | null = null;
  if (b.location) {
    for (const p of await db.collection<DumpPointDoc>('dumpPoints').find().toArray()) {
      const dist = distanceMeters(b.location, p.location);
      if (!nearest || dist < nearest.dist) nearest = { id: p._id, dist };
    }
  }
  const auto = !!nearest && nearest.dist <= DUMP_RADIUS_M;

  const doc: DumpDoc & { clientId: string; takenAt: Date } = {
    clientId: b.clientId,
    collectorId: u._id,
    collectorName: u.name,
    pickupIds: covered.map((c) => c._id),
    photoUrl: b.photoUrl,
    photoPublicId: b.photoPublicId,
    location: b.location ?? undefined,
    nearestDumpPointId: nearest?.id.toString(),
    distanceMeters: nearest ? Math.round(nearest.dist) : undefined,
    review: auto ? 'auto_approved' : 'needs_review',
    takenAt: new Date(b.takenAt),
    createdAt: new Date(),
  };
  const { insertedId } = await dumps.insertOne(doc);

  const now = new Date();
  await pickups.updateMany({ _id: { $in: doc.pickupIds } }, auto
    ? { $set: { dumpId: insertedId, status: 'dumped', dumpedAt: now, updatedAt: now } }
    : { $set: { dumpId: insertedId, updatedAt: now } });

  return { dump: toDump({ ...doc, _id: insertedId }) };
});

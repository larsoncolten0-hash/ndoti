import { randomInt } from 'node:crypto';
import { z } from 'zod';
import type { Filter } from 'mongodb';
import { getDb } from '@/lib/db';
import { route, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { PRICES } from '@/lib/pricing';
import { toPickup, type PickupDoc } from '@/lib/models';

export const GET = route(async (req) => {
  const u = await requireUser();
  const view = new URL(req.url).searchParams.get('view');
  const col = (await getDb()).collection<PickupDoc>('pickups');
  const viewer = { id: u._id.toString(), role: u.role };

  let filter: Filter<PickupDoc>;
  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  let limit = 30;

  if (u.role === 'household') {
    filter = { householdId: u._id }; limit = 20;
  } else if (u.role === 'collector') {
    if (view === 'open') {
      filter = { zoneId: { $in: u.zoneIds ?? [] }, status: 'requested' }; sort = { createdAt: 1 };
    } else {
      filter = { collectorId: u._id }; limit = 60;
    }
  } else {
    filter = {};
  }

  const rows = await col.find(filter).sort(sort).limit(limit).toArray();
  return { pickups: rows.map((p) => toPickup(p, viewer)) };
});

const Create = z.object({
  volume: z.enum(['small_bag', 'big_sack', 'bucket', 'multiple']),
  when: z.enum(['now', 'scheduled']),
});

export const POST = route(async (req) => {
  const u = await requireUser('household');
  const b = Create.parse(await req.json());
  if (!u.zoneId) throw new HttpError(400, 'no_zone');

  const doc: PickupDoc = {
    householdId: u._id,
    householdName: u.name,
    householdPhone: u.phone,
    gateCode: u.gateCode,
    zoneId: u.zoneId,
    landmark: u.landmark ?? '',
    location: u.location,
    volume: b.volume,
    when: b.when,
    price: PRICES[b.volume],                       // server decides the price (H-08)
    code: String(randomInt(0, 10000)).padStart(4, '0'), // private confirmation code (H-10)
    codeAttempts: 0,
    status: 'requested',
    paymentStatus: 'unpaid',
    source: 'one_time',
    createdAt: new Date(),
  };
  const { insertedId } = await (await getDb()).collection<PickupDoc>('pickups').insertOne(doc);
  return { pickup: toPickup({ ...doc, _id: insertedId }, { id: u._id.toString(), role: u.role }) };
});

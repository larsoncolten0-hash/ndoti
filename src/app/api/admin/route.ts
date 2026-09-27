import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { route, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { toDump, toPickup, toUser, type DumpDoc, type PickupDoc, type UserDoc } from '@/lib/models';

/** Everything the admin dashboard needs in one request. */
export const GET = route(async () => {
  const u = await requireUser('admin');
  const db = await getDb();
  const viewer = { id: u._id.toString(), role: u.role };
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  const [collectors, payments, dumps, recent, todayCounts] = await Promise.all([
    db.collection<UserDoc>('users').find({ role: 'collector', status: 'pending' }).limit(50).toArray(),
    db.collection<PickupDoc>('pickups').find({ paymentStatus: 'to_verify' }).limit(50).toArray(),
    db.collection<DumpDoc>('dumps').find({ review: 'needs_review' }).sort({ createdAt: 1 }).limit(20).toArray(),
    db.collection<PickupDoc>('pickups').find().sort({ createdAt: -1 }).limit(30).toArray(),
    db.collection<PickupDoc>('pickups').aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: startOfDay } } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]).toArray(),
  ]);

  const today = Object.fromEntries(todayCounts.map((c) => [c._id, c.n]));
  return {
    pendingCollectors: collectors.map(toUser),
    payments: payments.map((p) => toPickup(p, viewer)),
    dumps: dumps.map(toDump),
    recent: recent.map((p) => toPickup(p, viewer)),
    today: {
      total: Object.values(today).reduce((a, b) => a + b, 0),
      collected: (today.picked_up ?? 0) + (today.dumped ?? 0),
      failed: today.failed ?? 0,
    },
  };
});

const Action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('approve_collector'), id: z.string() }),
  z.object({ type: z.literal('payment'), id: z.string(), decision: z.enum(['confirm', 'reject']) }),
  z.object({ type: z.literal('dump'), id: z.string(), decision: z.enum(['approved', 'rejected']) }),
]);

export const POST = route(async (req) => {
  await requireUser('admin');
  const a = Action.parse(await req.json());
  if (!ObjectId.isValid(a.id)) throw new HttpError(404, 'not_found');
  const _id = new ObjectId(a.id);
  const db = await getDb();
  const now = new Date();

  if (a.type === 'approve_collector') {
    await db.collection<UserDoc>('users').updateOne({ _id, role: 'collector' }, { $set: { status: 'active' } });
  } else if (a.type === 'payment') {
    await db.collection<PickupDoc>('pickups').updateOne({ _id, paymentStatus: 'to_verify' },
      { $set: { paymentStatus: a.decision === 'confirm' ? 'confirmed' : 'unpaid', updatedAt: now } });
  } else {
    // Approve releases the collector's second half; reject withholds it (Q-03, Q-04).
    const d = await db.collection<DumpDoc>('dumps').findOneAndUpdate(
      { _id, review: 'needs_review' }, { $set: { review: a.decision } }, { returnDocument: 'after' });
    if (!d) throw new HttpError(409, 'already_reviewed');
    await db.collection<PickupDoc>('pickups').updateMany({ _id: { $in: d.pickupIds } }, a.decision === 'approved'
      ? { $set: { status: 'dumped', dumpedAt: now, updatedAt: now } }
      : { $set: { dumpRejected: true, updatedAt: now } });
  }
});

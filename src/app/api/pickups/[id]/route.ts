import { z } from 'zod';
import { ObjectId, type Filter, type UpdateFilter } from 'mongodb';
import { getDb } from '@/lib/db';
import { route, HttpError } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { MAX_CODE_ATTEMPTS } from '@/lib/pricing';
import { toPickup, type PickupDoc } from '@/lib/models';

const Action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('pay'), paymentRef: z.string().trim().min(3).max(60) }),
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('on_the_way') }),
  z.object({ action: z.literal('submit_code'), code: z.string().regex(/^\d{4}$/) }),
  z.object({ action: z.literal('fail'), reason: z.enum(['nobody_home', 'no_trash', 'wrong_address', 'refused']) }),
]);

/**
 * Every change to a pickup goes through here. Each action is a single atomic
 * update whose filter encodes who may do it and from which status, so two
 * collectors can never accept the same pickup. Actions are also safe to replay
 * (collectors' phones resend queued actions after being offline).
 */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const u = await requireUser('household', 'collector');
  const { id } = await params;
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'not_found');
  const _id = new ObjectId(id);
  const a = Action.parse(await req.json());
  const col = (await getDb()).collection<PickupDoc>('pickups');
  const now = new Date();
  const viewer = { id: u._id.toString(), role: u.role };
  const mineAsHousehold = { _id, householdId: u._id };
  const mineAsCollector = { _id, collectorId: u._id };

  let filter: Filter<PickupDoc>;
  let update: UpdateFilter<PickupDoc>;
  let alreadyDone: (p: PickupDoc) => boolean;

  if (u.role === 'household') {
    if (a.action === 'cancel') {
      filter = { ...mineAsHousehold, status: 'requested' };
      update = { $set: { status: 'cancelled', updatedAt: now } };
      alreadyDone = (p) => p.status === 'cancelled';
    } else if (a.action === 'pay') {
      filter = { ...mineAsHousehold, paymentStatus: 'unpaid', status: { $ne: 'cancelled' } };
      update = { $set: { paymentStatus: 'to_verify', paymentRef: a.paymentRef, updatedAt: now } };
      alreadyDone = (p) => p.paymentStatus !== 'unpaid';
    } else throw new HttpError(403, 'forbidden');
  } else {
    switch (a.action) {
      case 'accept':
        filter = { _id, status: 'requested', zoneId: { $in: u.zoneIds ?? [] } };
        update = { $set: { status: 'assigned', collectorId: u._id, collectorName: u.name, updatedAt: now } };
        alreadyDone = (p) => p.collectorId?.equals(u._id) ?? false;
        break;
      case 'on_the_way':
        filter = { ...mineAsCollector, status: 'assigned' };
        update = { $set: { status: 'on_the_way', updatedAt: now } };
        alreadyDone = (p) => p.status !== 'assigned';
        break;
      case 'fail':
        filter = { ...mineAsCollector, status: { $in: ['assigned', 'on_the_way'] } };
        update = { $set: { status: 'failed', failReason: a.reason, updatedAt: now } };
        alreadyDone = (p) => p.status === 'failed';
        break;
      case 'submit_code': {
        const p = await col.findOne({ ...mineAsCollector, status: { $in: ['assigned', 'on_the_way'] } });
        if (!p) {
          const cur = await col.findOne(mineAsCollector);
          if (cur && ['picked_up', 'dumped'].includes(cur.status)) return { pickup: toPickup(cur, viewer), result: 'ok' };
          throw new HttpError(409, 'wrong_status');
        }
        if (p.code === a.code) {
          const r = await col.findOneAndUpdate({ _id }, { $set: { status: 'picked_up', pickedUpAt: now, updatedAt: now } }, { returnDocument: 'after' });
          return { pickup: toPickup(r!, viewer), result: 'ok' };
        }
        const attempts = (p.codeAttempts ?? 0) + 1;
        const r = await col.findOneAndUpdate({ _id }, {
          $set: attempts >= MAX_CODE_ATTEMPTS
            ? { codeAttempts: attempts, status: 'failed', failReason: 'too_many_code_attempts', updatedAt: now }
            : { codeAttempts: attempts, updatedAt: now },
        }, { returnDocument: 'after' });
        return { pickup: toPickup(r!, viewer), result: 'wrong_code' };
      }
      default:
        throw new HttpError(403, 'forbidden');
    }
  }

  const r = await col.findOneAndUpdate(filter, update, { returnDocument: 'after' });
  if (r) return { pickup: toPickup(r, viewer) };

  // Nothing matched: either it was already done (replayed action) or it's not allowed.
  const cur = await col.findOne({ _id });
  if (!cur) throw new HttpError(404, 'not_found');
  const owns = u.role === 'household' ? cur.householdId.equals(u._id) : (cur.collectorId?.equals(u._id) ?? false);
  if (owns && alreadyDone(cur)) return { pickup: toPickup(cur, viewer) };
  throw new HttpError(409, a.action === 'accept' ? 'already_taken' : 'wrong_status');
});

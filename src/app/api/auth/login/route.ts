import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { route, HttpError } from '@/lib/api';
import { createSession } from '@/lib/session';
import { normalizePhone } from '@/lib/phone';
import { toUser, type UserDoc } from '@/lib/models';

const Body = z.object({ phone: z.string(), pin: z.string() });
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export const POST = route(async (req) => {
  const b = Body.parse(await req.json());
  const phone = normalizePhone(b.phone);
  if (!phone) throw new HttpError(400, 'bad_phone');

  const users = (await getDb()).collection<UserDoc>('users');
  const u = await users.findOne({ phone });
  if (!u) throw new HttpError(401, 'bad_login');

  // A 6-digit PIN is short, so lock the account after repeated wrong PINs.
  if (u.lockedUntil && u.lockedUntil > new Date()) throw new HttpError(429, 'locked');

  if (!(await bcrypt.compare(b.pin, u.pinHash))) {
    const failures = (u.pinFailures ?? 0) + 1;
    await users.updateOne({ _id: u._id }, failures >= MAX_FAILURES
      ? { $set: { pinFailures: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } }
      : { $set: { pinFailures: failures } });
    throw new HttpError(401, 'bad_login');
  }
  if (u.status === 'suspended') throw new HttpError(403, 'suspended');

  await users.updateOne({ _id: u._id }, { $unset: { pinFailures: '', lockedUntil: '' } });
  await createSession(u._id.toString());
  return { user: toUser(u) };
});

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { route, HttpError } from '@/lib/api';
import { createSession } from '@/lib/session';
import { normalizePhone } from '@/lib/phone';
import { toUser, type UserDoc, type ZoneDoc } from '@/lib/models';

const geo = z.object({ lat: z.number(), lng: z.number(), accuracy: z.number().optional() });
const Body = z.object({
  role: z.enum(['household', 'collector']),
  name: z.string().trim().min(2).max(80),
  phone: z.string(),
  pin: z.string().regex(/^\d{6}$/),
  lang: z.enum(['fr', 'en']),
  zoneId: z.string().min(1).max(10),
  landmark: z.string().trim().max(300).optional(),
  location: geo.optional(),
  transport: z.enum(['foot', 'pushcart', 'tricycle']).optional(),
  cniNumber: z.string().trim().max(40).optional(),
  momoNumber: z.string().optional(),
});

export const POST = route(async (req) => {
  const b = Body.parse(await req.json());
  const phone = normalizePhone(b.phone);
  if (!phone) throw new HttpError(400, 'bad_phone');

  const db = await getDb();
  const users = db.collection<UserDoc>('users');
  if (await users.findOne({ phone })) throw new HttpError(409, 'phone_exists');

  const zones = db.collection<ZoneDoc>('zones');
  if (!(await zones.findOne({ _id: b.zoneId }))) throw new HttpError(400, 'bad_zone');

  const base = {
    role: b.role, name: b.name, phone, lang: b.lang, zoneId: b.zoneId,
    pinHash: await bcrypt.hash(b.pin, 10), createdAt: new Date(),
  };

  let doc: UserDoc;
  if (b.role === 'household') {
    // Next gate code in the zone, e.g. ND-B-017 (L-02, H-03). Atomic counter.
    const zone = await zones.findOneAndUpdate({ _id: b.zoneId }, { $inc: { nextHouseNumber: 1 } }, { returnDocument: 'before' });
    const n = zone?.nextHouseNumber ?? 1;
    doc = { ...base, status: 'active', landmark: b.landmark, location: b.location,
      gateCode: `ND-${b.zoneId}-${String(n).padStart(3, '0')}`, routeOrder: n };
  } else {
    // Collectors wait for admin verification (C-02).
    doc = { ...base, status: 'pending', zoneIds: [b.zoneId], transport: b.transport ?? 'pushcart',
      cniNumber: b.cniNumber, momoNumber: normalizePhone(b.momoNumber ?? '') ?? phone };
  }

  const { insertedId } = await users.insertOne(doc);
  await createSession(insertedId.toString());
  return { user: toUser({ ...doc, _id: insertedId }) };
});

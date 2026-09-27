import { z } from 'zod';
import { getDb } from '@/lib/db';
import { route, HttpError } from '@/lib/api';
import { currentUser } from '@/lib/session';
import { toUser, type UserDoc } from '@/lib/models';

// Pending collectors can still load their profile (to see the "under review" screen).
export const GET = route(async () => {
  const u = await currentUser();
  return { user: u ? toUser(u) : null };
});

const Patch = z.object({
  lang: z.enum(['fr', 'en']).optional(),
  landmark: z.string().trim().max(300).optional(),
  location: z.object({ lat: z.number(), lng: z.number(), accuracy: z.number().optional() }).optional(),
});

export const PATCH = route(async (req) => {
  const u = await currentUser();
  if (!u) throw new HttpError(401, 'not_logged_in');
  const p = Patch.parse(await req.json());
  await (await getDb()).collection<UserDoc>('users').updateOne({ _id: u._id }, { $set: p });
});

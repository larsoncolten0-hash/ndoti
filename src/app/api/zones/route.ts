import { getDb } from '@/lib/db';
import { route } from '@/lib/api';
import type { ZoneDoc } from '@/lib/models';

// Public: the sign-up form needs the list before the user has an account.
export const GET = route(async () => {
  const zones = await (await getDb()).collection<ZoneDoc>('zones').find().sort({ _id: 1 }).toArray();
  return { zones: zones.map((z) => ({ id: z._id, name: z.name, boundaries: z.boundaries })) };
});

/**
 * One-time database setup: indexes, a first zone, a dump point and your admin account.
 *   npm run setup-db -- --admin-phone 677123456 --admin-pin 123456 --admin-name "Your Name"
 * Safe to run again: existing data is kept.
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'node:fs';

// Load .env.local without extra packages.
for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const client = await new MongoClient(process.env.MONGODB_URI, { family: 4 }).connect();
const db = client.db(process.env.MONGODB_DB ?? 'ndoti');

await db.collection('users').createIndex({ phone: 1 }, { unique: true });
await db.collection('users').createIndex({ role: 1, status: 1 });
await db.collection('pickups').createIndex({ householdId: 1, createdAt: -1 });
await db.collection('pickups').createIndex({ collectorId: 1, createdAt: -1 });
await db.collection('pickups').createIndex({ zoneId: 1, status: 1, createdAt: 1 });
await db.collection('pickups').createIndex({ collectorId: 1, status: 1 });
await db.collection('pickups').createIndex({ paymentStatus: 1 });
await db.collection('dumps').createIndex({ review: 1, createdAt: 1 });
await db.collection('dumps').createIndex({ collectorId: 1, clientId: 1 }, { unique: true });
console.log('✓ indexes');

// Example zone and dump point: edit these to match your pilot quartier.
await db.collection('zones').updateOne({ _id: 'A' },
  { $setOnInsert: { name: 'Zone A', boundaries: 'Décrivez les limites avec des repères', nextHouseNumber: 1 } }, { upsert: true });
if (!(await db.collection('dumpPoints').countDocuments())) {
  await db.collection('dumpPoints').insertOne({ name: 'Bac HYSACAM (à modifier)', location: { lat: 3.8667, lng: 11.5167 } });
}
console.log('✓ zone A and example dump point');

const phoneArg = arg('admin-phone'), pin = arg('admin-pin');
if (phoneArg && pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits');
  const digits = phoneArg.replace(/\D/g, '').replace(/^237/, '');
  const phone = '+237' + digits;
  await db.collection('users').updateOne({ phone }, {
    $set: { role: 'admin', status: 'active', pinHash: await bcrypt.hash(pin, 10) },
    $setOnInsert: { name: arg('admin-name') ?? 'Admin', phone, lang: 'fr', createdAt: new Date() },
  }, { upsert: true });
  console.log(`✓ admin ${phone}`);
}
await client.close();

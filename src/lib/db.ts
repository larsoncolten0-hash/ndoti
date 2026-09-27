import 'server-only';
import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'ndoti';

// Reuse one connection across hot reloads in dev and across requests in prod.
const g = globalThis as unknown as { _mongo?: Promise<MongoClient> };

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI is not set');
  // family: 4 works around IPv6 paths that some networks TLS-fail against Atlas's SRV-resolved hosts.
  g._mongo ??= new MongoClient(uri, { maxPoolSize: 10, family: 4 }).connect();
  return (await g._mongo).db(dbName);
}

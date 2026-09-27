import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { ObjectId, type WithId } from 'mongodb';
import { getDb } from './db';
import { HttpError } from './api';
import type { Role } from './types';
import type { UserDoc } from './models';

const COOKIE = 'ndoti_session';
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days: collectors should not have to log in every week

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<WithId<UserDoc> | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !ObjectId.isValid(payload.sub)) return null;
    const db = await getDb();
    return db.collection<UserDoc>('users').findOne({ _id: new ObjectId(payload.sub) });
  } catch {
    return null;
  }
}

/** Throws 401/403 unless the caller is logged in, active, and has one of the roles. */
export async function requireUser(...roles: Role[]) {
  const u = await currentUser();
  if (!u) throw new HttpError(401, 'not_logged_in');
  if (u.status !== 'active') throw new HttpError(403, 'account_not_active');
  if (roles.length && !roles.includes(u.role)) throw new HttpError(403, 'forbidden');
  return u;
}

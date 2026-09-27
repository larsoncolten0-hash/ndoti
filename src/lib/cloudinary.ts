import 'server-only';
import { createHash } from 'node:crypto';

/**
 * Signed direct upload: the phone uploads the photo straight to Cloudinary,
 * so photos never pass through (or slow down) our small server.
 */
export function signUpload(folder: string) {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !key || !secret) throw new Error('Cloudinary env vars are not set');
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(params + secret).digest('hex');
  return { cloudName: cloud, apiKey: key, timestamp, folder, signature };
}

/** Only accept photo URLs from our own Cloudinary account and folder. */
export function isOurPhoto(url: string, folder: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`) && url.includes(`/${folder}/`);
}

import { route } from '@/lib/api';
import { requireUser } from '@/lib/session';
import { signUpload } from '@/lib/cloudinary';

// Short-lived signature so the phone can upload one dump photo directly to Cloudinary.
export const POST = route(async () => {
  const u = await requireUser('collector');
  return signUpload(`ndoti/dumps/${u._id.toString()}`);
});

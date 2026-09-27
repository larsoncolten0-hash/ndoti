import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response | unknown>;

/** Wraps a route handler: JSON responses, consistent error format. */
export function route<C = unknown>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      const out = await fn(req, ctx);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: 'invalid_input', issues: e.issues }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  };
}

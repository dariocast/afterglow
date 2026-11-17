import type { Context, MiddlewareHandler } from 'hono';
import {
  setSignedCookie,
  getSignedCookie,
  deleteCookie,
  generateSignedCookie,
} from 'hono/cookie';
import { db, users, type User } from '../db';
import { eq } from 'drizzle-orm';

declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
  }
}

export const SESSION_COOKIE_NAME = 'afterglow_session';

export function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    'afterglow-secret-key-development-only-32bytes-min'
  );
}

export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax' as const,
  maxAge: 30 * 24 * 60 * 60, // 30 days
};

export async function setSession(c: Context, userId: string): Promise<void> {
  await setSignedCookie(
    c,
    SESSION_COOKIE_NAME,
    userId,
    getSessionSecret(),
    SESSION_COOKIE_OPTIONS
  );
}

export async function getSessionUserId(c: Context): Promise<string | null> {
  const cookieVal = await getSignedCookie(
    c,
    getSessionSecret(),
    SESSION_COOKIE_NAME
  );
  if (typeof cookieVal === 'string' && cookieVal.length > 0) {
    return cookieVal;
  }
  return null;
}

export async function getSessionUser(c: Context): Promise<User | null> {
  const userId = await getSessionUserId(c);
  if (!userId) return null;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}

export function clearSession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: SESSION_COOKIE_OPTIONS.path,
    secure: SESSION_COOKIE_OPTIONS.secure,
  });
}

export async function createSessionCookie(userId: string): Promise<string> {
  return await generateSignedCookie(
    SESSION_COOKIE_NAME,
    userId,
    getSessionSecret(),
    SESSION_COOKIE_OPTIONS
  );
}

export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  const user = await getSessionUser(c);
  c.set('user', user);
  await next();
};

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = c.get('user') ?? (await getSessionUser(c));
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('user', user);
  await next();
};

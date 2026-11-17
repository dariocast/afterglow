import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, users, credentials } from '../db';
import {
  createRegistrationOptions,
  createAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  getAndConsumeChallenge,
  extractChallenge,
  getExpectedOrigin,
  getRpId,
  isoBase64URL,
} from '../auth/passkeys';
import {
  setSession,
  getSessionUser,
  clearSession,
} from '../auth/session';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

export const authRouter = new Hono();

// POST /api/auth/register-options
authRouter.post('/register-options', async (c) => {
  let body: { username?: string; displayName?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const username = body.username?.trim();
  if (!username) {
    return c.json({ error: 'Username is required' }, 400);
  }

  const displayName = body.displayName?.trim() || username;

  // Check if user already exists
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  let userId: string;
  let existingCreds: typeof credentials.$inferSelect[] = [];

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
    existingCreds = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, userId));
  } else {
    userId = crypto.randomUUID();
  }

  const options = await createRegistrationOptions({
    userId,
    username,
    displayName,
    existingCredentials: existingCreds,
  });

  return c.json(options);
});

// POST /api/auth/register-verify
authRouter.post('/register-verify', async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const response: RegistrationResponseJSON = body.response ?? body;
  const challenge = body.challenge || extractChallenge(response);

  if (!challenge) {
    return c.json({ error: 'Missing challenge' }, 400);
  }

  const stored = getAndConsumeChallenge(challenge);
  if (!stored || stored.type !== 'registration') {
    return c.json({ error: 'Invalid or expired challenge' }, 400);
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: getExpectedOrigin(c.req.header('origin')),
      expectedRPID: getRpId(),
      requireUserVerification: false,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Verification failed' }, 400);
  }

  if (!verification.verified || !verification.registrationInfo) {
    return c.json({ error: 'Registration verification failed' }, 400);
  }

  const { credential } = verification.registrationInfo;
  const finalUsername = stored.username!;
  const finalDisplayName = stored.displayName || finalUsername;

  // Ensure user exists
  let userId = stored.userId!;
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, finalUsername))
    .limit(1);

  if (existingUser.length > 0) {
    userId = existingUser[0].id;
  } else {
    await db.insert(users).values({
      id: userId,
      username: finalUsername,
      displayName: finalDisplayName,
      createdAt: new Date(),
    });
  }

  // Insert credential
  await db.insert(credentials).values({
    id: credential.id,
    userId,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ? JSON.stringify(credential.transports) : null,
    createdAt: new Date(),
  });

  // Fetch final user record
  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  await setSession(c, userId);

  return c.json({ verified: true, user: userRecord });
});

// POST /api/auth/login-options
authRouter.post('/login-options', async (c) => {
  let body: { username?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    // Optional body
  }

  const username = body?.username?.trim();
  let userCreds: typeof credentials.$inferSelect[] = [];
  let userId: string | undefined;

  if (username) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (user) {
      userId = user.id;
      userCreds = await db
        .select()
        .from(credentials)
        .where(eq(credentials.userId, user.id));
    }
  }

  const options = await createAuthenticationOptions({
    userCredentials: userCreds.length > 0 ? userCreds : undefined,
    username,
    userId,
  });

  return c.json(options);
});

// POST /api/auth/login-verify
authRouter.post('/login-verify', async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const response: AuthenticationResponseJSON = body.response ?? body;
  const challenge = body.challenge || extractChallenge(response);

  if (!challenge) {
    return c.json({ error: 'Missing challenge' }, 400);
  }

  const stored = getAndConsumeChallenge(challenge);
  if (!stored || stored.type !== 'authentication') {
    return c.json({ error: 'Invalid or expired challenge' }, 400);
  }

  // Find credential by credential id
  const [cred] = await db
    .select()
    .from(credentials)
    .where(eq(credentials.id, response.id))
    .limit(1);

  if (!cred) {
    return c.json({ error: 'Unrecognized credential' }, 400);
  }

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, cred.userId))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 400);
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: getExpectedOrigin(c.req.header('origin')),
      expectedRPID: getRpId(),
      credential: {
        id: cred.id,
        publicKey: isoBase64URL.toBuffer(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      },
      requireUserVerification: false,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Authentication failed' }, 400);
  }

  if (!verification.verified) {
    return c.json({ error: 'Authentication verification failed' }, 400);
  }

  // Update credential counter
  await db
    .update(credentials)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(credentials.id, cred.id));

  await setSession(c, user.id);

  return c.json({ verified: true, user });
});

// GET /api/auth/me
authRouter.get('/me', async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ user: null }, 401);
  }
  return c.json({ user });
});

// POST /api/auth/logout
authRouter.post('/logout', async (c) => {
  clearSession(c);
  return c.json({ success: true });
});

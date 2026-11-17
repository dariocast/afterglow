import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../server/app';
import { db, users, credentials } from '../server/db';
import { createSessionCookie, requireAuth, sessionMiddleware } from '../server/auth/session';
import { Hono } from 'hono';

describe('Auth API', () => {
  beforeEach(async () => {
    // Clear users & credentials for clean state in test database
    await db.delete(credentials);
    await db.delete(users);
  });

  describe('POST /api/auth/register-options', () => {
    it('generates registration options for a new username', async () => {
      const res = await app.request('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'aurora', displayName: 'Aurora' }),
      });
      expect(res.status).toBe(200);
      const options = await res.json();
      expect(options.challenge).toBeDefined();
      expect(options.rp.name).toBe('Afterglow');
      expect(options.user.name).toBe('aurora');
      expect(options.user.displayName).toBe('Aurora');
      expect(options.pubKeyCredParams.length).toBeGreaterThan(0);
    });

    it('rejects registration options when username is missing', async () => {
      const res = await app.request('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Username is required/i);
    });

    it('excludes existing credentials when user registers an additional passkey', async () => {
      const userId = 'u-existing-reg';
      await db.insert(users).values({
        id: userId,
        username: 'existing_user',
        displayName: 'Existing User',
        createdAt: new Date(),
      });
      await db.insert(credentials).values({
        id: 'existing-cred-id-1',
        userId,
        publicKey: 'mock-public-key',
        counter: 0,
        transports: JSON.stringify(['internal']),
        createdAt: new Date(),
      });

      const res = await app.request('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'existing_user' }),
      });
      expect(res.status).toBe(200);
      const options = await res.json();
      expect(options.excludeCredentials.length).toBe(1);
      expect(options.excludeCredentials[0].id).toBe('existing-cred-id-1');
    });
  });

  describe('POST /api/auth/login-options', () => {
    it('generates login options without username (discoverable credentials)', async () => {
      const res = await app.request('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const options = await res.json();
      expect(options.challenge).toBeDefined();
      expect(options.rpId).toBe('localhost');
    });

    it('generates login options with allowed credentials for known username', async () => {
      const userId = 'u-login-test';
      await db.insert(users).values({
        id: userId,
        username: 'login_user',
        displayName: 'Login User',
        createdAt: new Date(),
      });
      await db.insert(credentials).values({
        id: 'user-cred-abc',
        userId,
        publicKey: 'mock-key',
        counter: 0,
        transports: JSON.stringify(['hybrid']),
        createdAt: new Date(),
      });

      const res = await app.request('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'login_user' }),
      });
      expect(res.status).toBe(200);
      const options = await res.json();
      expect(options.allowCredentials).toBeDefined();
      expect(options.allowCredentials.length).toBe(1);
      expect(options.allowCredentials[0].id).toBe('user-cred-abc');
    });
  });

  describe('POST /api/auth/register-verify & login-verify validation', () => {
    it('rejects register-verify when challenge is missing or invalid', async () => {
      const res = await app.request('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: 'non-existent-challenge' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid or expired challenge/i);
    });

    it('rejects login-verify when challenge is missing or invalid', async () => {
      const res = await app.request('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: 'non-existent-challenge' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid or expired challenge/i);
    });
  });

  describe('GET /api/auth/me & Session Management', () => {
    it('returns 401 when not logged in', async () => {
      const res = await app.request('/api/auth/me');
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.user).toBeNull();
    });

    it('returns user profile when authenticated with signed cookie', async () => {
      const userId = 'u-session-1';
      await db.insert(users).values({
        id: userId,
        username: 'session_user',
        displayName: 'Session User',
        createdAt: new Date(),
      });

      const cookieHeader = await createSessionCookie(userId);
      const cookieValue = cookieHeader.split(';')[0];

      const res = await app.request('/api/auth/me', {
        headers: { Cookie: cookieValue },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.id).toBe(userId);
      expect(data.user.username).toBe('session_user');
      expect(data.user.displayName).toBe('Session User');
    });

    it('returns 401 if signed cookie references deleted/nonexistent user', async () => {
      const cookieHeader = await createSessionCookie('u-ghost-user');
      const cookieValue = cookieHeader.split(';')[0];

      const res = await app.request('/api/auth/me', {
        headers: { Cookie: cookieValue },
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.user).toBeNull();
    });

    it('clears session cookie on logout', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie).toMatch(/afterglow_session=/);
    });
  });

  describe('Session Middleware & requireAuth Guard', () => {
    it('populates c.get("user") on protected routes', async () => {
      const testApp = new Hono();
      testApp.use('*', sessionMiddleware);
      testApp.get('/protected', requireAuth, (c) => {
        const user = c.get('user');
        return c.json({ user });
      });

      // Without auth -> 401
      const resUnauth = await testApp.request('/protected');
      expect(resUnauth.status).toBe(401);

      // With auth -> 200 with user
      const userId = 'u-guard-1';
      await db.insert(users).values({
        id: userId,
        username: 'guard_user',
        displayName: 'Guard User',
        createdAt: new Date(),
      });

      const cookieHeader = await createSessionCookie(userId);
      const cookieValue = cookieHeader.split(';')[0];

      const resAuth = await testApp.request('/protected', {
        headers: { Cookie: cookieValue },
      });
      expect(resAuth.status).toBe(200);
      const data = await resAuth.json();
      expect(data.user.id).toBe(userId);
      expect(data.user.username).toBe('guard_user');
    });
  });
});

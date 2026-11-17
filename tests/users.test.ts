import { describe, it, expect, beforeEach } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { app } from '../server/app';
import { db, users, posts, reactions, replies, follows } from '../server/db';
import { createSessionCookie } from '../server/auth/session';

describe('Users Profile & Follows API', () => {
  const user1Id = 'u-profile-1';
  const user2Id = 'u-profile-2';
  const user3Id = 'u-profile-3';

  beforeEach(async () => {
    await db.delete(follows);
    await db.delete(replies);
    await db.delete(reactions);
    await db.delete(posts);
    await db.delete(users);

    const now = new Date();

    await db.insert(users).values([
      {
        id: user1Id,
        username: 'maya_writes',
        displayName: 'Maya Chen',
        bio: 'Collecting quiet mornings and notebook margins.',
        avatarColor: '#a26a42',
        createdAt: now,
      },
      {
        id: user2Id,
        username: 'alexr',
        displayName: 'Alex Rivera',
        bio: 'Waiting for the kettle to boil.',
        avatarColor: '#5a7d65',
        createdAt: now,
      },
      {
        id: user3Id,
        username: 'jopark',
        displayName: 'Jo Park',
        bio: null,
        avatarColor: null,
        createdAt: now,
      },
    ]);
  });

  describe('GET /api/users/:username', () => {
    it('returns 200 with profile and unexpired active moments only', async () => {
      const now = Date.now();

      await db.insert(posts).values([
        {
          id: 'p-maya-active',
          authorId: user1Id,
          content: 'Still warm in memory.',
          lifetimeHours: 24,
          createdAt: new Date(now - 2 * 3600 * 1000),
          expiresAt: new Date(now + 22 * 3600 * 1000),
        },
        {
          id: 'p-maya-expired',
          authorId: user1Id,
          content: 'Already faded away.',
          lifetimeHours: 24,
          createdAt: new Date(now - 30 * 3600 * 1000),
          expiresAt: new Date(now - 6 * 3600 * 1000),
        },
        {
          id: 'p-alex-active',
          authorId: user2Id,
          content: 'Another author moment.',
          lifetimeHours: 24,
          createdAt: new Date(now - 1 * 3600 * 1000),
          expiresAt: new Date(now + 23 * 3600 * 1000),
        },
      ]);

      await db.insert(reactions).values({
        id: 'rxn-maya-1',
        postId: 'p-maya-active',
        userId: user2Id,
        kind: 'glow',
        createdAt: new Date(now - 3600 * 1000),
      });

      await db.insert(replies).values({
        id: 'rep-maya-1',
        postId: 'p-maya-active',
        authorId: user2Id,
        content: 'Quiet agreement.',
        createdAt: new Date(now - 1800 * 1000),
      });

      const res = await app.request('/api/users/maya_writes');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(user1Id);
      expect(data.username).toBe('maya_writes');
      expect(data.displayName).toBe('Maya Chen');
      expect(data.bio).toBe('Collecting quiet mornings and notebook margins.');
      expect(data.avatarColor).toBe('#a26a42');
      expect(data.createdAt).toBeDefined();
      expect(data.isFollowing).toBe(false);

      expect(Array.isArray(data.activeMoments)).toBe(true);
      expect(data.activeMoments).toHaveLength(1);
      expect(data.activeMoments[0].id).toBe('p-maya-active');
      expect(data.activeMoments[0].author.username).toBe('maya_writes');
      expect(data.activeMoments[0].reactions).toEqual({ glow: 1, warm: 0, thought: 0 });
      expect(data.activeMoments[0].userReaction).toBeNull();
      expect(data.activeMoments[0].replies).toHaveLength(1);
      expect(data.activeMoments[0].replies[0].content).toBe('Quiet agreement.');
    });

    it('computes isFollowing accurately for authenticated requester and self', async () => {
      await db.insert(follows).values({
        id: 'fol-alex-maya',
        followerId: user2Id,
        followingId: user1Id,
        createdAt: new Date(),
      });

      const cookieAlex = await createSessionCookie(user2Id);

      // Alex follows Maya
      const resFollowing = await app.request('/api/users/maya_writes', {
        headers: { Cookie: cookieAlex },
      });
      expect(resFollowing.status).toBe(200);
      const dataFollowing = await resFollowing.json();
      expect(dataFollowing.isFollowing).toBe(true);

      // Alex does not follow Jo
      const resNotFollowing = await app.request('/api/users/jopark', {
        headers: { Cookie: cookieAlex },
      });
      expect(resNotFollowing.status).toBe(200);
      const dataNotFollowing = await resNotFollowing.json();
      expect(dataNotFollowing.isFollowing).toBe(false);

      // Alex viewing own profile
      const resSelf = await app.request('/api/users/alexr', {
        headers: { Cookie: cookieAlex },
      });
      expect(resSelf.status).toBe(200);
      const dataSelf = await resSelf.json();
      expect(dataSelf.isFollowing).toBeNull();
    });

    it('returns 404 for nonexistent username', async () => {
      const res = await app.request('/api/users/nonexistent_user');
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('User not found');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'Updated bio' }),
      });
      expect(res.status).toBe(401);
    });

    it('updates bio, displayName, and avatarColor for authenticated user', async () => {
      const cookie = await createSessionCookie(user1Id);

      const res = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          bio: 'Updated thoughtful bio.',
          displayName: 'Maya C.',
          avatarColor: '#7a6590',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(user1Id);
      expect(data.bio).toBe('Updated thoughtful bio.');
      expect(data.displayName).toBe('Maya C.');
      expect(data.avatarColor).toBe('#7a6590');

      const [dbUser] = await db.select().from(users).where(eq(users.id, user1Id));
      expect(dbUser.bio).toBe('Updated thoughtful bio.');
      expect(dbUser.displayName).toBe('Maya C.');
      expect(dbUser.avatarColor).toBe('#7a6590');
    });

    it('rejects bio longer than 160 characters with 400', async () => {
      const cookie = await createSessionCookie(user1Id);
      const longBio = 'a'.repeat(161);

      const res = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({ bio: longBio }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('rejects empty or overlong displayName with 400', async () => {
      const cookie = await createSessionCookie(user1Id);

      const emptyRes = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({ displayName: '   ' }),
      });
      expect(emptyRes.status).toBe(400);

      const longRes = await app.request('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({ displayName: 'x'.repeat(51) }),
      });
      expect(longRes.status).toBe(400);
    });
  });

  describe('POST /api/users/:id/follow', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.request(`/api/users/${user1Id}/follow`, {
        method: 'POST',
      });
      expect(res.status).toBe(401);
    });

    it('rejects self-follow with 400', async () => {
      const cookie = await createSessionCookie(user1Id);
      const res = await app.request(`/api/users/${user1Id}/follow`, {
        method: 'POST',
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Cannot follow yourself');
    });

    it('returns 404 when target user does not exist', async () => {
      const cookie = await createSessionCookie(user1Id);
      const res = await app.request('/api/users/nonexistent-id/follow', {
        method: 'POST',
        headers: { Cookie: cookie },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('User not found');
    });

    it('creates follow relation and is idempotent on duplicate follow', async () => {
      const cookie = await createSessionCookie(user2Id);

      const firstRes = await app.request(`/api/users/${user1Id}/follow`, {
        method: 'POST',
        headers: { Cookie: cookie },
      });
      expect(firstRes.status).toBe(200);
      expect(await firstRes.json()).toEqual({ success: true, isFollowing: true });

      // Duplicate follow should succeed idempotently
      const secondRes = await app.request(`/api/users/${user1Id}/follow`, {
        method: 'POST',
        headers: { Cookie: cookie },
      });
      expect(secondRes.status).toBe(200);
      expect(await secondRes.json()).toEqual({ success: true, isFollowing: true });

      const rows = await db
        .select()
        .from(follows)
        .where(and(eq(follows.followerId, user2Id), eq(follows.followingId, user1Id)));
      expect(rows).toHaveLength(1);
    });
  });

  describe('DELETE /api/users/:id/follow', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.request(`/api/users/${user1Id}/follow`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(401);
    });

    it('removes follow relation and is idempotent when not following', async () => {
      await db.insert(follows).values({
        id: 'fol-delete-1',
        followerId: user2Id,
        followingId: user1Id,
        createdAt: new Date(),
      });

      const cookie = await createSessionCookie(user2Id);

      const res = await app.request(`/api/users/${user1Id}/follow`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, isFollowing: false });

      const rows = await db
        .select()
        .from(follows)
        .where(and(eq(follows.followerId, user2Id), eq(follows.followingId, user1Id)));
      expect(rows).toHaveLength(0);

      // Second delete when not following should still succeed idempotently
      const secondRes = await app.request(`/api/users/${user1Id}/follow`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });
      expect(secondRes.status).toBe(200);
      expect(await secondRes.json()).toEqual({ success: true, isFollowing: false });
    });
  });
});

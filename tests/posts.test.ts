import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../server/app';
import { db, users, posts, reactions, replies } from '../server/db';
import { purgeExpiredPosts, startReaper, stopReaper } from '../server/services/reaper';
import { createSessionCookie } from '../server/auth/session';

describe('Posts API & Expiry Reaper', () => {
  const user1Id = 'u-poster-1';
  const user2Id = 'u-poster-2';

  beforeEach(async () => {
    await db.delete(replies);
    await db.delete(reactions);
    await db.delete(posts);
    await db.delete(users);

    await db.insert(users).values({
      id: user1Id,
      username: 'tester1',
      displayName: 'Tester One',
      createdAt: new Date(),
    });

    await db.insert(users).values({
      id: user2Id,
      username: 'tester2',
      displayName: 'Tester Two',
      createdAt: new Date(),
    });
  });

  describe('Finite Lifespan & Reaper (Brief Contract)', () => {
    it('excludes expired posts from the feed and reaper deletes them', async () => {
      // Insert an active post
      await db.insert(posts).values({
        id: 'p-active',
        authorId: user1Id,
        content: 'I am still glowing',
        lifetimeHours: 24,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      // Insert an expired post
      await db.insert(posts).values({
        id: 'p-expired',
        authorId: user1Id,
        content: 'I have vanished',
        lifetimeHours: 24,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
      });

      const res = await app.request('/api/posts?filter=all');
      expect(res.status).toBe(200);
      const feed = await res.json();
      const ids = feed.map((p: any) => p.id);
      expect(ids).toContain('p-active');
      expect(ids).not.toContain('p-expired');

      // Run reaper
      const purgedCount = await purgeExpiredPosts();
      expect(purgedCount).toBeGreaterThanOrEqual(1);

      // Verify expired post is completely gone from DB
      const resAfterReaper = await app.request('/api/posts?filter=all');
      const feedAfter = await resAfterReaper.json();
      expect(feedAfter.map((p: any) => p.id)).not.toContain('p-expired');
    });
  });

  describe('GET /api/posts with filters', () => {
    it('supports filter=all, filter=ending, and filter=mine', async () => {
      const now = Date.now();

      // Post 1: user1, expires in 5 hours (ending soon)
      await db.insert(posts).values({
        id: 'p-user1-ending',
        authorId: user1Id,
        content: 'Ending soon by user 1',
        lifetimeHours: 24,
        createdAt: new Date(now - 19 * 3600 * 1000),
        expiresAt: new Date(now + 5 * 3600 * 1000),
      });

      // Post 2: user1, expires in 60 hours (not ending soon)
      await db.insert(posts).values({
        id: 'p-user1-fresh',
        authorId: user1Id,
        content: 'Fresh post by user 1',
        lifetimeHours: 72,
        createdAt: new Date(now - 12 * 3600 * 1000),
        expiresAt: new Date(now + 60 * 3600 * 1000),
      });

      // Post 3: user2, expires in 2 hours (ending soon)
      await db.insert(posts).values({
        id: 'p-user2-ending',
        authorId: user2Id,
        content: 'Ending soon by user 2',
        lifetimeHours: 24,
        createdAt: new Date(now - 22 * 3600 * 1000),
        expiresAt: new Date(now + 2 * 3600 * 1000),
      });

      // Filter: all
      const resAll = await app.request('/api/posts?filter=all');
      expect(resAll.status).toBe(200);
      const feedAll = await resAll.json();
      expect(feedAll.length).toBe(3);

      // Filter: ending (within 48 hours left, sorted by expiresAt asc)
      const resEnding = await app.request('/api/posts?filter=ending');
      expect(resEnding.status).toBe(200);
      const feedEnding = await resEnding.json();
      const endingIds = feedEnding.map((p: any) => p.id);
      expect(endingIds).toContain('p-user2-ending');
      expect(endingIds).toContain('p-user1-ending');
      expect(endingIds).not.toContain('p-user1-fresh');
      // Should be sorted by expiresAt ascending (closest to expiry first)
      expect(endingIds[0]).toBe('p-user2-ending');

      // Filter: mine without auth -> 401
      const resMineUnauth = await app.request('/api/posts?filter=mine');
      expect(resMineUnauth.status).toBe(401);

      // Filter: mine with auth for user1
      const cookieHeader = await createSessionCookie(user1Id);
      const resMineUser1 = await app.request('/api/posts?filter=mine', {
        headers: { Cookie: cookieHeader.split(';')[0] },
      });
      expect(resMineUser1.status).toBe(200);
      const feedMine = await resMineUser1.json();
      const mineIds = feedMine.map((p: any) => p.id);
      expect(mineIds).toContain('p-user1-ending');
      expect(mineIds).toContain('p-user1-fresh');
      expect(mineIds).not.toContain('p-user2-ending');
    });
  });

  describe('POST /api/posts', () => {
    it('requires authentication', async () => {
      const res = await app.request('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hello world', lifetimeHours: 24 }),
      });
      expect(res.status).toBe(401);
    });

    it('validates content and lifetimeHours', async () => {
      const cookieHeader = await createSessionCookie(user1Id);
      const cookie = cookieHeader.split(';')[0];

      // Missing content
      const resEmpty = await app.request('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ content: '   ', lifetimeHours: 24 }),
      });
      expect(resEmpty.status).toBe(400);

      // Content exceeds 420 chars
      const resTooLong = await app.request('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ content: 'a'.repeat(421), lifetimeHours: 24 }),
      });
      expect(resTooLong.status).toBe(400);

      // Invalid lifetimeHours (not 24, 72, 168)
      const resInvalidLife = await app.request('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ content: 'Valid content', lifetimeHours: 12 }),
      });
      expect(resInvalidLife.status).toBe(400);
    });

    it('creates post with valid data and calculates correct expiry', async () => {
      const cookieHeader = await createSessionCookie(user1Id);
      const cookie = cookieHeader.split(';')[0];
      const beforeTime = Date.now();

      const res = await app.request('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ content: 'A finite moment in time', lifetimeHours: 72 }),
      });

      expect(res.status).toBe(201);
      const post = await res.json();
      expect(post.id).toBeDefined();
      expect(post.content).toBe('A finite moment in time');
      expect(post.lifetimeHours).toBe(72);
      expect(post.author.id).toBe(user1Id);
      expect(post.author.username).toBe('tester1');

      const expiresTime = new Date(post.expiresAt).getTime();
      const expectedExpiresTime = beforeTime + 72 * 3600 * 1000;
      expect(Math.abs(expiresTime - expectedExpiresTime)).toBeLessThan(5000);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('author can delete their own post early, non-author cannot', async () => {
      const cookieUser1 = (await createSessionCookie(user1Id)).split(';')[0];
      const cookieUser2 = (await createSessionCookie(user2Id)).split(';')[0];

      // Insert post authored by user1
      const postId = 'p-to-delete';
      await db.insert(posts).values({
        id: postId,
        authorId: user1Id,
        content: 'Delete me soon',
        lifetimeHours: 24,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      });

      // User 2 attempts to delete user 1's post -> 403 Forbidden
      const resForbidden = await app.request(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Cookie: cookieUser2 },
      });
      expect(resForbidden.status).toBe(403);

      // User 1 deletes their own post -> 200 OK
      const resSuccess = await app.request(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Cookie: cookieUser1 },
      });
      expect(resSuccess.status).toBe(200);

      // Confirm post is removed
      const resFeed = await app.request('/api/posts?filter=all');
      const feed = await resFeed.json();
      expect(feed.map((p: any) => p.id)).not.toContain(postId);
    });

    it('returns 404 when deleting a non-existent post', async () => {
      const cookieUser1 = (await createSessionCookie(user1Id)).split(';')[0];
      const res = await app.request('/api/posts/non-existent-id', {
        method: 'DELETE',
        headers: { Cookie: cookieUser1 },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/posts/:id/reactions', () => {
    it('toggles or updates reaction (glow, warm, thought)', async () => {
      const cookieUser1 = (await createSessionCookie(user1Id)).split(';')[0];

      const postId = 'p-react-target';
      await db.insert(posts).values({
        id: postId,
        authorId: user2Id,
        content: 'Post to react to',
        lifetimeHours: 24,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      });

      // Invalid kind -> 400
      const resInvalid = await app.request(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ kind: 'dislike' }),
      });
      expect(resInvalid.status).toBe(400);

      // Add 'glow' reaction
      const resGlow = await app.request(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ kind: 'glow' }),
      });
      expect(resGlow.status).toBe(200);
      const dataGlow = await resGlow.json();
      expect(dataGlow.reaction?.kind).toBe('glow');

      // Check feed to confirm reaction count and userReaction
      const resFeed1 = await app.request('/api/posts?filter=all', {
        headers: { Cookie: cookieUser1 },
      });
      const feed1 = await resFeed1.json();
      const postInFeed1 = feed1.find((p: any) => p.id === postId);
      expect(postInFeed1.reactions.glow).toBe(1);
      expect(postInFeed1.reactions.warm).toBe(0);
      expect(postInFeed1.userReaction).toBe('glow');

      // Update reaction from 'glow' to 'warm'
      const resWarm = await app.request(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ kind: 'warm' }),
      });
      expect(resWarm.status).toBe(200);
      const dataWarm = await resWarm.json();
      expect(dataWarm.reaction?.kind).toBe('warm');

      // Feed check: glow is now 0, warm is 1
      const resFeed2 = await app.request('/api/posts?filter=all', {
        headers: { Cookie: cookieUser1 },
      });
      const feed2 = await resFeed2.json();
      const postInFeed2 = feed2.find((p: any) => p.id === postId);
      expect(postInFeed2.reactions.glow).toBe(0);
      expect(postInFeed2.reactions.warm).toBe(1);
      expect(postInFeed2.userReaction).toBe('warm');

      // Toggle off 'warm' by sending 'warm' again
      const resToggleOff = await app.request(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ kind: 'warm' }),
      });
      expect(resToggleOff.status).toBe(200);
      const dataOff = await resToggleOff.json();
      expect(dataOff.reaction).toBeNull();

      // Feed check: warm is 0, userReaction is null
      const resFeed3 = await app.request('/api/posts?filter=all', {
        headers: { Cookie: cookieUser1 },
      });
      const feed3 = await resFeed3.json();
      const postInFeed3 = feed3.find((p: any) => p.id === postId);
      expect(postInFeed3.reactions.warm).toBe(0);
      expect(postInFeed3.userReaction).toBeNull();
    });

    it('rejects reactions on expired posts', async () => {
      const cookieUser1 = (await createSessionCookie(user1Id)).split(';')[0];
      const postId = 'p-expired-react';
      await db.insert(posts).values({
        id: postId,
        authorId: user2Id,
        content: 'Expired post',
        lifetimeHours: 24,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
      });

      const res = await app.request(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ kind: 'glow' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/posts/:id/replies', () => {
    it('creates finite reply attached to post', async () => {
      const cookieUser1 = (await createSessionCookie(user1Id)).split(';')[0];

      const postId = 'p-reply-target';
      await db.insert(posts).values({
        id: postId,
        authorId: user2Id,
        content: 'Original thought',
        lifetimeHours: 24,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      });

      // Empty reply rejected
      const resEmpty = await app.request(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ content: '   ' }),
      });
      expect(resEmpty.status).toBe(400);

      // Valid reply created
      const resReply = await app.request(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ content: 'Resonating with this deeply.' }),
      });
      expect(resReply.status).toBe(201);
      const reply = await resReply.json();
      expect(reply.id).toBeDefined();
      expect(reply.content).toBe('Resonating with this deeply.');
      expect(reply.author.id).toBe(user1Id);
      expect(reply.author.username).toBe('tester1');

      // Verify replies in feed
      const resFeed = await app.request('/api/posts?filter=all');
      const feed = await resFeed.json();
      const targetPost = feed.find((p: any) => p.id === postId);
      expect(targetPost.replies.length).toBe(1);
      expect(targetPost.replies[0].content).toBe('Resonating with this deeply.');
    });

    it('rejects replies to expired posts', async () => {
      const cookieUser1 = (await createSessionCookie(user1Id)).split(';')[0];
      const postId = 'p-expired-reply';
      await db.insert(posts).values({
        id: postId,
        authorId: user2Id,
        content: 'Expired post',
        lifetimeHours: 24,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000),
      });

      const res = await app.request(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
        body: JSON.stringify({ content: 'Too late' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Reaper service lifecycle', () => {
    it('starts and stops background reaper cleanly', () => {
      const timer = startReaper(60000);
      expect(timer).toBeDefined();
      stopReaper();
    });
  });
});

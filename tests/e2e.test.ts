import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../server/app';
import { db, users, posts, reactions, replies } from '../server/db';
import { createSessionCookie } from '../server/auth/session';
import { seedDatabase } from '../server/db/seed';
import { purgeExpiredPosts } from '../server/services/reaper';
import fs from 'node:fs';
import path from 'node:path';

describe('End-to-End User Journeys & Production Integration', () => {
  beforeEach(async () => {
    // Clear test tables
    await db.delete(replies);
    await db.delete(reactions);
    await db.delete(posts);
    await db.delete(users);
  });

  describe('Full User Journey: Auth -> Post Creation (24h) -> Reaction -> Reply -> Feed', () => {
    it('executes the full lifecycle of a finite moment', async () => {
      // 1. User Creation: Alice and Bob
      const aliceId = 'usr_alice_e2e';
      const bobId = 'usr_bob_e2e';

      await db.insert(users).values([
        {
          id: aliceId,
          username: 'alice',
          displayName: 'Alice Wonderland',
          createdAt: new Date(),
        },
        {
          id: bobId,
          username: 'bob',
          displayName: 'Bob The Builder',
          createdAt: new Date(),
        },
      ]);

      // Generate signed session cookies for both users
      const aliceCookie = await createSessionCookie(aliceId);
      const bobCookie = await createSessionCookie(bobId);

      // Verify Alice session
      const meRes = await app.request('/api/auth/me', {
        headers: { Cookie: aliceCookie },
      });
      expect(meRes.status).toBe(200);
      const meData = await meRes.json();
      expect(meData.user.username).toBe('alice');

      // 2. Post Creation with 24h Lifespan: Alice posts a moment
      const postPayload = {
        content: 'Watching the dusk settle over the city. Gone by tomorrow evening.',
        lifetimeHours: 24,
      };

      const createRes = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: aliceCookie,
        },
        body: JSON.stringify(postPayload),
      });

      expect(createRes.status).toBe(201);
      const createdPost = await createRes.json();
      expect(createdPost.id).toBeDefined();
      expect(createdPost.content).toBe(postPayload.content);
      expect(createdPost.lifetimeHours).toBe(24);
      expect(createdPost.author.username).toBe('alice');
      expect(createdPost.reactions).toEqual({ glow: 0, warm: 0, thought: 0 });
      expect(createdPost.replies).toHaveLength(0);

      // Verify expiresAt is ~24h after createdAt
      const createdAtMs = new Date(createdPost.createdAt).getTime();
      const expiresAtMs = new Date(createdPost.expiresAt).getTime();
      const diffHours = (expiresAtMs - createdAtMs) / (1000 * 60 * 60);
      expect(Math.round(diffHours)).toBe(24);

      const postId = createdPost.id;

      // 3. Reaction Submission: Bob reacts with "glow"
      const reactRes = await app.request(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify({ kind: 'glow' }),
      });

      expect(reactRes.status).toBe(200);
      const reactData = await reactRes.json();
      expect(reactData.success).toBe(true);
      expect(reactData.reaction.kind).toBe('glow');

      // 4. Reply Creation: Bob replies to Alice's post
      const replyPayload = {
        content: 'The colors in the sky are quiet and wonderful tonight.',
      };

      const replyRes = await app.request(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: bobCookie,
        },
        body: JSON.stringify(replyPayload),
      });

      expect(replyRes.status).toBe(201);
      const createdReply = await replyRes.json();
      expect(createdReply.id).toBeDefined();
      expect(createdReply.content).toBe(replyPayload.content);
      expect(createdReply.author.username).toBe('bob');
      expect(createdReply.postId).toBe(postId);

      // 5. Feed Retrieval: Unauthenticated viewer
      const publicFeedRes = await app.request('/api/posts?filter=all');
      expect(publicFeedRes.status).toBe(200);
      const publicFeed = await publicFeedRes.json();
      expect(publicFeed.length).toBe(1);

      const retrieved = publicFeed[0];
      expect(retrieved.id).toBe(postId);
      expect(retrieved.content).toBe(postPayload.content);
      expect(retrieved.reactions.glow).toBe(1);
      expect(retrieved.reactions.warm).toBe(0);
      expect(retrieved.reactions.thought).toBe(0);
      expect(retrieved.userReaction).toBeNull();
      expect(retrieved.replies.length).toBe(1);
      expect(retrieved.replies[0].content).toBe(replyPayload.content);
      expect(retrieved.replies[0].author.username).toBe('bob');

      // 6. Feed Retrieval: Bob viewer (sees his own reaction highlighted)
      const bobFeedRes = await app.request('/api/posts?filter=all', {
        headers: { Cookie: bobCookie },
      });
      expect(bobFeedRes.status).toBe(200);
      const bobFeed = await bobFeedRes.json();
      expect(bobFeed[0].userReaction).toBe('glow');

      // 7. Filter: "mine"
      const aliceMineRes = await app.request('/api/posts?filter=mine', {
        headers: { Cookie: aliceCookie },
      });
      expect(aliceMineRes.status).toBe(200);
      const aliceMine = await aliceMineRes.json();
      expect(aliceMine.length).toBe(1);
      expect(aliceMine[0].id).toBe(postId);

      const bobMineRes = await app.request('/api/posts?filter=mine', {
        headers: { Cookie: bobCookie },
      });
      expect(bobMineRes.status).toBe(200);
      const bobMine = await bobMineRes.json();
      expect(bobMine.length).toBe(0);

      // 8. Filter: "ending" (24h lifespan is <= 48h, so it appears in ending soon)
      const endingRes = await app.request('/api/posts?filter=ending');
      expect(endingRes.status).toBe(200);
      const endingFeed = await endingRes.json();
      expect(endingFeed.some((p: any) => p.id === postId)).toBe(true);
    });
  });

  describe('Database Seeding & Expiry Staggering', () => {
    it('populates initial active moments with staggered expiries', async () => {
      await seedDatabase();

      // Fetch all posts
      const resAll = await app.request('/api/posts?filter=all');
      expect(resAll.status).toBe(200);
      const allPosts = await resAll.json();
      expect(allPosts.length).toBe(4);

      // Check author usernames
      const authors = allPosts.map((p: any) => p.author.username);
      expect(authors).toContain('maya_writes');
      expect(authors).toContain('alexr');
      expect(authors).toContain('jopark');
      expect(authors).toContain('dario');

      // Verify reactions and replies are attached
      const postWithReplies = allPosts.find((p: any) => p.id === 'post_1');
      expect(postWithReplies).toBeDefined();
      expect(postWithReplies.replies.length).toBeGreaterThan(0);
      expect(postWithReplies.reactions.glow).toBeGreaterThan(0);

      // Fetch ending-soon filter (<= 48 hours left)
      const resEnding = await app.request('/api/posts?filter=ending');
      expect(resEnding.status).toBe(200);
      const endingPosts = await resEnding.json();
      // post_2 (36h left) and post_3 (12h left) should be included; post_1 (160h) and post_4 (164h) excluded
      const endingIds = endingPosts.map((p: any) => p.id);
      expect(endingIds).toContain('post_2');
      expect(endingIds).toContain('post_3');
      expect(endingIds).not.toContain('post_1');
      expect(endingIds).not.toContain('post_4');
    });
  });

  describe('Lifespan Expiry & Reaper Cleanup', () => {
    it('excludes expired moments from active feed and purges them with reaper', async () => {
      const authorId = 'usr_temp_author';
      await db.insert(users).values({
        id: authorId,
        username: 'ghost_author',
        displayName: 'Ghost Author',
        createdAt: new Date(),
      });

      // Insert an expired post (expired 1 hour ago)
      const expiredPostId = 'post_expired_now';
      await db.insert(posts).values({
        id: expiredPostId,
        authorId,
        content: 'This finite thought has already expired.',
        lifetimeHours: 24,
        createdAt: new Date(Date.now() - 25 * 3600 * 1000),
        expiresAt: new Date(Date.now() - 3600 * 1000),
      });

      // Add a reaction and reply to the expired post to verify cascade delete
      await db.insert(reactions).values({
        id: 'rxn_expired',
        postId: expiredPostId,
        userId: authorId,
        kind: 'thought',
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      });

      await db.insert(replies).values({
        id: 'rep_expired',
        postId: expiredPostId,
        authorId,
        content: 'A parting reply.',
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      });

      // Active feed query must exclude the expired post
      const feedRes = await app.request('/api/posts?filter=all');
      const feed = await feedRes.json();
      expect(feed.map((p: any) => p.id)).not.toContain(expiredPostId);

      // Run reaper purge
      const purgedCount = await purgeExpiredPosts();
      expect(purgedCount).toBeGreaterThanOrEqual(1);

      // Verify the record is completely removed from DB
      const postInDb = await db.select().from(posts);
      expect(postInDb.map((p) => p.id)).not.toContain(expiredPostId);

      const repliesInDb = await db.select().from(replies);
      expect(repliesInDb.map((r) => r.id)).not.toContain('rep_expired');
    });
  });

  describe('Social Graph & Following Feed Journey', () => {
    it('allows a user to follow Elena, view her active moments in Following filter, and unfollow', async () => {
      // 1. Create Elena, Marcus, and Alice
      const elenaId = 'usr_elena_e2e';
      const marcusId = 'usr_marcus_e2e';
      const aliceId = 'usr_alice_graph_e2e';

      await db.insert(users).values([
        {
          id: elenaId,
          username: 'elena',
          displayName: 'Elena Rostova',
          bio: 'Writing on fine paper.',
          avatarColor: '#8a4b38',
          createdAt: new Date(),
        },
        {
          id: marcusId,
          username: 'marcus',
          displayName: 'Marcus Aurel',
          bio: 'Meditations at midnight.',
          avatarColor: '#3d5a80',
          createdAt: new Date(),
        },
        {
          id: aliceId,
          username: 'alice_follower',
          displayName: 'Alice Reader',
          createdAt: new Date(),
        },
      ]);

      const aliceCookie = await createSessionCookie(aliceId);

      // 2. Elena and Marcus each publish active moments
      const elenaPostRes = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: await createSessionCookie(elenaId),
        },
        body: JSON.stringify({
          content: "Elena's morning reflection.",
          lifetimeHours: 24,
        }),
      });
      expect(elenaPostRes.status).toBe(201);
      const elenaPost = await elenaPostRes.json();

      const marcusPostRes = await app.request('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: await createSessionCookie(marcusId),
        },
        body: JSON.stringify({
          content: "Marcus's midnight thought.",
          lifetimeHours: 24,
        }),
      });
      expect(marcusPostRes.status).toBe(201);
      const marcusPost = await marcusPostRes.json();

      // 3. Alice checks following feed before following anyone -> empty
      const initialFollowingRes = await app.request('/api/posts?filter=following', {
        headers: { Cookie: aliceCookie },
      });
      expect(initialFollowingRes.status).toBe(200);
      const initialPosts = await initialFollowingRes.json();
      expect(initialPosts).toHaveLength(0);

      // 4. Alice inspects Elena's profile
      const elenaProfileRes = await app.request('/api/users/elena', {
        headers: { Cookie: aliceCookie },
      });
      expect(elenaProfileRes.status).toBe(200);
      const elenaProfile = await elenaProfileRes.json();
      expect(elenaProfile.username).toBe('elena');
      expect(elenaProfile.isFollowing).toBe(false);
      expect(elenaProfile.activeMoments).toHaveLength(1);

      // 5. Alice follows Elena
      const followRes = await app.request(`/api/users/${elenaId}/follow`, {
        method: 'POST',
        headers: { Cookie: aliceCookie },
      });
      expect(followRes.status).toBe(200);
      const followData = await followRes.json();
      expect(followData.isFollowing).toBe(true);

      // 6. Alice switches to "Following" filter -> Elena's active moment is present, Marcus's is not
      const updatedFollowingRes = await app.request('/api/posts?filter=following', {
        headers: { Cookie: aliceCookie },
      });
      expect(updatedFollowingRes.status).toBe(200);
      const followingPosts = await updatedFollowingRes.json();
      expect(followingPosts).toHaveLength(1);
      expect(followingPosts[0].id).toBe(elenaPost.id);
      expect(followingPosts[0].content).toBe("Elena's morning reflection.");

      // 7. Alice unfollows Elena
      const unfollowRes = await app.request(`/api/users/${elenaId}/follow`, {
        method: 'DELETE',
        headers: { Cookie: aliceCookie },
      });
      expect(unfollowRes.status).toBe(200);
      expect((await unfollowRes.json()).isFollowing).toBe(false);

      // 8. Alice's following feed is empty again
      const finalFollowingRes = await app.request('/api/posts?filter=following', {
        headers: { Cookie: aliceCookie },
      });
      expect(finalFollowingRes.status).toBe(200);
      expect(await finalFollowingRes.json()).toHaveLength(0);
    });
  });

  describe('Production Static Asset Serving Integration', () => {
    it('serves SPA HTML index and responds to health check', async () => {
      // Verify health check API
      const healthRes = await app.request('/api/health');
      expect(healthRes.status).toBe(200);
      const health = await healthRes.json();
      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeTypeOf('number');

      // Verify dist/index.html is built and accessible
      const distIndex = path.resolve(process.cwd(), 'dist/index.html');
      expect(fs.existsSync(distIndex)).toBe(true);
      const htmlContent = fs.readFileSync(distIndex, 'utf-8');
      expect(htmlContent).toContain('Afterglow');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { db, users, posts, credentials, reactions, replies, sqlite } from '../server/db';
import { eq } from 'drizzle-orm';

describe('Database Schema & Operations', () => {
  it('creates a user and a post with expiry', async () => {
    const userId = 'u-test-1';
    await db.insert(users).values({
      id: userId,
      username: 'dario',
      displayName: 'Dario',
      createdAt: new Date(),
    });

    const postId = 'p-test-1';
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await db.insert(posts).values({
      id: postId,
      authorId: userId,
      content: 'A quiet morning thought.',
      lifetimeHours: 24,
      createdAt: new Date(),
      expiresAt,
    });

    const result = await db.select().from(posts).where(eq(posts.id, postId));
    expect(result.length).toBe(1);
    expect(result[0].content).toBe('A quiet morning thought.');
    expect(result[0].lifetimeHours).toBe(24);
  });

  it('supports credentials, reactions, and replies', async () => {
    const userId = 'u-test-2';
    await db.insert(users).values({
      id: userId,
      username: 'aurora',
      displayName: 'Aurora',
      createdAt: new Date(),
    });

    // Credential
    const credId = 'cred-test-1';
    await db.insert(credentials).values({
      id: credId,
      userId,
      publicKey: 'test-public-key-base64',
      counter: 0,
      transports: JSON.stringify(['internal']),
      createdAt: new Date(),
    });

    const creds = await db.select().from(credentials).where(eq(credentials.id, credId));
    expect(creds.length).toBe(1);
    expect(creds[0].userId).toBe(userId);

    // Post
    const postId = 'p-test-2';
    await db.insert(posts).values({
      id: postId,
      authorId: userId,
      content: 'Evening calm.',
      lifetimeHours: 72,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
    });

    // Reaction
    const reactionId = 'r-test-1';
    await db.insert(reactions).values({
      id: reactionId,
      postId,
      userId,
      kind: 'glow',
      createdAt: new Date(),
    });

    const rxns = await db.select().from(reactions).where(eq(reactions.id, reactionId));
    expect(rxns.length).toBe(1);
    expect(rxns[0].kind).toBe('glow');

    // Reply
    const replyId = 'rep-test-1';
    await db.insert(replies).values({
      id: replyId,
      postId,
      authorId: userId,
      content: 'So peaceful.',
      createdAt: new Date(),
    });

    const reps = await db.select().from(replies).where(eq(replies.id, replyId));
    expect(reps.length).toBe(1);
    expect(reps[0].content).toBe('So peaceful.');
  });

  it('enforces foreign key constraints and unique reaction index', async () => {
    // Foreign key violation when author does not exist
    await expect(
      db.insert(posts).values({
        id: 'p-invalid-author',
        authorId: 'non-existent-user',
        content: 'Ghost post',
        lifetimeHours: 24,
        createdAt: new Date(),
        expiresAt: new Date(),
      })
    ).rejects.toThrow();

    // Setup valid user and post
    const userId = 'u-test-fk';
    await db.insert(users).values({
      id: userId,
      username: 'fk_tester',
      displayName: 'FK Tester',
      createdAt: new Date(),
    });

    const postId = 'p-test-fk';
    await db.insert(posts).values({
      id: postId,
      authorId: userId,
      content: 'Testing constraints',
      lifetimeHours: 24,
      createdAt: new Date(),
      expiresAt: new Date(),
    });

    // First reaction succeeds
    await db.insert(reactions).values({
      id: 'rx-1',
      postId,
      userId,
      kind: 'glow',
      createdAt: new Date(),
    });

    // Duplicate reaction by same user on same post violates uniqueIndex
    await expect(
      db.insert(reactions).values({
        id: 'rx-2',
        postId,
        userId,
        kind: 'warm',
        createdAt: new Date(),
      })
    ).rejects.toThrow();

    // Cascading delete: deleting user deletes their posts and reactions
    await db.delete(users).where(eq(users.id, userId));
    const remainingPosts = await db.select().from(posts).where(eq(posts.id, postId));
    expect(remainingPosts.length).toBe(0);
  });
});

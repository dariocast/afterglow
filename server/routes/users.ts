import { Hono } from 'hono';
import { eq, and, gt, desc, asc, inArray } from 'drizzle-orm';
import { db, users, follows, posts, reactions, replies, type User } from '../db';
import { requireAuth, getSessionUser } from '../auth/session';

export const usersRouter = new Hono();

type ReactionKind = 'glow' | 'warm' | 'thought';

interface ProfileUpdateFields {
  bio?: string | null;
  displayName?: string;
  avatarColor?: string | null;
}

/**
 * Validates and normalizes profile update fields from a PATCH /me request body.
 */
function parseProfileUpdate(
  body: unknown
): { updates: ProfileUpdateFields } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid JSON body' };
  }

  const record = body as Record<string, unknown>;
  const updates: ProfileUpdateFields = {};

  if (record.bio !== undefined) {
    if (record.bio === null) {
      updates.bio = null;
    } else if (typeof record.bio !== 'string') {
      return { error: 'Bio must be a string' };
    } else {
      const trimmedBio = record.bio.trim();
      if (trimmedBio.length > 160) {
        return { error: 'Bio exceeds 160 characters' };
      }
      updates.bio = trimmedBio;
    }
  }

  if (record.displayName !== undefined) {
    if (typeof record.displayName !== 'string') {
      return { error: 'Display name must be a string' };
    }
    const trimmedDisplayName = record.displayName.trim();
    if (trimmedDisplayName.length === 0) {
      return { error: 'Display name cannot be empty' };
    }
    if (trimmedDisplayName.length > 50) {
      return { error: 'Display name exceeds 50 characters' };
    }
    updates.displayName = trimmedDisplayName;
  }

  if (record.avatarColor !== undefined) {
    if (record.avatarColor === null) {
      updates.avatarColor = null;
    } else if (typeof record.avatarColor !== 'string') {
      return { error: 'Avatar color must be a string' };
    } else {
      const trimmedColor = record.avatarColor.trim();
      if (trimmedColor.length === 0 || trimmedColor.length > 32) {
        return { error: 'Invalid avatar color' };
      }
      updates.avatarColor = trimmedColor;
    }
  }

  return { updates };
}

/**
 * Fetches unexpired moments authored by targetUser, enriched with reactions and replies.
 */
async function fetchActiveMoments(targetUser: User, currentUserId: string | null) {
  const now = new Date();
  const activePosts = await db
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, targetUser.id), gt(posts.expiresAt, now)))
    .orderBy(desc(posts.createdAt));

  if (activePosts.length === 0) {
    return [];
  }

  const postIds = activePosts.map((p) => p.id);

  const postReactions = await db
    .select()
    .from(reactions)
    .where(inArray(reactions.postId, postIds));

  const postReplies = await db
    .select({
      id: replies.id,
      postId: replies.postId,
      authorId: replies.authorId,
      content: replies.content,
      createdAt: replies.createdAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarColor: users.avatarColor,
      },
    })
    .from(replies)
    .innerJoin(users, eq(replies.authorId, users.id))
    .where(inArray(replies.postId, postIds))
    .orderBy(asc(replies.createdAt));

  const reactionsByPost = new Map<string, typeof postReactions>();
  for (const r of postReactions) {
    const list = reactionsByPost.get(r.postId) || [];
    list.push(r);
    reactionsByPost.set(r.postId, list);
  }

  const repliesByPost = new Map<string, typeof postReplies>();
  for (const rep of postReplies) {
    const list = repliesByPost.get(rep.postId) || [];
    list.push(rep);
    repliesByPost.set(rep.postId, list);
  }

  const authorSummary = {
    id: targetUser.id,
    username: targetUser.username,
    displayName: targetUser.displayName,
    bio: targetUser.bio,
    avatarColor: targetUser.avatarColor,
  };

  return activePosts.map((p) => {
    const rxns = reactionsByPost.get(p.id) || [];
    const reps = repliesByPost.get(p.id) || [];

    const tally: Record<ReactionKind, number> = { glow: 0, warm: 0, thought: 0 };
    let userReaction: ReactionKind | null = null;

    for (const r of rxns) {
      if (r.kind in tally) {
        tally[r.kind as ReactionKind]++;
      }
      if (currentUserId && r.userId === currentUserId) {
        userReaction = r.kind as ReactionKind;
      }
    }

    return {
      id: p.id,
      authorId: p.authorId,
      content: p.content,
      lifetimeHours: p.lifetimeHours,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      author: authorSummary,
      reactions: tally,
      userReaction,
      replies: reps,
    };
  });
}

/**
 * PATCH /api/users/me
 * Updates authenticated user's bio, displayName, and/or avatarColor.
 */
usersRouter.patch('/me', requireAuth, async (c) => {
  const user = c.get('user')!;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = parseProfileUpdate(body);
  if ('error' in parsed) {
    return c.json({ error: parsed.error }, 400);
  }

  if (Object.keys(parsed.updates).length > 0) {
    await db
      .update(users)
      .set(parsed.updates)
      .where(eq(users.id, user.id));
  }

  const [updatedUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return c.json(updatedUser);
});

/**
 * GET /api/users/:username
 * Returns public user profile with active (unexpired) moments.
 */
usersRouter.get('/:username', async (c) => {
  const username = c.req.param('username');

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const currentUser = c.get('user') ?? (await getSessionUser(c));

  let isFollowing: boolean | null = false;
  if (currentUser) {
    if (currentUser.id === targetUser.id) {
      isFollowing = null;
    } else {
      const [followRelation] = await db
        .select({ id: follows.id })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, currentUser.id),
            eq(follows.followingId, targetUser.id)
          )
        )
        .limit(1);
      isFollowing = Boolean(followRelation);
    }
  }

  const activeMoments = await fetchActiveMoments(
    targetUser,
    currentUser?.id ?? null
  );

  return c.json({
    id: targetUser.id,
    username: targetUser.username,
    displayName: targetUser.displayName,
    bio: targetUser.bio,
    avatarColor: targetUser.avatarColor,
    createdAt: targetUser.createdAt,
    isFollowing,
    activeMoments,
  });
});

/**
 * POST /api/users/:id/follow
 * Idempotently follows another user.
 */
usersRouter.post('/:id/follow', requireAuth, async (c) => {
  const currentUser = c.get('user')!;
  const targetId = c.req.param('id');

  if (currentUser.id === targetId) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  const [targetUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  await db
    .insert(follows)
    .values({
      id: crypto.randomUUID(),
      followerId: currentUser.id,
      followingId: targetId,
      createdAt: new Date(),
    })
    .onConflictDoNothing({
      target: [follows.followerId, follows.followingId],
    });

  return c.json({ success: true, isFollowing: true });
});

/**
 * DELETE /api/users/:id/follow
 * Idempotently unfollows a user.
 */
usersRouter.delete('/:id/follow', requireAuth, async (c) => {
  const currentUser = c.get('user')!;
  const targetId = c.req.param('id');

  await db
    .delete(follows)
    .where(
      and(
        eq(follows.followerId, currentUser.id),
        eq(follows.followingId, targetId)
      )
    );

  return c.json({ success: true, isFollowing: false });
});

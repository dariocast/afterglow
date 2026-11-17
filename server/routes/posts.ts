import { Hono } from 'hono';
import { eq, and, gt, lte, desc, asc, inArray } from 'drizzle-orm';
import { db, posts, reactions, replies, users, follows, type User } from '../db';
import { requireAuth, getSessionUser } from '../auth/session';

export const postsRouter = new Hono();

const VALID_LIFETIMES = [24, 72, 168];
const VALID_REACTION_KINDS = ['glow', 'warm', 'thought'] as const;
type ReactionKind = (typeof VALID_REACTION_KINDS)[number];

const authorSelect = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  bio: users.bio,
  avatarColor: users.avatarColor,
};

function serializeAuthor(user: User) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarColor: user.avatarColor,
  };
}

/**
 * GET /api/posts?filter=[all|ending|mine|following]
 * Returns active, non-expired posts matching filter.
 */
postsRouter.get('/', async (c) => {
  const filter = c.req.query('filter') || 'all';
  const now = new Date();
  const currentUser = c.get('user') ?? (await getSessionUser(c));

  // Determine query conditions
  let whereClause;
  let orderByClause = desc(posts.createdAt);

  if (filter === 'mine') {
    if (!currentUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    whereClause = and(gt(posts.expiresAt, now), eq(posts.authorId, currentUser.id));
  } else if (filter === 'following') {
    if (!currentUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const followRows = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, currentUser.id));
    if (followRows.length === 0) {
      return c.json([]);
    }
    const followedIds = followRows.map((row) => row.followingId);
    whereClause = and(gt(posts.expiresAt, now), inArray(posts.authorId, followedIds));
  } else if (filter === 'ending') {
    const endingThreshold = new Date(now.getTime() + 48 * 3600 * 1000);
    whereClause = and(gt(posts.expiresAt, now), lte(posts.expiresAt, endingThreshold));
    orderByClause = asc(posts.expiresAt);
  } else {
    // 'all' or default
    whereClause = gt(posts.expiresAt, now);
  }

  // 1. Fetch matching active posts with authors
  const activePosts = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      content: posts.content,
      lifetimeHours: posts.lifetimeHours,
      createdAt: posts.createdAt,
      expiresAt: posts.expiresAt,
      author: authorSelect,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(whereClause)
    .orderBy(orderByClause);

  if (activePosts.length === 0) {
    return c.json([]);
  }

  const postIds = activePosts.map((p) => p.id);

  // 2. Fetch all reactions for these posts
  const postReactions = await db
    .select()
    .from(reactions)
    .where(inArray(reactions.postId, postIds));

  // 3. Fetch all replies with author info for these posts
  const postReplies = await db
    .select({
      id: replies.id,
      postId: replies.postId,
      authorId: replies.authorId,
      content: replies.content,
      createdAt: replies.createdAt,
      author: authorSelect,
    })
    .from(replies)
    .innerJoin(users, eq(replies.authorId, users.id))
    .where(inArray(replies.postId, postIds))
    .orderBy(asc(replies.createdAt));

  // Group reactions and replies by postId
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

  // Assemble full feed payload
  const feed = activePosts.map((p) => {
    const rxns = reactionsByPost.get(p.id) || [];
    const reps = repliesByPost.get(p.id) || [];

    const tally = { glow: 0, warm: 0, thought: 0 };
    let userReaction: string | null = null;

    for (const r of rxns) {
      if (r.kind in tally) {
        tally[r.kind as keyof typeof tally]++;
      }
      if (currentUser && r.userId === currentUser.id) {
        userReaction = r.kind;
      }
    }

    return {
      id: p.id,
      authorId: p.authorId,
      content: p.content,
      lifetimeHours: p.lifetimeHours,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      author: p.author,
      reactions: tally,
      userReaction,
      replies: reps,
    };
  });

  return c.json(feed);
});

/**
 * POST /api/posts
 * Body: { content, lifetimeHours }
 */
postsRouter.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { content, lifetimeHours } = body;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return c.json({ error: 'Content cannot be empty' }, 400);
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length > 420) {
    return c.json({ error: 'Content exceeds 420 characters' }, 400);
  }

  if (typeof lifetimeHours !== 'number' || !VALID_LIFETIMES.includes(lifetimeHours)) {
    return c.json({ error: 'Lifetime hours must be 24, 72, or 168' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + lifetimeHours * 3600 * 1000);

  const newPost = {
    id,
    authorId: user.id,
    content: trimmedContent,
    lifetimeHours,
    createdAt: now,
    expiresAt,
  };

  await db.insert(posts).values(newPost);

  return c.json(
    {
      ...newPost,
      author: serializeAuthor(user),
      reactions: { glow: 0, warm: 0, thought: 0 },
      userReaction: null,
      replies: [],
    },
    201
  );
});

/**
 * DELETE /api/posts/:id
 * Author can delete their own post early.
 */
postsRouter.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');

  const existing = (await db.select().from(posts).where(eq(posts.id, id)))[0];
  if (!existing) {
    return c.json({ error: 'Post not found' }, 404);
  }

  if (existing.authorId !== user.id) {
    return c.json({ error: 'Forbidden: You are not the author of this post' }, 403);
  }

  await db.delete(posts).where(eq(posts.id, id));

  return c.json({ success: true });
});

/**
 * POST /api/posts/:id/reactions
 * Body: { kind: 'glow' | 'warm' | 'thought' }
 * Toggles or updates reaction. Unique per user per post.
 */
postsRouter.post('/:id/reactions', requireAuth, async (c) => {
  const user = c.get('user')!;
  const postId = c.req.param('id');

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { kind } = body;
  if (!VALID_REACTION_KINDS.includes(kind as ReactionKind)) {
    return c.json({ error: `Reaction kind must be one of: ${VALID_REACTION_KINDS.join(', ')}` }, 400);
  }

  // Post must exist and not be expired
  const targetPost = (
    await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), gt(posts.expiresAt, new Date())))
  )[0];

  if (!targetPost) {
    return c.json({ error: 'Post not found or expired' }, 404);
  }

  const existingReaction = (
    await db
      .select()
      .from(reactions)
      .where(and(eq(reactions.postId, postId), eq(reactions.userId, user.id)))
  )[0];

  let reactionResult: { id: string; kind: string } | null = null;

  if (existingReaction) {
    if (existingReaction.kind === kind) {
      // Toggle off: remove existing reaction
      await db.delete(reactions).where(eq(reactions.id, existingReaction.id));
      reactionResult = null;
    } else {
      // Update reaction to new kind
      await db
        .update(reactions)
        .set({ kind, createdAt: new Date() })
        .where(eq(reactions.id, existingReaction.id));
      reactionResult = { id: existingReaction.id, kind };
    }
  } else {
    // Insert new reaction
    const reactionId = crypto.randomUUID();
    await db.insert(reactions).values({
      id: reactionId,
      postId,
      userId: user.id,
      kind,
      createdAt: new Date(),
    });
    reactionResult = { id: reactionId, kind };
  }

  // Calculate updated reactions tally and user's current reaction
  const allReactions = await db
    .select({ kind: reactions.kind, userId: reactions.userId })
    .from(reactions)
    .where(eq(reactions.postId, postId));

  const tally: Record<ReactionKind, number> = { glow: 0, warm: 0, thought: 0 };
  let currentUserReaction: ReactionKind | null = null;

  for (const r of allReactions) {
    if (r.kind in tally) {
      tally[r.kind as ReactionKind]++;
    }
    if (r.userId === user.id) {
      currentUserReaction = r.kind as ReactionKind;
    }
  }

  return c.json({
    success: true,
    reaction: reactionResult,
    reactions: tally,
    userReaction: currentUserReaction,
  });
});

/**
 * POST /api/posts/:id/replies
 * Body: { content }
 */
postsRouter.post('/:id/replies', requireAuth, async (c) => {
  const user = c.get('user')!;
  const postId = c.req.param('id');

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { content } = body;
  if (typeof content !== 'string' || content.trim().length === 0) {
    return c.json({ error: 'Reply content cannot be empty' }, 400);
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length > 420) {
    return c.json({ error: 'Reply content exceeds 420 characters' }, 400);
  }

  // Post must exist and not be expired
  const targetPost = (
    await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), gt(posts.expiresAt, new Date())))
  )[0];

  if (!targetPost) {
    return c.json({ error: 'Post not found or expired' }, 404);
  }

  const replyId = crypto.randomUUID();
  const now = new Date();

  await db.insert(replies).values({
    id: replyId,
    postId,
    authorId: user.id,
    content: trimmedContent,
    createdAt: now,
  });

  return c.json(
    {
      id: replyId,
      postId,
      authorId: user.id,
      content: trimmedContent,
      createdAt: now,
      author: serializeAuthor(user),
    },
    201
  );
});

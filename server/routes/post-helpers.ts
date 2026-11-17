import { eq, asc, inArray } from 'drizzle-orm';
import { db, users, reactions, replies, type User } from '../db';

export const VALID_REACTION_KINDS = ['glow', 'warm', 'thought'] as const;
export type ReactionKind = (typeof VALID_REACTION_KINDS)[number];

export const authorSelect = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  bio: users.bio,
  avatarColor: users.avatarColor,
};

export function serializeAuthor(user: User) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    avatarColor: user.avatarColor,
  };
}

export interface PostBase {
  id: string;
  authorId: string;
  content: string;
  lifetimeHours: number;
  createdAt: Date;
  expiresAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarColor: string | null;
  };
}

/**
 * Enriches a list of posts with aggregated reaction counts, currentUser's reaction,
 * and replies with harmonized author projections (including bio and avatarColor).
 */
export async function hydratePosts<T extends PostBase>(
  postsList: T[],
  currentUserId: string | null
) {
  if (postsList.length === 0) {
    return [];
  }

  const postIds = postsList.map((p) => p.id);

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
      author: authorSelect,
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

  return postsList.map((p) => {
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
      author: p.author,
      reactions: tally,
      userReaction,
      replies: reps,
    };
  });
}

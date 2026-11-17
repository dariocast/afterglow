import { lte } from 'drizzle-orm';
import { db, posts } from '../db';

let reaperInterval: NodeJS.Timeout | null = null;

/**
 * Actively prunes expired posts from the database.
 * Cascading foreign keys will automatically delete associated reactions and replies.
 * Returns the count of purged posts.
 */
export async function purgeExpiredPosts(now: Date = new Date()): Promise<number> {
  const deleted = await db
    .delete(posts)
    .where(lte(posts.expiresAt, now))
    .returning({ id: posts.id });

  return deleted.length;
}

/**
 * Starts the periodic in-process expiry reaper.
 * Default interval is 15 minutes.
 */
export function startReaper(intervalMs: number = 15 * 60 * 1000): NodeJS.Timeout {
  if (reaperInterval) {
    return reaperInterval;
  }

  reaperInterval = setInterval(async () => {
    try {
      const purged = await purgeExpiredPosts();
      if (purged > 0) {
        console.log(`[Expiry Reaper] Purged ${purged} expired post(s)`);
      }
    } catch (err) {
      console.error('[Expiry Reaper] Error purging expired posts:', err);
    }
  }, intervalMs);

  reaperInterval.unref?.();
  return reaperInterval;
}

/**
 * Stops the periodic in-process expiry reaper.
 */
export function stopReaper(): void {
  if (reaperInterval) {
    clearInterval(reaperInterval);
    reaperInterval = null;
  }
}

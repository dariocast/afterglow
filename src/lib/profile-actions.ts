import { api, type UserProfile, type ReactionKind } from './api';

export async function handleMomentDelete(
  momentId: string,
  profile: UserProfile | null,
  onPostUpdated?: () => void
): Promise<void> {
  await api.deletePost(momentId);
  if (profile) {
    profile.activeMoments = profile.activeMoments.filter((m) => m.id !== momentId);
  }
  onPostUpdated?.();
}

export async function handleMomentReact(
  momentId: string,
  kind: ReactionKind,
  profile: UserProfile | null,
  effectiveCurrentUserId?: string | null,
  onRequestAuth?: () => void,
  onPostUpdated?: () => void
): Promise<void> {
  if (!effectiveCurrentUserId) {
    onRequestAuth?.();
    return;
  }
  const res = await api.reactToPost(momentId, kind);
  if (profile) {
    profile.activeMoments = profile.activeMoments.map((m) =>
      m.id === momentId ? { ...m, reactions: res.reactions, userReaction: res.userReaction } : m
    );
  }
  onPostUpdated?.();
}

export async function handleMomentReply(
  momentId: string,
  content: string,
  profile: UserProfile | null,
  effectiveCurrentUserId?: string | null,
  onRequestAuth?: () => void,
  onPostUpdated?: () => void
): Promise<void> {
  if (!effectiveCurrentUserId) {
    onRequestAuth?.();
    return;
  }
  const newReply = await api.addReply(momentId, content);
  if (profile) {
    profile.activeMoments = profile.activeMoments.map((m) =>
      m.id === momentId ? { ...m, replies: [...(m.replies || []), newReply] } : m
    );
  }
  onPostUpdated?.();
}

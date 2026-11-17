<script lang="ts">
  import { api, type UserProfile, type ReactionKind } from '../lib/api';
  import { authStore } from '../lib/auth.svelte';
  import {
    handleMomentDelete,
    handleMomentReact,
    handleMomentReply,
  } from '../lib/profile-actions';
  import Icon from './icons/Icon.svelte';
  import PostCard from './PostCard.svelte';

  interface Props {
    username: string;
    initialProfile?: UserProfile | null;
    initialEditingBio?: boolean;
    currentUserId?: string | null;
    onClose: () => void;
    onPostUpdated?: () => void;
    onRequestAuth?: () => void;
  }

  let {
    username,
    initialProfile = null,
    initialEditingBio = false,
    currentUserId = undefined,
    onClose,
    onPostUpdated,
    onRequestAuth,
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let profile = $state<UserProfile | null>(initialProfile);
  // svelte-ignore state_referenced_locally
  let isLoading = $state(!initialProfile);
  let loadError = $state<string | null>(null);

  // Bio editing state
  // svelte-ignore state_referenced_locally
  let isEditingBio = $state(initialEditingBio);
  // svelte-ignore state_referenced_locally
  let bioDraft = $state(initialProfile?.bio || '');
  let isSavingBio = $state(false);
  let bioError = $state<string | null>(null);

  let momentActionError = $state<string | null>(null);

  // Follow action state
  let isTogglingFollow = $state(false);

  const effectiveCurrentUserId = $derived(
    currentUserId !== undefined ? currentUserId : authStore.currentUser?.id || null
  );

  const isOwnProfile = $derived(
    Boolean(profile && effectiveCurrentUserId && profile.id === effectiveCurrentUserId)
  );

  const initials = $derived.by(() => {
    if (!profile) return '';
    const name = profile.displayName || profile.username || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  const memberSinceLabel = $derived.by(() => {
    if (!profile?.createdAt) return 'Member';
    const d = new Date(profile.createdAt);
    if (isNaN(d.getTime())) return 'Member';
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return `Member since ${month} ${year}`;
  });

  async function loadProfile(userToLoad: string) {
    isLoading = true;
    loadError = null;
    try {
      const res = await api.fetchUserProfile(userToLoad);
      profile = res;
      bioDraft = res.bio || '';
    } catch (err: any) {
      loadError = err.message || 'Failed to load profile';
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (username) {
      // If we don't already have the matching initialProfile loaded
      if (!profile || profile.username !== username) {
        loadProfile(username);
      } else {
        bioDraft = profile.bio || '';
      }
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
      return () => {
        window.removeEventListener('keydown', handleKeydown);
      };
    }
  });

  function startEditBio() {
    bioDraft = profile?.bio || '';
    bioError = null;
    isEditingBio = true;
  }

  function cancelEditBio() {
    bioDraft = profile?.bio || '';
    bioError = null;
    isEditingBio = false;
  }

  async function saveBio() {
    if (!profile) return;
    isSavingBio = true;
    bioError = null;
    try {
      const updated = await authStore.updateProfile({ bio: bioDraft.trim() });
      profile = {
        ...profile,
        bio: updated.bio || null,
      };
      isEditingBio = false;
      onPostUpdated?.();
    } catch (err: any) {
      bioError = err.message || 'Failed to update bio';
    } finally {
      isSavingBio = false;
    }
  }

  async function toggleFollow() {
    if (!profile || isTogglingFollow) return;

    if (!effectiveCurrentUserId) {
      onRequestAuth?.();
      return;
    }

    const previousState = profile.isFollowing;
    const nextState = !previousState;

    // Optimistic update
    profile = {
      ...profile,
      isFollowing: nextState,
    };
    isTogglingFollow = true;

    try {
      if (nextState) {
        await api.followUser(profile.id);
      } else {
        await api.unfollowUser(profile.id);
      }
      onPostUpdated?.();
    } catch (err) {
      // Revert optimistic update
      profile = {
        ...profile,
        isFollowing: previousState,
      };
    } finally {
      isTogglingFollow = false;
    }
  }

  async function onDeleteMoment(momentId: string) {
    momentActionError = null;
    try {
      await handleMomentDelete(momentId, profile, onPostUpdated);
    } catch (err: any) {
      momentActionError = err?.message || 'Failed to delete moment';
    }
  }

  async function onReactMoment(momentId: string, kind: ReactionKind) {
    momentActionError = null;
    try {
      await handleMomentReact(
        momentId,
        kind,
        profile,
        effectiveCurrentUserId,
        onRequestAuth,
        onPostUpdated
      );
    } catch (err: any) {
      momentActionError = err?.message || 'Failed to react';
    }
  }

  async function onReplyMoment(momentId: string, content: string) {
    momentActionError = null;
    try {
      await handleMomentReply(
        momentId,
        content,
        profile,
        effectiveCurrentUserId,
        onRequestAuth,
        onPostUpdated
      );
    } catch (err: any) {
      momentActionError = err?.message || 'Failed to submit reply';
      throw err;
    }
  }
</script>

<div class="drawer-backdrop" onclick={onClose} role="presentation"></div>

<div
  class="profile-drawer-panel"
  role="dialog"
  aria-modal="true"
  aria-label={profile ? `${profile.displayName || profile.username}'s profile` : 'User profile'}
>
  <div class="drawer-header-bar">
    <span class="drawer-title-eyebrow">Profile</span>
    <button
      class="close-button"
      type="button"
      onclick={onClose}
      aria-label="Close profile drawer"
      title="Close (Esc)"
    >
      <Icon name="close" size={16} />
    </button>
  </div>

  <div class="drawer-body">
    {#if isLoading && !profile}
      <div class="drawer-loading">
        <span class="spinner" aria-hidden="true"></span>
        <p>Opening profile...</p>
      </div>
    {:else if loadError && !profile}
      <div class="drawer-error" role="alert">
        <p>{loadError}</p>
        <button class="retry-btn" type="button" onclick={() => loadProfile(username)}>
          Retry
        </button>
      </div>
    {:else if profile}
      <section class="profile-card">
        <div class="profile-identity">
          <div
            class="profile-avatar-badge"
            style={profile.avatarColor ? `background-color: ${profile.avatarColor}` : ''}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div class="profile-names">
            <h2 class="profile-display-name">{profile.displayName || profile.username}</h2>
            <span class="profile-handle">@{profile.username}</span>
            <span class="profile-joined">{memberSinceLabel}</span>
          </div>

          {#if !isOwnProfile}
            <div class="profile-actions">
              <button
                class="follow-btn"
                class:following={profile.isFollowing}
                type="button"
                onclick={toggleFollow}
                disabled={isTogglingFollow}
                aria-pressed={profile.isFollowing ?? false}
              >
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          {/if}
        </div>

        <div class="profile-bio-section">
          {#if isOwnProfile}
            {#if isEditingBio}
              <div class="bio-editor">
                <textarea
                  class="bio-textarea"
                  bind:value={bioDraft}
                  placeholder="Share a quiet thought about yourself..."
                  maxlength={160}
                  rows={3}
                  aria-label="Edit your bio"
                ></textarea>
                <div class="bio-editor-footer">
                  <span class="bio-char-count">{bioDraft.length}/160</span>
                  <div class="bio-editor-actions">
                    <button
                      class="bio-cancel-btn"
                      type="button"
                      onclick={cancelEditBio}
                      disabled={isSavingBio}
                    >
                      Cancel
                    </button>
                    <button
                      class="bio-save-btn"
                      type="button"
                      onclick={saveBio}
                      disabled={isSavingBio}
                    >
                      {isSavingBio ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                {#if bioError}
                  <p class="bio-error" role="alert">{bioError}</p>
                {/if}
              </div>
            {:else}
              <div class="bio-display edit-bio">
                <p class="bio-text" class:empty={!profile.bio}>
                  {profile.bio || 'Add a bio to your profile...'}
                </p>
                <button
                  class="bio-edit-trigger"
                  type="button"
                  onclick={startEditBio}
                  aria-label="Edit bio"
                >
                  Edit bio
                </button>
              </div>
            {/if}
          {:else}
            <p class="bio-text" class:empty={!profile.bio}>
              {profile.bio || 'No bio yet.'}
            </p>
          {/if}
        </div>
      </section>

      <section class="profile-moments-section" aria-labelledby="moments-heading">
        <div class="moments-header">
          <h3 id="moments-heading" class="moments-title">
            Active Moments
            <span class="moments-count">({profile.activeMoments?.length || 0})</span>
          </h3>
          <span class="moments-note">Visible until their finite time dissolves</span>
        </div>

        {#if momentActionError}
          <p class="moment-action-error" role="alert">{momentActionError}</p>
        {/if}

        {#if !profile.activeMoments || profile.activeMoments.length === 0}
          <div class="empty-moments">
            <p>No active moments. Thoughts will appear here while they live.</p>
          </div>
        {:else}
          <div class="moments-stream">
            {#each profile.activeMoments as moment (moment.id)}
              <PostCard
                post={moment}
                currentUserId={effectiveCurrentUserId}
                onRequestAuth={onRequestAuth}
                onReact={(kind) => onReactMoment(moment.id, kind)}
                onReply={(content) => onReplyMoment(moment.id, content)}
                ondelete={() => onDeleteMoment(moment.id)}
              />
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </div>
</div>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    z-index: 999;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .profile-drawer-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 480px;
    height: 100vh;
    background-color: var(--surface);
    background-image: radial-gradient(var(--dot-color) 1px, transparent 1px);
    background-size: 20px 20px;
    border-left: 1px solid var(--line);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (max-width: 640px) {
    .profile-drawer-panel {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      max-width: 100%;
      max-height: 85vh;
      height: 85vh;
      border-left: none;
      border-top: 1px solid var(--line);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      animation: slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
  }

  .drawer-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }

  .drawer-title-eyebrow {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  .close-button {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-xs);
    color: var(--muted);
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .close-button:hover {
    color: var(--ink);
    background: var(--surface-subtle);
    border-color: var(--line);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .drawer-loading,
  .drawer-error {
    text-align: center;
    padding: 40px 20px;
    color: var(--muted);
    font-size: 13px;
  }

  .retry-btn {
    margin-top: 12px;
    padding: 6px 14px;
    background: var(--ink);
    color: var(--bg);
    border-radius: var(--radius-xs);
    font-size: 12px;
  }

  .profile-card {
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .profile-identity {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }

  .profile-avatar-badge {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--surface);
    color: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 18px;
    font-weight: 600;
    border: 1px solid var(--line);
    flex-shrink: 0;
  }

  .profile-names {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .profile-display-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: -0.01em;
  }

  .profile-handle {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-secondary);
  }

  .profile-joined {
    font-size: 11px;
    color: var(--muted);
    margin-top: 4px;
  }

  .profile-actions {
    flex-shrink: 0;
  }

  .follow-btn {
    padding: 6px 14px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    font-weight: 500;
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
    transition: all var(--transition-fast);
  }

  .follow-btn.following {
    background: transparent;
    color: var(--ink);
    border-color: var(--line-strong);
  }

  .follow-btn:hover {
    opacity: 0.85;
  }

  .profile-bio-section {
    border-top: 1px solid var(--line);
    padding-top: 12px;
  }

  .bio-text {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .bio-text.empty {
    color: var(--muted);
    font-style: italic;
  }

  .bio-display {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bio-edit-trigger {
    align-self: flex-start;
    font-size: 11px;
    color: var(--muted);
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color var(--transition-fast);
  }

  .bio-edit-trigger:hover {
    color: var(--ink);
  }

  .bio-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bio-textarea {
    width: 100%;
    padding: 8px 10px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    line-height: 1.4;
    resize: vertical;
  }

  .bio-textarea:focus {
    outline: none;
    border-color: var(--ink);
  }

  .bio-editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bio-char-count {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
  }

  .bio-editor-actions {
    display: flex;
    gap: 8px;
  }

  .bio-cancel-btn {
    padding: 4px 10px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    color: var(--muted);
  }

  .bio-save-btn {
    padding: 4px 12px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    font-weight: 500;
    background: var(--ink);
    color: var(--bg);
  }

  .bio-error {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--danger);
  }

  .profile-moments-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .moments-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }

  .moments-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }

  .moments-count {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 400;
    color: var(--muted);
  }

  .moments-note {
    font-size: 11px;
    color: var(--muted);
    font-style: italic;
  }

  .moment-action-error {
    margin: 4px 0 8px;
    font-size: 12px;
    color: var(--danger);
  }

  .empty-moments {
    padding: 32px 16px;
    text-align: center;
    color: var(--muted);
    font-size: 13px;
    font-style: italic;
    background: var(--surface-subtle);
    border: 1px dashed var(--line);
    border-radius: var(--radius-sm);
  }

  .moments-stream {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slideInUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>

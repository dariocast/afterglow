<script lang="ts">
  import type { Post, ReactionKind } from '../lib/api';
  import Icon from './icons/Icon.svelte';

  interface Props {
    post: Post;
    currentUserId?: string | null;
    initialShowReplies?: boolean;
    onReact?: (kind: ReactionKind) => void;
    onReply?: (content: string) => Promise<void>;
    onRequestAuth?: () => void;
    ondelete?: (id: string) => void;
    onDelete?: (id: string) => void;
    onAuthorClick?: (username: string) => void;
  }

  let {
    post,
    currentUserId = null,
    initialShowReplies = false,
    onReact,
    onReply,
    onRequestAuth,
    ondelete,
    onDelete,
    onAuthorClick,
  }: Props = $props();

  const isAuthor = $derived(Boolean(currentUserId && currentUserId === post.authorId));

  function handleDelete() {
    if (!isAuthor) return;
    const confirmed =
      typeof window === 'undefined' || !window.confirm
        ? true
        : window.confirm('Let this moment fade away early? This cannot be undone.');
    if (confirmed) {
      (ondelete || onDelete)?.(post.id);
    }
  }

  let now = $state(Date.now());
  // svelte-ignore state_referenced_locally
  let showReplies = $state(initialShowReplies);
  let replyText = $state('');
  let isSubmittingReply = $state(false);
  let copyFeedback = $state(false);

  // Live countdown update
  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(interval);
  });

  const expiresTime = $derived(new Date(post.expiresAt).getTime());
  const createdTime = $derived(new Date(post.createdAt).getTime());
  const remainingMs = $derived(Math.max(0, expiresTime - now));
  const totalDurationMs = $derived(Math.max(1, expiresTime - createdTime));
  const lifespanPercent = $derived(
    Math.min(100, Math.max(1, (remainingMs / totalDurationMs) * 100))
  );

  const isEndingSoon = $derived(remainingMs < 3600 * 1000 && remainingMs > 0);
  const isExpired = $derived(remainingMs <= 0);

  const expiryLabel = $derived.by(() => {
    if (remainingMs <= 0) return 'expired';
    const hours = remainingMs / (3600 * 1000);
    if (hours < 1) return 'ending soon';
    if (hours < 24) return `${Math.ceil(hours)}h left`;
    const days = Math.ceil(hours / 24);
    return `${days}d left`;
  });

  const initials = $derived.by(() => {
    const name = post.author?.displayName || post.author?.username || 'Anon';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  function handleReactionClick(kind: ReactionKind) {
    if (!currentUserId && onRequestAuth) {
      onRequestAuth();
      return;
    }
    onReact?.(kind);
  }

  async function handleReplySubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!currentUserId && onRequestAuth) {
      onRequestAuth();
      return;
    }
    const trimmed = replyText.trim();
    if (!trimmed || isSubmittingReply) return;

    isSubmittingReply = true;
    try {
      if (onReply) {
        await onReply(trimmed);
      }
      replyText = '';
    } finally {
      isSubmittingReply = false;
    }
  }

  async function handleShare() {
    const text = `"${post.content}" — ${post.author?.displayName || post.author?.username} on Afterglow`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        copyFeedback = true;
        setTimeout(() => { copyFeedback = false; }, 2000);
        return;
      }
    } catch {
      // fallback
    }
    window.prompt('Copy this moment:', text);
  }
</script>

<article
  class="post-card post-stream-item"
  class:ending-soon={isEndingSoon}
  class:expired={isExpired}
  data-id={post.id}
>
  <div class="post-layout">
    <div class="post-avatar-col">
      {#if onAuthorClick && post.author?.username}
        <button
          class="avatar author-btn"
          type="button"
          onclick={() => onAuthorClick?.(post.author.username)}
          aria-label="View @{post.author.username}'s profile"
          style={post.author?.avatarColor ? `background-color: ${post.author.avatarColor}; color: #fbf9f5;` : ''}
        >
          {initials}
        </button>
      {:else}
        <div
          class="avatar"
          style={post.author?.avatarColor ? `background-color: ${post.author.avatarColor}; color: #fbf9f5;` : ''}
          aria-hidden="true"
        >
          {initials}
        </div>
      {/if}
    </div>

    <div class="post-main-col">
      <div class="post-header">
        <div class="author-info">
          {#if onAuthorClick && post.author?.username}
            <button
              class="author-btn author-name-btn"
              type="button"
              onclick={() => onAuthorClick?.(post.author.username)}
              aria-label="View @{post.author.username}'s profile"
            >
              <span class="author-name">{post.author?.displayName || 'Anonymous'}</span>
              <span class="author-handle">@{post.author?.username || 'user'}</span>
            </button>
          {:else}
            <span class="author-name">{post.author?.displayName || 'Anonymous'}</span>
            <span class="author-handle">@{post.author?.username || 'user'}</span>
          {/if}
        </div>

        <div class="post-meta-actions">
          {#if isAuthor}
            <button
              class="delete-btn"
              type="button"
              onclick={handleDelete}
              aria-label="Delete this moment"
              title="Delete this moment early"
            >
              <Icon name="trash" size={13} />
              <span class="delete-label">Delete</span>
            </button>
          {/if}

          <div
            class="expiry-pill"
            class:urgent={isEndingSoon}
            title={new Date(post.expiresAt).toLocaleString()}
          >
            <Icon name="clock" size={11} />
            <span>{expiryLabel}</span>
          </div>
        </div>
      </div>

      <!-- Lifespan progress hairline -->
      <div
        class="lifespan-track"
        role="progressbar"
        aria-valuenow={Math.round(lifespanPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Remaining moment lifespan"
      >
        <div
          class="lifespan-fill life-line"
          style="width: {lifespanPercent}%;"
          class:urgent={isEndingSoon}
        ></div>
      </div>

      <p class="post-content">{post.content}</p>

      <div class="post-footer">
        <div class="reactions-group" role="group" aria-label="Reactions">
          <button
            class="reaction-btn"
            class:active={post.userReaction === 'glow'}
            type="button"
            onclick={() => handleReactionClick('glow')}
            aria-label="Glow reaction ({post.reactions?.glow || 0})"
          >
            <Icon name="spark" size={13} />
            <span class="reaction-label">glow</span>
            {#if (post.reactions?.glow || 0) > 0}
              <span class="reaction-count">{post.reactions?.glow}</span>
            {/if}
          </button>

          <button
            class="reaction-btn"
            class:active={post.userReaction === 'warm'}
            type="button"
            onclick={() => handleReactionClick('warm')}
            aria-label="Warm reaction ({post.reactions?.warm || 0})"
          >
            <Icon name="heart" size={13} />
            <span class="reaction-label">warm</span>
            {#if (post.reactions?.warm || 0) > 0}
              <span class="reaction-count">{post.reactions?.warm}</span>
            {/if}
          </button>

          <button
            class="reaction-btn"
            class:active={post.userReaction === 'thought'}
            type="button"
            onclick={() => handleReactionClick('thought')}
            aria-label="Thought reaction ({post.reactions?.thought || 0})"
          >
            <Icon name="bubble" size={13} />
            <span class="reaction-label">thought</span>
            {#if (post.reactions?.thought || 0) > 0}
              <span class="reaction-count">{post.reactions?.thought}</span>
            {/if}
          </button>
        </div>

        <div class="utility-actions">
          <button
            class="utility-btn"
            type="button"
            onclick={() => { showReplies = !showReplies; }}
            aria-expanded={showReplies}
            aria-label="{post.replies?.length || 0} replies"
          >
            <span>{post.replies?.length || 0} replies</span>
          </button>

          <button
            class="utility-btn icon-only"
            type="button"
            onclick={handleShare}
            aria-label="Share this moment"
            title="Copy moment quote"
          >
            {#if copyFeedback}
              <Icon name="check" size={13} />
            {:else}
              <Icon name="share" size={13} />
            {/if}
          </button>
        </div>
      </div>

      {#if showReplies}
        <div class="replies-section">
          {#if post.replies && post.replies.length > 0}
            <div class="replies-list">
              {#each post.replies as reply}
                <div class="reply-card">
                  <div class="reply-header">
                    <strong>{reply.author?.displayName || reply.author?.username || 'Guest'}</strong>
                    <span class="reply-time">{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p class="reply-text">{reply.content}</p>
                </div>
              {/each}
            </div>
          {:else}
            <p class="no-replies">No replies yet.</p>
          {/if}

          <form class="reply-form" onsubmit={handleReplySubmit}>
            <label class="sr-only" for="reply-input-{post.id}">Write a reply</label>
            <input
              id="reply-input-{post.id}"
              type="text"
              bind:value={replyText}
              placeholder={currentUserId ? "Write a reply…" : "Sign in to reply…"}
              maxlength="280"
              disabled={isSubmittingReply}
              required
            />
            <button
              type="submit"
              class="reply-submit-btn"
              disabled={!replyText.trim() || isSubmittingReply}
            >
              {isSubmittingReply ? '...' : 'Reply'}
            </button>
          </form>
        </div>
      {/if}
    </div>
  </div>
</article>

<style>
  .post-card {
    background: transparent;
    border-bottom: 1px solid var(--line);
    padding: 20px 0 18px;
    position: relative;
    transition: opacity var(--transition-fast);
  }

  .post-card.expired {
    opacity: 0.35;
    pointer-events: none;
  }

  .post-card.ending-soon {
    background: var(--accent-tint);
  }

  .post-layout {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .post-avatar-col {
    flex-shrink: 0;
  }

  .author-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    padding: 0;
    transition: opacity var(--transition-fast);
  }

  .author-btn:hover {
    opacity: 0.8;
  }

  .author-name-btn {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-xs);
    background: var(--surface-subtle);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    border: 1px solid var(--line);
    margin-top: 2px;
  }

  .post-main-col {
    flex: 1;
    min-width: 0;
  }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .author-info {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .author-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }

  .author-handle {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
  }

  .post-meta-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .delete-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--muted);
    padding: 2px 5px;
    border-radius: var(--radius-xs);
    transition: all var(--transition-fast);
  }

  .delete-btn:hover {
    color: var(--danger);
  }

  .expiry-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .expiry-pill.urgent {
    color: var(--danger);
    font-weight: 600;
  }

  .lifespan-track {
    height: 1px;
    background: var(--line-subtle);
    margin: 4px 0 10px;
    overflow: hidden;
  }

  .lifespan-fill {
    height: 100%;
    background: var(--line-strong);
    transition: width 1s linear;
  }

  .lifespan-fill.urgent {
    background: var(--danger);
  }

  .post-content {
    font-family: var(--serif);
    font-size: 16px;
    line-height: 1.55;
    color: var(--ink);
    margin: 6px 0 14px;
    word-break: break-word;
  }

  .post-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 6px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .reactions-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .reaction-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border-radius: var(--radius-xs);
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .reaction-btn:hover {
    color: var(--ink);
    background: var(--surface-subtle);
  }

  .reaction-btn.active {
    color: var(--ink);
    background: var(--surface-subtle);
    border-color: var(--line);
    font-weight: 600;
  }

  .reaction-count {
    font-variant-numeric: tabular-nums;
  }

  .utility-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .utility-btn {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    padding: 3px 6px;
    border-radius: var(--radius-xs);
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .utility-btn:hover {
    color: var(--ink);
  }

  .utility-btn.icon-only {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
  }

  .replies-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--line);
  }

  .replies-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
  }

  .reply-card {
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    padding: 8px 12px;
    border-radius: var(--radius-xs);
    font-size: 13px;
  }

  .reply-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
    font-size: 11px;
  }

  .reply-header strong {
    color: var(--ink);
    font-weight: 600;
  }

  .reply-time {
    font-family: var(--mono);
    color: var(--muted);
  }

  .reply-text {
    margin: 0;
    color: var(--ink-secondary);
    line-height: 1.45;
  }

  .no-replies {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    margin: 0 0 10px;
  }

  .reply-form {
    display: flex;
    gap: 6px;
  }

  .reply-form input {
    flex: 1;
    padding: 6px 10px;
    font-size: 12px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-xs);
    color: var(--ink);
  }

  .reply-form input:focus {
    outline: none;
    border-color: var(--ink);
  }

  .reply-submit-btn {
    padding: 6px 12px;
    background: var(--ink);
    color: var(--bg);
    border-radius: var(--radius-xs);
    font-size: 11px;
    font-weight: 600;
    transition: opacity var(--transition-fast);
  }

  .reply-submit-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
</style>

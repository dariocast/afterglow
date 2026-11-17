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
    return `${Math.ceil(hours / 24)}d left`;
  });

  const initials = $derived.by(() => {
    const name = post.author?.displayName || post.author?.username || '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  function handleReactionClick(kind: ReactionKind) {
    if (!currentUserId) {
      onRequestAuth?.();
      return;
    }
    onReact?.(kind);
  }

  async function handleReplySubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!currentUserId) {
      onRequestAuth?.();
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
  class="post-card"
  class:ending-soon={isEndingSoon}
  class:expired={isExpired}
  data-id={post.id}
>
  <!-- Lifespan subtle progress bar -->
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

  <div class="post-header">
    <div class="author-block">
      <div class="avatar" aria-hidden="true">{initials}</div>
      <div class="author-info">
        <span class="author-name">{post.author?.displayName || 'Anonymous'}</span>
        <span class="author-handle">@{post.author?.username || 'user'}</span>
      </div>
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
        <Icon name="clock" size={12} />
        <span>{expiryLabel}</span>
      </div>
    </div>
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
          <Icon name="check" size={14} />
        {:else}
          <Icon name="share" size={14} />
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
        <p class="no-replies">No replies yet. A quiet space to respond.</p>
      {/if}

      <form class="reply-form" onsubmit={handleReplySubmit}>
        <label class="sr-only" for="reply-input-{post.id}">Write a reply</label>
        <input
          id="reply-input-{post.id}"
          type="text"
          bind:value={replyText}
          placeholder={currentUserId ? "Leave a finite response…" : "Sign in to reply…"}
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
</article>

<style>
  .post-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 24px 26px 20px;
    margin-bottom: 24px;
    box-shadow: var(--shadow-xs);
    position: relative;
    overflow: hidden;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .post-card:hover {
    border-color: var(--line-strong);
    box-shadow: var(--shadow-sm);
  }

  .post-card.ending-soon {
    border-color: rgba(var(--accent-rgb), 0.35);
    background: linear-gradient(to bottom, var(--accent-tint), transparent 48px), var(--surface);
  }

  .post-card.expired {
    opacity: 0.5;
    pointer-events: none;
  }

  .lifespan-track {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--line-subtle);
  }

  .lifespan-fill {
    height: 100%;
    background: var(--muted-light);
    transition: width 1s linear;
  }

  .lifespan-fill.urgent {
    background: var(--accent);
  }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .author-block {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .avatar {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--line);
  }

  .author-info {
    display: flex;
    flex-direction: column;
  }

  .author-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1.2;
  }

  .author-handle {
    font-size: 12px;
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
    font-size: 12px;
    color: var(--muted);
    padding: 3px 8px;
    border-radius: var(--radius-xs);
    transition: all var(--transition-fast);
  }

  .delete-btn:hover {
    color: var(--danger);
    background: var(--danger-soft);
  }

  .expiry-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
    background: var(--surface-2);
    padding: 4px 9px;
    border-radius: var(--radius-full);
    border: 1px solid var(--line-subtle);
    font-variant-numeric: tabular-nums;
  }

  .expiry-pill.urgent {
    color: var(--accent);
    background: var(--accent-soft);
    border-color: rgba(var(--accent-rgb), 0.3);
    font-weight: 600;
  }

  .post-content {
    font-family: var(--serif);
    font-size: 18px;
    line-height: 1.6;
    color: var(--ink);
    margin: 0 0 20px;
    word-break: break-word;
    letter-spacing: -0.01em;
  }

  .post-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 14px;
    border-top: 1px solid var(--line-subtle);
    flex-wrap: wrap;
    gap: 12px;
  }

  .reactions-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .reaction-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    background: var(--surface-2);
    border: 1px solid var(--line-subtle);
    transition: all var(--transition-fast);
  }

  .reaction-btn:hover {
    color: var(--ink);
    border-color: var(--line);
  }

  .reaction-btn.active {
    color: var(--accent);
    background: var(--accent-soft);
    border-color: rgba(var(--accent-rgb), 0.35);
  }

  .reaction-count {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .utility-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .utility-btn {
    font-size: 12px;
    color: var(--muted);
    padding: 5px 9px;
    border-radius: var(--radius-xs);
    transition: color var(--transition-fast);
  }

  .utility-btn:hover {
    color: var(--ink);
  }

  .utility-btn.icon-only {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
  }

  .replies-section {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px dashed var(--line);
  }

  .replies-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }

  .reply-card {
    background: var(--surface-2);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  .reply-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .reply-header strong {
    color: var(--ink);
  }

  .reply-time {
    color: var(--muted);
  }

  .reply-text {
    margin: 0;
    color: var(--ink-secondary);
    line-height: 1.45;
  }

  .no-replies {
    font-size: 13px;
    color: var(--muted);
    font-style: italic;
    margin: 0 0 14px;
  }

  .reply-form {
    display: flex;
    gap: 8px;
  }

  .reply-form input {
    flex: 1;
    padding: 8px 12px;
    font-size: 13px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--ink);
  }

  .reply-form input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .reply-submit-btn {
    padding: 8px 14px;
    background: var(--ink);
    color: var(--bg);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    transition: opacity var(--transition-fast);
  }

  .reply-submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>

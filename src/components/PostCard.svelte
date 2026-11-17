<script lang="ts">
  import type { Post, ReactionKind } from '../lib/api';

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
  class="post"
  class:ending-soon={isEndingSoon}
  class:expired={isExpired}
  data-id={post.id}
>
  <div class="post-top">
    <div class="avatar" aria-hidden="true">{initials}</div>
    <div class="author-meta">
      <div class="post-author">{post.author?.displayName || 'Anonymous'}</div>
      <div class="post-handle">@{post.author?.username || 'user'}</div>
    </div>
    {#if isAuthor}
      <button
        class="delete-btn"
        type="button"
        onclick={handleDelete}
        aria-label="Delete this moment"
        title="Delete this moment"
      >
        <span class="delete-icon" aria-hidden="true">✕</span>
        <span class="delete-label">Delete</span>
      </button>
    {/if}
    <div class="expiry-badge" class:urgent={isEndingSoon} title={new Date(post.expiresAt).toLocaleString()}>
      <span class="expiry-dot" aria-hidden="true"></span>
      {expiryLabel}
    </div>
  </div>

  <p class="post-copy">{post.content}</p>

  <div class="post-bottom">
    <div class="post-actions">
      <!-- Glow reaction -->
      <button
        class="action-btn"
        class:active={post.userReaction === 'glow'}
        type="button"
        onclick={() => handleReactionClick('glow')}
        aria-label="Glow reaction ({post.reactions?.glow || 0})"
      >
        <span class="action-icon" aria-hidden="true">✦</span>
        <span class="action-label">glow</span>
        <span class="action-count">{post.reactions?.glow || 0}</span>
      </button>

      <!-- Warm reaction -->
      <button
        class="action-btn"
        class:active={post.userReaction === 'warm'}
        type="button"
        onclick={() => handleReactionClick('warm')}
        aria-label="Warm reaction ({post.reactions?.warm || 0})"
      >
        <span class="action-icon" aria-hidden="true">♥</span>
        <span class="action-label">warm</span>
        <span class="action-count">{post.reactions?.warm || 0}</span>
      </button>

      <!-- Thought reaction -->
      <button
        class="action-btn"
        class:active={post.userReaction === 'thought'}
        type="button"
        onclick={() => handleReactionClick('thought')}
        aria-label="Thought reaction ({post.reactions?.thought || 0})"
      >
        <span class="action-icon" aria-hidden="true">◌</span>
        <span class="action-label">thought</span>
        <span class="action-count">{post.reactions?.thought || 0}</span>
      </button>

      <!-- Replies toggle -->
      <button
        class="action-btn replies-btn"
        class:active={showReplies}
        type="button"
        onclick={() => { showReplies = !showReplies; }}
        aria-label="Toggle replies ({post.replies?.length || 0})"
      >
        <span class="action-icon" aria-hidden="true">💬</span>
        <span class="action-count">{post.replies?.length || 0}</span>
      </button>

      <!-- Share -->
      <button
        class="action-btn share-btn"
        type="button"
        onclick={handleShare}
        aria-label="Share post"
        title="Copy to clipboard"
      >
        <span aria-hidden="true">{copyFeedback ? '✓' : '↗'}</span>
      </button>
    </div>

    <!-- Lifespan glow progress bar -->
    <div
      class="life-line"
      class:glow-pulse={isEndingSoon}
      role="progressbar"
      aria-label="Lifespan: {expiryLabel}"
      aria-valuenow={Math.round(lifespanPercent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span class="life-bar" style="width: {lifespanPercent}%;"></span>
    </div>

    <!-- Expandable replies panel -->
    {#if showReplies}
      <div class="replies-panel">
        {#if post.replies && post.replies.length > 0}
          <div class="replies-list">
            {#each post.replies as reply (reply.id)}
              <div class="reply-item">
                <div class="reply-header">
                  <span class="reply-author">{reply.author?.displayName || reply.author?.username}</span>
                  <span class="reply-handle">@{reply.author?.username}</span>
                </div>
                <div class="reply-content">{reply.content}</div>
              </div>
            {/each}
          </div>
        {/if}

        <form class="reply-form" onsubmit={handleReplySubmit}>
          <label class="sr-only" for="reply-input-{post.id}">Write a reply</label>
          <input
            id="reply-input-{post.id}"
            type="text"
            maxlength="280"
            bind:value={replyText}
            placeholder={currentUserId ? "Add a thought before it fades…" : "Sign in to reply…"}
            disabled={isSubmittingReply}
            required
          />
          <button
            type="submit"
            disabled={!replyText.trim() || isSubmittingReply}
          >
            Reply
          </button>
        </form>
      </div>
    {/if}
  </div>
</article>

<style>
  .post {
    padding: 28px 24px 30px;
    border-bottom: 1px solid var(--line);
    min-height: 240px;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
    position: relative;
  }

  .post.ending-soon {
    background: linear-gradient(to bottom, var(--surface), rgba(var(--accent-rgb), 0.03));
  }

  .post-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: var(--radius-full);
    background: var(--ink);
    color: var(--bg);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .author-meta {
    flex: 1;
    min-width: 0;
  }

  .post-author {
    font-size: 14px;
    font-weight: 800;
    color: var(--ink);
    line-height: 1.2;
  }

  .post-handle {
    color: var(--muted);
    font-size: 12px;
  }

  .delete-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast);
  }

  .delete-btn:hover {
    color: #e5484d;
    border-color: rgba(229, 72, 77, 0.25);
    background: rgba(229, 72, 77, 0.06);
  }

  .delete-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .delete-icon {
    font-size: 10px;
    line-height: 1;
  }

  .expiry-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background-color: var(--surface-2);
  }

  .expiry-badge.urgent {
    color: var(--accent);
    background-color: var(--accent-soft);
  }

  .expiry-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
  }

  .post-copy {
    font-family: var(--serif);
    font-size: clamp(20px, 2.5vw, 24px);
    line-height: 1.25;
    letter-spacing: -0.025em;
    margin: 24px 0 20px;
    color: var(--ink);
    word-break: break-word;
  }

  .post-bottom {
    margin-top: auto;
  }

  .post-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 11px;
    padding-bottom: 12px;
  }

  .action-btn {
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    color: var(--ink);
    background-color: var(--surface-2);
  }

  .action-btn.active {
    color: var(--accent);
    background-color: var(--accent-soft);
    font-weight: 700;
  }

  .action-icon {
    font-size: 13px;
  }

  .action-label {
    text-transform: capitalize;
  }

  .action-count {
    font-size: 11px;
    opacity: 0.85;
  }

  .share-btn {
    margin-left: auto;
    font-size: 14px;
  }

  /* Life line / remaining glow indicator */
  .life-line {
    height: 3px;
    background: var(--surface-2);
    width: 100%;
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-top: 4px;
  }

  .life-bar {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.5s ease-out;
  }

  .glow-pulse .life-bar {
    background: var(--accent-glow);
    box-shadow: 0 0 8px var(--accent-glow);
    animation: pulseGlow 2s infinite ease-in-out;
  }

  @keyframes pulseGlow {
    0%, 100% {
      opacity: 1;
      filter: drop-shadow(0 0 2px var(--accent-glow));
    }
    50% {
      opacity: 0.6;
      filter: drop-shadow(0 0 6px var(--accent-glow));
    }
  }

  /* Replies list and form */
  .replies-panel {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--line-light);
  }

  .replies-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }

  .reply-item {
    background: var(--surface-2);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  .reply-header {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 4px;
  }

  .reply-author {
    font-weight: 700;
    color: var(--ink);
    font-size: 12px;
  }

  .reply-handle {
    color: var(--muted);
    font-size: 11px;
  }

  .reply-content {
    color: var(--ink);
    line-height: 1.4;
  }

  .reply-form {
    display: flex;
    gap: 8px;
  }

  .reply-form input {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    padding: 8px 12px;
    font-size: 13px;
    border-radius: var(--radius-sm);
  }

  .reply-form input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .reply-form button {
    border: 1px solid var(--ink);
    background: var(--ink);
    color: var(--bg);
    padding: 0 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border-radius: var(--radius-sm);
    transition: opacity var(--transition-fast);
  }

  .reply-form button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>

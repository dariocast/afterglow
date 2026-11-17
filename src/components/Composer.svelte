<script lang="ts">
  import { authStore } from '../lib/auth.svelte';
  import type { User } from '../lib/api';
  import Icon from './icons/Icon.svelte';

  interface Props {
    currentUser?: User | null;
    onSubmitPost?: (content: string, lifetimeHours: number) => Promise<void>;
    onRequestAuth?: () => void;
  }

  let {
    currentUser = undefined,
    onSubmitPost,
    onRequestAuth,
  }: Props = $props();

  let activeUser = $derived(currentUser !== undefined ? currentUser : authStore.currentUser);

  let content = $state('');
  let lifetimeHours = $state(168);
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);

  const MAX_CHARS = 420;
  let remaining = $derived(MAX_CHARS - content.length);
  let isOverLimit = $derived(content.length > MAX_CHARS);
  let isEmpty = $derived(content.trim().length === 0);

  let userInitials = $derived.by(() => {
    if (!activeUser) return '?';
    const name = activeUser.displayName || activeUser.username || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!activeUser) {
      onRequestAuth?.();
      return;
    }

    if (isEmpty || isOverLimit || isSubmitting) return;

    isSubmitting = true;
    errorMessage = null;

    try {
      if (onSubmitPost) {
        await onSubmitPost(content.trim(), Number(lifetimeHours));
      }
      content = '';
    } catch (err: any) {
      errorMessage = err.message || 'Failed to share moment. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<section class="composer-card" aria-labelledby="composer-title">
  <div class="composer-head">
    <div class="avatar" aria-hidden="true">{userInitials}</div>
    <div class="composer-title-wrap">
      <h2 id="composer-title">Post a moment</h2>
      <p class="composer-subtitle">
        {#if activeUser}
          Sharing as <span class="author-tag">@{activeUser.username}</span>
        {:else}
          Sign in to post a thought before it dissolves.
        {/if}
      </p>
    </div>
  </div>

  <form id="post-form" onsubmit={handleSubmit}>
    <label class="sr-only" for="post-text">What is on your mind?</label>
    <textarea
      id="post-text"
      bind:value={content}
      maxlength="450"
      placeholder={activeUser ? "Share a thought, reflection, or passing observation…" : "Sign in with a passkey to post…"}
      disabled={isSubmitting}
      required
    ></textarea>

    {#if errorMessage}
      <div class="error-banner" role="alert">{errorMessage}</div>
    {/if}

    <div class="composer-footer">
      <span class="char-count" class:over-limit={isOverLimit}>
        {content.length} / 420
      </span>

      <div class="composer-controls">
        <div class="lifetime-selector" role="group" aria-label="Lifespan of this moment">
          <span class="lifetime-label">Expires in</span>
          <div class="lifetime-segmented">
            <button
              type="button"
              class="segment-btn"
              class:active={lifetimeHours === 24}
              onclick={() => { lifetimeHours = 24; }}
              disabled={isSubmitting}
            >
              24h
            </button>
            <button
              type="button"
              class="segment-btn"
              class:active={lifetimeHours === 72}
              onclick={() => { lifetimeHours = 72; }}
              disabled={isSubmitting}
            >
              3d
            </button>
            <button
              type="button"
              class="segment-btn"
              class:active={lifetimeHours === 168}
              onclick={() => { lifetimeHours = 168; }}
              disabled={isSubmitting}
            >
              7d
            </button>
          </div>
          <!-- Hidden select for form accessibility/compatibility -->
          <select id="expiry-select" bind:value={lifetimeHours} class="sr-only" tabindex="-1">
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
          </select>
        </div>

        {#if activeUser}
          <button
            class="submit-btn"
            type="submit"
            disabled={isEmpty || isOverLimit || isSubmitting}
          >
            {#if isSubmitting}
              <span>Posting…</span>
            {:else}
              <span>Publish</span>
              <Icon name="arrow-up-right" size={13} />
            {/if}
          </button>
        {:else}
          <button
            class="submit-btn outline"
            type="button"
            onclick={onRequestAuth}
          >
            <Icon name="key" size={13} />
            <span>Sign in to post</span>
          </button>
        {/if}
      </div>
    </div>
  </form>
</section>

<style>
  .composer-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: 20px;
    margin-bottom: 36px;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .composer-card:focus-within {
    border-color: var(--line-focus);
    box-shadow: var(--shadow-md);
  }

  .composer-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--surface-subtle);
    color: var(--amber);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--line-strong);
  }

  .composer-title-wrap h2 {
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    margin: 0 0 2px;
    letter-spacing: -0.01em;
  }

  .composer-subtitle {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
  }

  .author-tag {
    font-family: var(--mono);
    color: var(--ink);
    font-weight: 500;
  }

  textarea {
    width: 100%;
    min-height: 90px;
    resize: vertical;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-subtle);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 14px;
    line-height: 1.5;
    padding: 12px;
    outline: none;
    transition: border-color var(--transition-fast), background var(--transition-fast);
  }

  textarea:focus {
    border-color: var(--amber);
    background: var(--surface);
  }

  textarea::placeholder {
    color: var(--muted-light);
  }

  .error-banner {
    background: var(--danger-soft);
    color: var(--danger);
    border: 1px solid var(--danger);
    border-radius: var(--radius-xs);
    padding: 8px 12px;
    font-size: 12px;
    margin-top: 10px;
  }

  .composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 14px;
    margin-top: 4px;
  }

  .char-count {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .char-count.over-limit {
    color: var(--danger);
    font-weight: 600;
  }

  .composer-controls {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .lifetime-selector {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lifetime-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .lifetime-segmented {
    display: inline-flex;
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 2px;
    gap: 2px;
  }

  .segment-btn {
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: var(--radius-xs);
    transition: all var(--transition-fast);
  }

  .segment-btn:hover {
    color: var(--ink);
  }

  .segment-btn.active {
    background: var(--surface);
    color: var(--amber);
    border-color: var(--line-strong);
    font-weight: 600;
    box-shadow: var(--shadow-xs);
  }

  .submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 600;
    background: var(--amber);
    color: #0a0b0e;
    border: 1px solid var(--amber);
    box-shadow: var(--amber-glow);
    transition: all var(--transition-fast);
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .submit-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .submit-btn.outline {
    background: var(--surface-subtle);
    color: var(--ink);
    border-color: var(--line-strong);
    box-shadow: none;
  }

  .submit-btn.outline:hover {
    background: var(--surface-hover);
  }

  @media (max-width: 600px) {
    .composer-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .composer-controls {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>

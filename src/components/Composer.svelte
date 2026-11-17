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
      <h2 id="composer-title">Leave something here</h2>
      <p>
        {#if activeUser}
          Sharing as <strong>{activeUser.displayName || activeUser.username}</strong>
        {:else}
          Make it worth a short visit.
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
      placeholder={activeUser ? "A small thought, a question, a passing observation…" : "Sign in with a passkey to share a moment…"}
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
          <span class="lifetime-label">Lives for</span>
          <div class="lifetime-pills">
            <button
              type="button"
              class="pill-btn"
              class:active={lifetimeHours === 24}
              onclick={() => { lifetimeHours = 24; }}
              disabled={isSubmitting}
            >
              24h
            </button>
            <button
              type="button"
              class="pill-btn"
              class:active={lifetimeHours === 72}
              onclick={() => { lifetimeHours = 72; }}
              disabled={isSubmitting}
            >
              3d
            </button>
            <button
              type="button"
              class="pill-btn"
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
              <span>Sharing…</span>
            {:else}
              <span>Share moment</span>
              <Icon name="arrow-up-right" size={14} />
            {/if}
          </button>
        {:else}
          <button
            class="submit-btn outline"
            type="button"
            onclick={onRequestAuth}
          >
            <Icon name="key" size={14} />
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
    padding: 24px;
    margin-bottom: 48px;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .composer-card:focus-within {
    border-color: var(--line-strong);
    box-shadow: var(--shadow-md);
  }

  .composer-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid var(--line);
  }

  .composer-title-wrap h2 {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0 0 2px;
    color: var(--ink);
  }

  .composer-title-wrap p {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
  }

  .composer-title-wrap strong {
    color: var(--ink);
    font-weight: 500;
  }

  textarea {
    width: 100%;
    min-height: 100px;
    padding: 14px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--ink);
    font-size: 15px;
    line-height: 1.6;
    resize: vertical;
    transition: border-color var(--transition-fast), background-color var(--transition-fast);
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent);
    background: var(--surface);
  }

  textarea::placeholder {
    color: var(--muted);
  }

  .error-banner {
    margin-top: 10px;
    padding: 8px 12px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 13px;
    border-radius: var(--radius-xs);
  }

  .composer-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .char-count {
    font-size: 12px;
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
    flex-wrap: wrap;
  }

  .lifetime-selector {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lifetime-label {
    font-size: 12px;
    color: var(--muted);
  }

  .lifetime-pills {
    display: inline-flex;
    background: var(--surface-2);
    padding: 2px;
    border-radius: var(--radius-full);
    border: 1px solid var(--line-subtle);
  }

  .pill-btn {
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);
  }

  .pill-btn:hover {
    color: var(--ink);
  }

  .pill-btn.active {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-xs);
    font-weight: 600;
  }

  .submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 18px;
    background: var(--ink);
    color: var(--bg);
    border-radius: var(--radius-full);
    font-size: 13px;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.88;
    transform: translateY(-1px);
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .submit-btn.outline {
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--line);
  }

  .submit-btn.outline:hover {
    background: var(--surface-2);
  }
</style>

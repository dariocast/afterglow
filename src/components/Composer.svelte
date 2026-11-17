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

<section class="composer-section" aria-labelledby="composer-title">
  <div class="composer-stream-row">
    <div class="composer-avatar" aria-hidden="true">{userInitials}</div>

    <div class="composer-body">
      <form id="post-form" onsubmit={handleSubmit}>
        <label class="sr-only" for="post-text">What is on your mind?</label>
        <textarea
          id="post-text"
          bind:value={content}
          maxlength="450"
          placeholder={activeUser ? "What's on your mind?" : "Sign in to post a moment…"}
          disabled={isSubmitting}
          required
        ></textarea>

        {#if errorMessage}
          <div class="error-banner" role="alert">{errorMessage}</div>
        {/if}

        <div class="composer-footer">
          <div class="lifetime-selector" role="group" aria-label="Lifespan of this moment">
            <span class="lifetime-label">Duration:</span>
            <div class="lifetime-options">
              <button
                type="button"
                class="option-btn"
                class:active={lifetimeHours === 24}
                onclick={() => { lifetimeHours = 24; }}
                disabled={isSubmitting}
              >
                24h
              </button>
              <button
                type="button"
                class="option-btn"
                class:active={lifetimeHours === 72}
                onclick={() => { lifetimeHours = 72; }}
                disabled={isSubmitting}
              >
                3d
              </button>
              <button
                type="button"
                class="option-btn"
                class:active={lifetimeHours === 168}
                onclick={() => { lifetimeHours = 168; }}
                disabled={isSubmitting}
              >
                7d
              </button>
            </div>
            <!-- Hidden select for form accessibility/test contract compatibility -->
            <select id="expiry-select" bind:value={lifetimeHours} class="sr-only" tabindex="-1">
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
          </div>

          <div class="composer-submit-group">
            <span class="char-count" class:over-limit={isOverLimit}>
              {content.length} / 420
            </span>

            {#if activeUser}
              <button
                class="submit-btn"
                type="submit"
                disabled={isEmpty || isOverLimit || isSubmitting}
              >
                {#if isSubmitting}
                  <span>Posting…</span>
                {:else}
                  <span>Post</span>
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
    </div>
  </div>
</section>

<style>
  .composer-section {
    padding-bottom: 24px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 28px;
  }

  .composer-stream-row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .composer-avatar {
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
    flex-shrink: 0;
    margin-top: 2px;
  }

  .composer-body {
    flex: 1;
    min-width: 0;
  }

  textarea {
    width: 100%;
    min-height: 80px;
    resize: vertical;
    border: none;
    background: transparent;
    color: var(--ink);
    font-family: var(--serif);
    font-size: 17px;
    line-height: 1.5;
    padding: 4px 0;
    outline: none;
  }

  textarea::placeholder {
    color: var(--muted);
    font-family: var(--serif);
    font-style: italic;
  }

  .error-banner {
    background: var(--danger-soft);
    color: var(--danger);
    border: 1px solid var(--danger);
    border-radius: var(--radius-xs);
    padding: 6px 10px;
    font-size: 12px;
    margin: 8px 0;
  }

  .composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px dashed var(--line);
    margin-top: 8px;
    flex-wrap: wrap;
    gap: 10px;
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
  }

  .lifetime-options {
    display: inline-flex;
    gap: 4px;
  }

  .option-btn {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    padding: 3px 6px;
    border-radius: var(--radius-xs);
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .option-btn:hover {
    color: var(--ink);
  }

  .option-btn.active {
    color: var(--ink);
    background: var(--surface-subtle);
    border-color: var(--line-strong);
    font-weight: 600;
  }

  .composer-submit-group {
    display: flex;
    align-items: center;
    gap: 12px;
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

  .submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    font-weight: 600;
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
    transition: opacity var(--transition-fast);
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .submit-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .submit-btn.outline {
    background: transparent;
    color: var(--ink);
    border-color: var(--line-strong);
  }

  .submit-btn.outline:hover {
    background: var(--surface-subtle);
  }

  @media (max-width: 500px) {
    .composer-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .composer-submit-group {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>

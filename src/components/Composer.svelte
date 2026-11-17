<script lang="ts">
  import type { User } from '../lib/api';

  interface Props {
    currentUser?: User | null;
    onSubmitPost?: (content: string, lifetimeHours: number) => Promise<void>;
    onRequestAuth?: () => void;
  }

  let {
    currentUser = null,
    onSubmitPost,
    onRequestAuth,
  }: Props = $props();

  let content = $state('');
  let lifetimeHours = $state(168);
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);

  const MAX_CHARS = 420;
  let remaining = $derived(MAX_CHARS - content.length);
  let isOverLimit = $derived(content.length > MAX_CHARS);
  let isEmpty = $derived(content.trim().length === 0);

  let userInitials = $derived.by(() => {
    if (!currentUser) return '?';
    const name = currentUser.displayName || currentUser.username || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!currentUser) {
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
        {#if currentUser}
          Sharing as <strong>{currentUser.displayName || currentUser.username}</strong>
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
      placeholder={currentUser ? "A small thought, a question, a passing observation…" : "Sign in with a passkey to share a moment…"}
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
        <label class="expiry-label" for="expiry-select">
          <span>Lives for</span>
          <select id="expiry-select" bind:value={lifetimeHours} disabled={isSubmitting}>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
          </select>
        </label>

        {#if currentUser}
          <button
            class="button button-dark"
            type="submit"
            disabled={isEmpty || isOverLimit || isSubmitting}
          >
            {#if isSubmitting}
              Releasing…
            {:else}
              Share moment <span aria-hidden="true">↗</span>
            {/if}
          </button>
        {:else}
          <button
            class="button button-dark"
            type="button"
            onclick={onRequestAuth}
          >
            Sign in to share <span aria-hidden="true">↗</span>
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
    padding: 28px;
    margin-bottom: 64px;
    border-radius: var(--radius-sm);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }

  .composer-head {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 20px;
  }

  .avatar {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: var(--radius-full);
    background: var(--ink);
    color: var(--bg);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .composer-title-wrap h2 {
    font-size: 18px;
    margin: 0 0 3px;
    letter-spacing: -0.02em;
    font-weight: 600;
    color: var(--ink);
  }

  .composer-title-wrap p {
    color: var(--muted);
    font-size: 13px;
    margin: 0;
  }

  .composer-title-wrap strong {
    color: var(--accent);
  }

  textarea {
    width: 100%;
    min-height: 110px;
    resize: vertical;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ink);
    font-family: var(--serif);
    font-size: 24px;
    line-height: 1.35;
    padding: 6px 0;
  }

  textarea::placeholder {
    color: var(--muted);
    opacity: 0.6;
    font-style: italic;
  }

  .error-banner {
    padding: 10px 14px;
    margin-bottom: 12px;
    background-color: rgba(179, 57, 57, 0.1);
    border-left: 3px solid var(--danger);
    color: var(--danger);
    font-size: 13px;
    border-radius: var(--radius-sm);
  }

  .composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--line);
    padding-top: 16px;
    color: var(--muted);
    font-size: 12px;
  }

  .char-count {
    font-variant-numeric: tabular-nums;
  }

  .char-count.over-limit {
    color: var(--danger);
    font-weight: 700;
  }

  .composer-controls {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .expiry-label {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
  }

  .expiry-label select {
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
    outline: 0;
  }

  .button {
    border: 1px solid var(--ink);
    padding: 11px 18px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: transform var(--transition-fast), background-color var(--transition-fast), opacity var(--transition-fast);
  }

  .button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .button-dark {
    background: var(--ink);
    color: var(--bg);
  }

  @media (max-width: 650px) {
    .composer-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }

    .composer-controls {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>

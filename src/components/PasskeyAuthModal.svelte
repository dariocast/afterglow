<script lang="ts">
  import { authStore } from '../lib/auth.svelte';
  import type { User } from '../lib/api';

  interface Props {
    isOpen?: boolean;
    initialMode?: 'register' | 'login';
    onClose?: () => void;
    onSuccess?: (user: User) => void;
  }

  let {
    isOpen = false,
    initialMode = 'register',
    onClose,
    onSuccess,
  }: Props = $props();

  let selectedMode = $state<'register' | 'login' | null>(null);
  let mode = $derived(selectedMode ?? initialMode);
  let username = $state('');
  let displayName = $state('');
  let localError = $state<string | null>(null);

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      handleClose();
    }
  }

  function handleClose() {
    selectedMode = null;
    localError = null;
    authStore.clearError();
    onClose?.();
  }

  function switchTab(newMode: 'register' | 'login') {
    selectedMode = newMode;
    localError = null;
    authStore.clearError();
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    localError = null;
    authStore.clearError();

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      localError = 'Username is required';
      return;
    }

    try {
      let user: User;
      if (mode === 'register') {
        user = await authStore.registerWithPasskey(trimmedUser, displayName.trim() || undefined);
      } else {
        user = await authStore.loginWithPasskey(trimmedUser);
      }

      onSuccess?.(user);
      handleClose();
    } catch (err: any) {
      // Error message is set in authStore.error, but fallback here
      localError = authStore.error || err.message || 'Passkey authentication failed';
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
  >
    <div
      class="modal-card"
      role="dialog"
      aria-labelledby="auth-modal-title"
      aria-modal="true"
    >
      <button
        class="modal-close"
        type="button"
        onclick={handleClose}
        aria-label="Close dialog"
      >
        ✕
      </button>

      <div class="modal-header">
        <span class="modal-icon" aria-hidden="true">🔑</span>
        <h2 id="auth-modal-title">
          {mode === 'register' ? 'Join with Passkey' : 'Welcome back'}
        </h2>
        <p class="modal-subtitle">
          Fast, passwordless, biometric sign-in directly on your device.
        </p>
      </div>

      <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          class="tab-btn"
          class:active={mode === 'register'}
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onclick={() => switchTab('register')}
        >
          Register with Passkey
        </button>
        <button
          class="tab-btn"
          class:active={mode === 'login'}
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onclick={() => switchTab('login')}
        >
          Log in with Passkey
        </button>
      </div>

      <form onsubmit={handleSubmit} class="auth-form">
        <div class="field">
          <label for="auth-username">Username</label>
          <input
            id="auth-username"
            type="text"
            bind:value={username}
            placeholder="e.g. clara"
            required
            autocomplete="username webauthn"
            disabled={authStore.isLoading}
          />
        </div>

        {#if mode === 'register'}
          <div class="field">
            <label for="auth-display-name">Display Name (optional)</label>
            <input
              id="auth-display-name"
              type="text"
              bind:value={displayName}
              placeholder="e.g. Clara Oswald"
              autocomplete="name"
              disabled={authStore.isLoading}
            />
          </div>
        {/if}

        {#if localError || authStore.error}
          <div class="error-banner" role="alert">
            {localError || authStore.error}
          </div>
        {/if}

        <button
          class="button button-dark full-width"
          type="submit"
          disabled={authStore.isLoading}
        >
          {#if authStore.isLoading}
            <span class="spinner" aria-hidden="true">✦</span> Waiting for passkey…
          {:else if mode === 'register'}
            Register with Passkey & Enter <span>↗</span>
          {:else}
            Log in with Passkey <span>↗</span>
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    z-index: 100;
    padding: 20px;
  }

  .modal-card {
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 32px;
    border-radius: var(--radius-md);
    width: min(100%, 440px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    position: relative;
    animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-close {
    position: absolute;
    top: 18px;
    right: 18px;
    background: none;
    border: 0;
    color: var(--muted);
    font-size: 16px;
    padding: 6px;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);
  }

  .modal-close:hover {
    color: var(--ink);
  }

  .modal-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .modal-icon {
    font-size: 32px;
    display: block;
    margin-bottom: 8px;
  }

  .modal-header h2 {
    font-family: var(--serif);
    font-size: 26px;
    font-weight: 400;
    margin: 0 0 6px;
    color: var(--ink);
  }

  .modal-subtitle {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
    line-height: 1.4;
  }

  .auth-tabs {
    display: flex;
    border-bottom: 1px solid var(--line);
    margin-bottom: 20px;
  }

  .tab-btn {
    flex: 1;
    border: 0;
    background: none;
    padding: 10px 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    position: relative;
    cursor: pointer;
    transition: color var(--transition-fast);
    text-align: center;
  }

  .tab-btn.active {
    color: var(--ink);
  }

  .tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent);
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .field input {
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--ink);
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .field input:focus {
    border-color: var(--accent);
  }

  .error-banner {
    padding: 10px 14px;
    background-color: rgba(179, 57, 57, 0.1);
    border-left: 3px solid var(--danger);
    color: var(--danger);
    font-size: 12px;
    border-radius: var(--radius-sm);
    line-height: 1.4;
  }

  .button {
    border: 1px solid var(--ink);
    padding: 12px 18px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: transform var(--transition-fast), background var(--transition-fast);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .button-dark {
    background: var(--ink);
    color: var(--bg);
  }

  .full-width {
    width: 100%;
  }

  .spinner {
    display: inline-block;
    animation: spin 1s infinite linear;
    color: var(--accent);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>

<script lang="ts">
  import { authStore } from '../lib/auth.svelte';
  import type { User } from '../lib/api';
  import Icon from './icons/Icon.svelte';

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
        <Icon name="close" size={16} />
      </button>

      <div class="modal-header">
        <div class="modal-icon-badge">
          <Icon name="fingerprint" size={24} />
        </div>
        <h2 id="auth-modal-title">
          {mode === 'register' ? 'Join with Passkey' : 'Welcome back'}
        </h2>
        <p class="modal-subtitle">
          Passwordless biometric authentication directly on your device.
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
        <div class="form-group">
          <label for="auth-username">Username</label>
          <input
            id="auth-username"
            type="text"
            bind:value={username}
            placeholder="e.g. dario"
            autocomplete="username webauthn"
            required
            disabled={authStore.isLoading}
          />
        </div>

        {#if mode === 'register'}
          <div class="form-group">
            <label for="auth-display-name">Display Name (optional)</label>
            <input
              id="auth-display-name"
              type="text"
              bind:value={displayName}
              placeholder="e.g. Dario C."
              autocomplete="name"
              disabled={authStore.isLoading}
            />
          </div>
        {/if}

        {#if localError}
          <div class="error-banner" role="alert">
            {localError}
          </div>
        {/if}

        <button
          class="submit-auth-btn"
          type="submit"
          disabled={authStore.isLoading || !username.trim()}
        >
          {#if authStore.isLoading}
            <span class="spinner" aria-hidden="true"></span>
            <span>Verifying with biometric sensor…</span>
          {:else if mode === 'register'}
            <Icon name="fingerprint" size={16} />
            <span>Register with Passkey & Enter</span>
          {:else}
            <Icon name="key" size={16} />
            <span>Log in with Passkey</span>
          {/if}
        </button>
      </form>

      <div class="modal-note">
        <p>Your biometric data stays strictly on your device hardware (Touch ID, Face ID or Windows Hello). No password is ever stored or transmitted.</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(18, 20, 18, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 440px;
    padding: 32px;
    position: relative;
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-close {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    transition: all var(--transition-fast);
  }

  .modal-close:hover {
    color: var(--ink);
    background: var(--surface-2);
  }

  .modal-header {
    text-align: center;
    margin-bottom: 24px;
  }

  .modal-icon-badge {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    border: 1px solid rgba(var(--accent-rgb), 0.15);
  }

  .modal-header h2 {
    font-family: var(--serif);
    font-size: 26px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0 0 6px;
  }

  .modal-subtitle {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }

  .auth-tabs {
    display: flex;
    background: var(--surface-2);
    padding: 3px;
    border-radius: var(--radius-full);
    border: 1px solid var(--line-subtle);
    margin-bottom: 20px;
  }

  .tab-btn {
    flex: 1;
    padding: 7px 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    border-radius: var(--radius-full);
    text-align: center;
    transition: all var(--transition-fast);
  }

  .tab-btn:hover {
    color: var(--ink);
  }

  .tab-btn.active {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-xs);
    font-weight: 600;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
  }

  .form-group input {
    padding: 10px 14px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--ink);
    font-size: 14px;
    transition: all var(--transition-fast);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--accent);
    background: var(--surface);
  }

  .error-banner {
    padding: 10px 14px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 13px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(220, 38, 38, 0.2);
    line-height: 1.4;
  }

  .submit-auth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    background: var(--ink);
    color: var(--bg);
    border-radius: var(--radius-full);
    font-size: 14px;
    font-weight: 500;
    margin-top: 6px;
    transition: all var(--transition-fast);
  }

  .submit-auth-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .submit-auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--bg);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .modal-note {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--line-subtle);
  }

  .modal-note p {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
    text-align: center;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>

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
        <Icon name="close" size={15} />
      </button>

      <div class="modal-header">
        <div class="modal-icon-badge">
          <Icon name="fingerprint" size={22} />
        </div>
        <h2 id="auth-modal-title">
          {mode === 'register' ? 'Join with Passkey' : 'Welcome back'}
        </h2>
        <p class="modal-subtitle">
          Hardware-secured biometric authentication. No passwords stored.
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
              placeholder="e.g. Dario Castellano"
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
          type="submit"
          class="submit-auth-btn"
          disabled={authStore.isLoading}
        >
          {#if authStore.isLoading}
            <span class="spinner" aria-hidden="true"></span>
            <span>Verifying device…</span>
          {:else if mode === 'register'}
            <Icon name="key" size={14} />
            <span>Register with Passkey & Enter</span>
          {:else}
            <Icon name="key" size={14} />
            <span>Log in with Passkey</span>
          {/if}
        </button>
      </form>

      <div class="modal-note">
        <p>
          Passkeys use public-key cryptography (FIDO2 / WebAuthn). Your biometric data never leaves your hardware authenticator.
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(10, 11, 14, 0.75);
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
    border: 1px solid var(--line-focus);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 420px;
    padding: 28px;
    position: relative;
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .modal-close:hover {
    color: var(--ink);
    background: var(--surface-subtle);
    border-color: var(--line);
  }

  .modal-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .modal-icon-badge {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-sm);
    background: var(--amber-subtle);
    color: var(--amber);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    border: 1px solid var(--amber);
    box-shadow: var(--amber-glow);
  }

  .modal-header h2 {
    font-family: var(--sans);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0 0 6px;
  }

  .modal-subtitle {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
    line-height: 1.45;
  }

  .auth-tabs {
    display: flex;
    background: var(--surface-subtle);
    padding: 3px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    margin-bottom: 18px;
    gap: 2px;
  }

  .tab-btn {
    flex: 1;
    padding: 6px 10px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
    border-radius: var(--radius-xs);
    text-align: center;
    transition: all var(--transition-fast);
  }

  .tab-btn:hover {
    color: var(--ink);
  }

  .tab-btn.active {
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow-xs);
    font-weight: 600;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    text-align: left;
  }

  .form-group label {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-group input {
    padding: 8px 12px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-xs);
    color: var(--ink);
    font-size: 13px;
    transition: all var(--transition-fast);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--amber);
    background: var(--surface);
  }

  .error-banner {
    padding: 8px 12px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 12px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--danger);
    line-height: 1.4;
  }

  .submit-auth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px;
    background: var(--amber);
    color: #0a0b0e;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 600;
    border: 1px solid var(--amber);
    box-shadow: var(--amber-glow);
    margin-top: 4px;
    transition: all var(--transition-fast);
  }

  .submit-auth-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .submit-auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #0a0b0e;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .modal-note {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }

  .modal-note p {
    font-family: var(--mono);
    font-size: 10px;
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

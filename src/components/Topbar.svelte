<script lang="ts">
  import { authStore } from '../lib/auth.svelte';
  import { pwaStore } from '../lib/pwa.svelte';
  import type { User } from '../lib/api';
  import Icon from './icons/Icon.svelte';

  interface Props {
    theme?: 'light' | 'dark';
    currentUser?: User | null;
    onToggleTheme?: () => void;
    onAuthClick?: () => void;
    onLogout?: () => void;
    onInstallClick?: () => void;
  }

  let {
    theme = 'light',
    currentUser = undefined,
    onToggleTheme,
    onAuthClick,
    onLogout,
    onInstallClick,
  }: Props = $props();

  let activeUser = $derived(currentUser !== undefined ? currentUser : authStore.currentUser);

  let userInitials = $derived.by(() => {
    if (!activeUser) return '';
    const name = activeUser.displayName || activeUser.username || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  async function handleLogout() {
    if (onLogout) {
      onLogout();
    } else {
      await authStore.logout();
    }
  }
</script>

<header class="topbar">
  <div class="shell topbar-inner">
    <a class="brand" href="#top" aria-label="Afterglow home">
      <span class="brand-mark">
        <span class="brand-dot"></span>
      </span>
      <span class="brand-name">afterglow</span>
    </a>

    <nav class="top-actions" aria-label="App controls">
      {#if !pwaStore.isStandalone}
        <button
          class="nav-action-btn install-btn"
          type="button"
          onclick={() => { if (onInstallClick) onInstallClick(); else pwaStore.openInstallModal(); }}
          aria-label="Install web application"
          title="Install Afterglow"
        >
          <Icon name="device" size={14} />
          <span class="install-label">App</span>
        </button>
      {/if}

      <button
        class="icon-button"
        id="theme-toggle"
        type="button"
        onclick={onToggleTheme}
        aria-label="Switch to {theme === 'light' ? 'dark' : 'light'} theme"
        title="Switch to {theme === 'light' ? 'dark' : 'light'} theme"
      >
        {#if theme === 'light'}
          <Icon name="moon" size={15} />
        {:else}
          <Icon name="sun" size={15} />
        {/if}
      </button>

      {#if activeUser}
        <div class="user-menu">
          <span class="avatar avatar-small" title={activeUser.displayName || activeUser.username}>
            {userInitials}
          </span>
          <span class="user-name">@{activeUser.username}</span>
          <button
            class="logout-button"
            type="button"
            onclick={handleLogout}
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      {:else}
        <button
          class="auth-button"
          type="button"
          onclick={onAuthClick}
        >
          <Icon name="key" size={13} />
          <span>Passkey</span>
        </button>
      {/if}
    </nav>
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background-color: var(--surface);
    border-bottom: 1px solid var(--line);
    transition: background-color var(--transition-smooth), border-color var(--transition-smooth);
  }

  .topbar-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 54px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink);
    transition: opacity var(--transition-fast);
  }

  .brand:hover {
    opacity: 0.85;
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .brand-dot {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-xs);
    background: var(--amber);
    box-shadow: var(--amber-glow);
  }

  .brand-name {
    font-family: var(--sans);
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    transition: all var(--transition-fast);
  }

  .nav-action-btn:hover {
    background: var(--surface-hover);
    color: var(--ink);
    border-color: var(--line-strong);
  }

  .icon-button {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    background: var(--surface-subtle);
    border: 1px solid var(--line);
    transition: all var(--transition-fast);
  }

  .icon-button:hover {
    color: var(--ink);
    background: var(--surface-hover);
    border-color: var(--line-strong);
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 4px;
  }

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: var(--surface-subtle);
    color: var(--amber);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    border: 1px solid var(--line-strong);
  }

  .avatar-small {
    width: 28px;
    height: 28px;
  }

  .user-name {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout-button {
    font-size: 11px;
    color: var(--muted);
    padding: 4px 6px;
    border-radius: var(--radius-xs);
    transition: color var(--transition-fast);
  }

  .logout-button:hover {
    color: var(--danger);
  }

  .auth-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 600;
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
    transition: opacity var(--transition-fast);
  }

  .auth-button:hover {
    opacity: 0.9;
  }

  @media (max-width: 600px) {
    .install-label {
      display: none;
    }
    .user-name {
      display: none;
    }
  }
</style>

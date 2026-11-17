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
        <Icon name="spark" size={16} />
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
          <Icon name="device" size={15} />
          <span class="install-label">Install</span>
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
          <Icon name="moon" size={16} />
        {:else}
          <Icon name="sun" size={16} />
        {/if}
      </button>

      {#if activeUser}
        <div class="user-menu">
          <span class="avatar avatar-small" title={activeUser.displayName || activeUser.username}>
            {userInitials}
          </span>
          <span class="user-name">{activeUser.displayName || activeUser.username}</span>
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
          <Icon name="key" size={14} />
          <span>Sign in</span>
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
    background-color: rgba(var(--bg-rgb, 248, 246, 240), 0.88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--line-subtle);
    transition: background-color var(--transition-smooth), border-color var(--transition-smooth);
  }

  :global([data-theme="dark"]) .topbar {
    background-color: rgba(18, 20, 18, 0.88);
  }

  .topbar-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 60px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink);
    transition: opacity var(--transition-fast);
  }

  .brand:hover {
    opacity: 0.8;
  }

  .brand-mark {
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .brand-name {
    font-family: var(--sans);
    font-size: 16px;
    letter-spacing: -0.02em;
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
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-secondary);
    background: var(--surface-2);
    border: 1px solid var(--line);
    transition: all var(--transition-fast);
  }

  .nav-action-btn:hover {
    background: var(--surface-hover);
    color: var(--ink);
    border-color: var(--line-strong);
  }

  .icon-button {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    background: transparent;
    border: 1px solid transparent;
    transition: all var(--transition-fast);
  }

  .icon-button:hover {
    color: var(--ink);
    background: var(--surface-2);
    border-color: var(--line);
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-left: 6px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--accent-soft);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(var(--accent-rgb), 0.2);
  }

  .avatar-small {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .user-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout-button {
    font-size: 12px;
    color: var(--muted);
    padding: 4px 8px;
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
    padding: 7px 14px;
    border-radius: var(--radius-full);
    font-size: 13px;
    font-weight: 500;
    background: var(--ink);
    color: var(--bg);
    transition: opacity var(--transition-fast);
  }

  .auth-button:hover {
    opacity: 0.88;
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

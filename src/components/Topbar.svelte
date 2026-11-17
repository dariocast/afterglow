<script lang="ts">
  import { authStore } from '../lib/auth.svelte';
  import type { User } from '../lib/api';
  import Icon from './icons/Icon.svelte';

  interface Props {
    theme?: 'light' | 'dark';
    currentUser?: User | null;
    onToggleTheme?: () => void;
    onAuthClick?: () => void;
    onLogout?: () => void;
    onInstallClick?: () => void;
    onProfileClick?: (username: string) => void;
  }

  let {
    theme = 'light',
    currentUser = undefined,
    onToggleTheme,
    onAuthClick,
    onLogout,
    onInstallClick,
    onProfileClick,
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
      <button
        class="icon-button"
        id="theme-toggle"
        type="button"
        onclick={onToggleTheme}
        aria-label="Switch to {theme === 'light' ? 'dark' : 'light'} theme"
        title="Switch to {theme === 'light' ? 'dark' : 'light'} theme"
      >
        {#if theme === 'light'}
          <Icon name="moon" size={14} />
        {:else}
          <Icon name="sun" size={14} />
        {/if}
      </button>

      {#if activeUser}
        <div class="user-menu">
          <button
            class="profile-trigger"
            type="button"
            onclick={() => onProfileClick?.(activeUser.username)}
            aria-label="View @{activeUser.username}'s profile"
            title="View profile (@{activeUser.username})"
          >
            <span
              class="avatar avatar-small"
              style={activeUser.avatarColor ? `background-color: ${activeUser.avatarColor}; color: #fbf9f5;` : ''}
              title={activeUser.displayName || activeUser.username}
            >
              {userInitials}
            </span>
            <span class="user-name">@{activeUser.username}</span>
          </button>
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
    background-color: var(--bg);
    border-bottom: 1px solid var(--line);
    transition: background-color var(--transition-smooth), border-color var(--transition-smooth);
  }

  .topbar-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 50px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
    transition: opacity var(--transition-fast);
  }

  .brand:hover {
    opacity: 0.8;
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .brand-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ink);
  }

  .brand-name {
    font-family: var(--sans);
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-button {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-xs);
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
    background: var(--surface-subtle);
    border-color: var(--line);
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 4px;
  }

  .profile-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: var(--radius-xs);
    transition: opacity var(--transition-fast);
  }

  .profile-trigger:hover {
    opacity: 0.8;
  }

  .avatar {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-xs);
    background: var(--surface-subtle);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    border: 1px solid var(--line);
  }

  .avatar-small {
    width: 26px;
    height: 26px;
  }

  .user-name {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-secondary);
    max-width: 130px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout-button {
    font-size: 11px;
    color: var(--muted);
    padding: 3px 6px;
    border-radius: var(--radius-xs);
    transition: color var(--transition-fast);
  }

  .logout-button:hover {
    color: var(--danger);
  }

  .auth-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    font-weight: 500;
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
    transition: opacity var(--transition-fast);
  }

  .auth-button:hover {
    opacity: 0.85;
  }

  @media (max-width: 600px) {
    .user-name {
      display: none;
    }
  }
</style>

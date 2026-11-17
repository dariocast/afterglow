<script lang="ts">
  import type { User } from '../lib/api';

  interface Props {
    theme?: 'light' | 'dark';
    currentUser?: User | null;
    onToggleTheme?: () => void;
    onAuthClick?: () => void;
    onLogout?: () => void;
  }

  let {
    theme = 'light',
    currentUser = null,
    onToggleTheme,
    onAuthClick,
    onLogout,
  }: Props = $props();

  let userInitials = $derived.by(() => {
    if (!currentUser) return '';
    const name = currentUser.displayName || currentUser.username || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });
</script>

<header class="topbar">
  <div class="shell topbar-inner">
    <a class="brand" href="#top" aria-label="Afterglow home">
      <span class="brand-mark" aria-hidden="true">✦</span> afterglow
    </a>

    <nav class="top-actions" aria-label="App controls">
      <button
        class="icon-button"
        id="theme-toggle"
        type="button"
        onclick={onToggleTheme}
        aria-label="Toggle {theme === 'light' ? 'dark' : 'light'} theme"
        title="Toggle {theme === 'light' ? 'dark' : 'light'} theme"
      >
        <span aria-hidden="true">{theme === 'light' ? '☾' : '☼'}</span>
      </button>

      {#if currentUser}
        <div class="user-menu">
          <span class="avatar avatar-small" title={currentUser.displayName || currentUser.username}>
            {userInitials}
          </span>
          <span class="user-name">{currentUser.displayName || currentUser.username}</span>
          <button
            class="logout-button"
            type="button"
            onclick={onLogout}
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
          Sign in
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
    height: 68px;
    border-bottom: 1px solid var(--line);
    background-color: var(--bg);
    backdrop-filter: blur(8px);
    transition: background-color var(--transition-smooth), border-color var(--transition-smooth);
  }

  .topbar-inner {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: min(100% - 44px, var(--shell-max));
    margin: 0 auto;
  }

  .brand {
    color: var(--ink);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.03em;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .brand-mark {
    color: var(--accent);
    font-size: 18px;
  }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .icon-button {
    background: none;
    color: var(--muted);
    border: 0;
    font-size: 18px;
    padding: 8px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color var(--transition-fast), background-color var(--transition-fast);
  }

  .icon-button:hover {
    color: var(--ink);
    background-color: var(--surface-2);
  }

  .user-menu {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--ink);
    color: var(--bg);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .user-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .logout-button {
    background: transparent;
    border: 1px solid var(--line);
    color: var(--muted);
    font-size: 11px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .logout-button:hover {
    color: var(--ink);
    border-color: var(--ink);
  }

  .auth-button {
    background: var(--ink);
    color: var(--bg);
    border: 1px solid var(--ink);
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--radius-sm);
    transition: transform var(--transition-fast), opacity var(--transition-fast);
  }

  .auth-button:hover {
    transform: translateY(-1px);
    opacity: 0.9;
  }

  @media (max-width: 600px) {
    .user-name {
      display: none;
    }
  }
</style>

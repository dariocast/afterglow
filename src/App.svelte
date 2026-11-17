<script lang="ts">
  import { api, type User, type Post, type FeedFilter, type ReactionKind } from './lib/api';
  import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

  import Topbar from './components/Topbar.svelte';
  import HeroSection from './components/HeroSection.svelte';
  import Composer from './components/Composer.svelte';
  import FeedFilters from './components/FeedFilters.svelte';
  import PostCard from './components/PostCard.svelte';

  // State
  let theme = $state<'light' | 'dark'>('light');
  let currentUser = $state<User | null>(null);
  let activeFilter = $state<FeedFilter>('all');
  let posts = $state<Post[]>([]);
  let isLoading = $state(true);
  let fetchError = $state<string | null>(null);

  // Auth modal state
  let isAuthModalOpen = $state(false);
  let authMode = $state<'login' | 'register'>('register');
  let authUsername = $state('');
  let authDisplayName = $state('');
  let authError = $state<string | null>(null);
  let isAuthSubmitting = $state(false);

  // Initialize theme and load initial data
  $effect(() => {
    const savedTheme = localStorage.getItem('afterglow.theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    // Initial auth & feed load
    initApp();
  });

  function applyTheme(t: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('afterglow.theme', t);
  }

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
  }

  async function initApp() {
    isLoading = true;
    try {
      currentUser = await api.getCurrentUser();
    } catch {
      // not logged in
    }
    await loadFeed(activeFilter);
    isLoading = false;
  }

  async function loadFeed(filter: FeedFilter) {
    try {
      fetchError = null;
      posts = await api.getPosts(filter);
    } catch (err: any) {
      fetchError = err.message || 'Failed to load posts';
      posts = [];
    }
  }

  async function handleFilterChange(filter: FeedFilter) {
    activeFilter = filter;
    isLoading = true;
    await loadFeed(filter);
    isLoading = false;
  }

  async function handlePostSubmit(content: string, lifetimeHours: number) {
    const newPost = await api.createPost(content, lifetimeHours);
    // Refresh feed
    await loadFeed(activeFilter);
  }

  async function handleReact(postId: string, kind: ReactionKind) {
    const res = await api.reactToPost(postId, kind);
    posts = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          reactions: res.reactions,
          userReaction: res.userReaction,
        };
      }
      return p;
    });
  }

  async function handleReply(postId: string, content: string) {
    const reply = await api.addReply(postId, content);
    posts = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          replies: [...(p.replies || []), reply],
        };
      }
      return p;
    });
  }

  async function handleLogout() {
    try {
      await api.logout();
      currentUser = null;
      if (activeFilter === 'mine') {
        await handleFilterChange('all');
      } else {
        await loadFeed(activeFilter);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  function openAuthModal() {
    authError = null;
    isAuthModalOpen = true;
  }

  function closeAuthModal() {
    isAuthModalOpen = false;
    authError = null;
  }

  async function handleAuthSubmit(event: SubmitEvent) {
    event.preventDefault();
    authError = null;
    isAuthSubmitting = true;

    try {
      if (authMode === 'register') {
        const username = authUsername.trim();
        if (!username) throw new Error('Username is required');

        const options = await api.getRegisterOptions(username, authDisplayName.trim() || undefined);
        const registration = await startRegistration({ optionsJSON: options });
        const res = await api.verifyRegistration(registration);
        currentUser = res.user;
      } else {
        const options = await api.getAuthOptions(authUsername.trim() || undefined);
        const authentication = await startAuthentication({ optionsJSON: options });
        const res = await api.verifyAuth(authentication);
        currentUser = res.user;
      }

      closeAuthModal();
      await loadFeed(activeFilter);
    } catch (err: any) {
      authError = err.message || 'Passkey authentication failed';
    } finally {
      isAuthSubmitting = false;
    }
  }
</script>

<div class="app-container">
  <Topbar
    {theme}
    {currentUser}
    onToggleTheme={toggleTheme}
    onAuthClick={openAuthModal}
    onLogout={handleLogout}
  />

  <main id="top" class="shell">
    <HeroSection />

    <Composer
      {currentUser}
      onSubmitPost={handlePostSubmit}
      onRequestAuth={openAuthModal}
    />

    <section class="feed-section" aria-labelledby="feed-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Right now</p>
          <h2 id="feed-title">The living room</h2>
        </div>

        <FeedFilters
          {activeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {#if isLoading}
        <div class="loading-state">
          <span class="loading-glow">✦</span>
          <p>Listening for living moments…</p>
        </div>
      {:else if fetchError}
        <div class="empty-state">
          <span>⚠</span>
          <p>{fetchError}</p>
          <button class="button button-outline" type="button" onclick={() => loadFeed(activeFilter)}>
            Try again
          </button>
        </div>
      {:else if posts.length === 0}
        <div id="empty-state" class="empty-state">
          <span class="empty-star" aria-hidden="true">✦</span>
          <p>
            {#if activeFilter === 'mine'}
              You haven't shared any active moments yet.
            {:else if activeFilter === 'ending'}
              No moments ending in the next 48 hours.
            {:else}
              Nothing is glowing here yet.
            {/if}
          </p>
          {#if activeFilter !== 'all'}
            <button
              class="button button-outline"
              id="reset-filter"
              type="button"
              onclick={() => handleFilterChange('all')}
            >
              See everything
            </button>
          {/if}
        </div>
      {:else}
        <div id="feed" class="feed" aria-live="polite">
          {#each posts as post (post.id)}
            <PostCard
              {post}
              currentUserId={currentUser?.id}
              onReact={(kind) => handleReact(post.id, kind)}
              onReply={(replyContent) => handleReply(post.id, replyContent)}
              onRequestAuth={openAuthModal}
            />
          {/each}
        </div>
      {/if}
    </section>
  </main>

  <footer class="footer">
    <span>afterglow / a quieter kind of social</span>
    <span>your moments are yours</span>
  </footer>

  <!-- Passkey Auth Modal -->
  {#if isAuthModalOpen}
    <div
      class="modal-backdrop"
      role="presentation"
      onclick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
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
          onclick={closeAuthModal}
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div class="modal-header">
          <span class="modal-icon" aria-hidden="true">🔑</span>
          <h2 id="auth-modal-title">
            {authMode === 'register' ? 'Join with Passkey' : 'Welcome back'}
          </h2>
          <p class="modal-subtitle">
            Fast, passwordless, biometric sign-in directly on your device.
          </p>
        </div>

        <div class="auth-tabs" role="tablist">
          <button
            class="tab-btn"
            class:active={authMode === 'register'}
            type="button"
            role="tab"
            aria-selected={authMode === 'register'}
            onclick={() => { authMode = 'register'; authError = null; }}
          >
            Create Passkey
          </button>
          <button
            class="tab-btn"
            class:active={authMode === 'login'}
            type="button"
            role="tab"
            aria-selected={authMode === 'login'}
            onclick={() => { authMode = 'login'; authError = null; }}
          >
            Sign In
          </button>
        </div>

        <form onsubmit={handleAuthSubmit} class="auth-form">
          <div class="field">
            <label for="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              bind:value={authUsername}
              placeholder="e.g. clara"
              required
              disabled={isAuthSubmitting}
            />
          </div>

          {#if authMode === 'register'}
            <div class="field">
              <label for="auth-display-name">Display Name (optional)</label>
              <input
                id="auth-display-name"
                type="text"
                bind:value={authDisplayName}
                placeholder="e.g. Clara Oswald"
                disabled={isAuthSubmitting}
              />
            </div>
          {/if}

          {#if authError}
            <div class="error-banner" role="alert">{authError}</div>
          {/if}

          <button
            class="button button-dark full-width"
            type="submit"
            disabled={isAuthSubmitting}
          >
            {#if isAuthSubmitting}
              Waiting for passkey…
            {:else if authMode === 'register'}
              Create Passkey & Enter <span>↗</span>
            {:else}
              Verify Passkey <span>↗</span>
            {/if}
          </button>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .shell {
    width: min(100% - 44px, var(--shell-max));
    margin: 0 auto;
    flex: 1;
  }

  .feed-section {
    margin-bottom: 80px;
  }

  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid var(--line);
    padding-bottom: 16px;
    margin-bottom: 0;
  }

  .section-heading .eyebrow {
    color: var(--accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.17em;
    text-transform: uppercase;
    margin: 0 0 6px;
  }

  .section-heading h2 {
    font-family: var(--serif);
    font-size: clamp(30px, 4vw, 38px);
    font-weight: 400;
    letter-spacing: -0.04em;
    margin: 0;
    color: var(--ink);
  }

  .feed {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .loading-state,
  .empty-state {
    border: 1px solid var(--line);
    padding: 72px 24px;
    text-align: center;
    color: var(--muted);
    background: var(--surface);
    margin-top: -1px;
  }

  .loading-glow,
  .empty-star {
    color: var(--accent);
    font-size: 28px;
    display: block;
    margin-bottom: 12px;
  }

  .loading-glow {
    animation: pulse 1.8s infinite ease-in-out;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(0.95); }
    50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 8px var(--accent)); }
  }

  .loading-state p,
  .empty-state p {
    font-family: var(--serif);
    font-size: 24px;
    color: var(--ink);
    margin: 0 0 16px;
  }

  .button {
    border: 1px solid var(--ink);
    padding: 11px 18px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--radius-sm);
    transition: transform var(--transition-fast), background var(--transition-fast);
  }

  .button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .button-outline {
    background: transparent;
    color: var(--ink);
  }

  .button-dark {
    background: var(--ink);
    color: var(--bg);
  }

  .footer {
    width: min(100% - 44px, var(--shell-max));
    margin: auto auto 0;
    padding: 28px 0 36px;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  /* Auth Modal */
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
    width: min(100%, 420px);
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
    padding: 10px 0;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    position: relative;
    transition: color var(--transition-fast);
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
  }

  .full-width {
    width: 100%;
    justify-content: center;
    padding: 13px;
  }

  @media (max-width: 768px) {
    .feed {
      grid-template-columns: 1fr;
    }

    .section-heading {
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }

    .footer {
      flex-direction: column;
      gap: 10px;
    }
  }
</style>

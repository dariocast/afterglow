<script lang="ts">
  import { api, type Post, type FeedFilter, type ReactionKind } from './lib/api';
  import { authStore } from './lib/auth.svelte';

  import Topbar from './components/Topbar.svelte';
  import HeroSection from './components/HeroSection.svelte';
  import Composer from './components/Composer.svelte';
  import FeedFilters from './components/FeedFilters.svelte';
  import PostCard from './components/PostCard.svelte';
  import PasskeyAuthModal from './components/PasskeyAuthModal.svelte';
  import PwaInstallModal from './components/PwaInstallModal.svelte';
  import { pwaStore } from './lib/pwa.svelte';

  // State
  let theme = $state<'light' | 'dark'>('light');
  let activeFilter = $state<FeedFilter>('all');
  let posts = $state<Post[]>([]);
  let isLoading = $state(true);
  let fetchError = $state<string | null>(null);

  // Auth modal state
  let isAuthModalOpen = $state(false);
  let authMode = $state<'login' | 'register'>('register');

  // Initialize theme and load initial data
  $effect(() => {
    const savedTheme = localStorage.getItem('afterglow.theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    // Initial auth & feed load
    initApp();

    // Initialize PWA installation listeners
    pwaStore.init();
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
      await authStore.checkSession();
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
    await api.createPost(content, lifetimeHours);
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
      await authStore.logout();
      if (activeFilter === 'mine') {
        await handleFilterChange('all');
      } else {
        await loadFeed(activeFilter);
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  function openAuthModal(mode: 'login' | 'register' = 'register') {
    authMode = mode;
    isAuthModalOpen = true;
  }

  function closeAuthModal() {
    isAuthModalOpen = false;
  }

  async function handleAuthSuccess() {
    if (activeFilter === 'mine') {
      await loadFeed('mine');
    } else {
      await loadFeed(activeFilter);
    }
  }
</script>

<div class="app-container">
  <Topbar
    {theme}
    currentUser={authStore.currentUser}
    onToggleTheme={toggleTheme}
    onAuthClick={() => openAuthModal('register')}
    onLogout={handleLogout}
    onInstallClick={() => pwaStore.openInstallModal()}
  />

  {#if !pwaStore.isStandalone && !pwaStore.isDismissed && pwaStore.canInstall}
    <div class="pwa-banner" role="region" aria-label="Installazione Progressive Web App">
      <div class="shell pwa-banner-inner">
        <div class="pwa-banner-text">
          <span class="pwa-banner-icon" aria-hidden="true">📲</span>
          <span>Installa Afterglow sulla schermata Home per avvio istantaneo e privacy totale.</span>
        </div>
        <div class="pwa-banner-actions">
          <button
            class="pwa-banner-btn primary"
            type="button"
            onclick={() => pwaStore.openInstallModal()}
          >
            Installa app
          </button>
          <button
            class="pwa-banner-btn dismiss"
            type="button"
            onclick={() => pwaStore.dismissBanner()}
            aria-label="Ignora promemoria installazione"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  {/if}

  <main id="top" class="shell">
    <HeroSection />

    <Composer
      currentUser={authStore.currentUser}
      onSubmitPost={handlePostSubmit}
      onRequestAuth={() => openAuthModal('register')}
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
              currentUserId={authStore.currentUser?.id}
              onReact={(kind) => handleReact(post.id, kind)}
              onReply={(replyContent) => handleReply(post.id, replyContent)}
              onRequestAuth={() => openAuthModal('register')}
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

  <PasskeyAuthModal
    isOpen={isAuthModalOpen}
    initialMode={authMode}
    onClose={closeAuthModal}
    onSuccess={handleAuthSuccess}
  />

  <PwaInstallModal
    isOpen={pwaStore.isModalOpen}
    onClose={() => pwaStore.closeInstallModal()}
  />
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

  /* PWA discreet banner */
  .pwa-banner {
    background: var(--surface-1);
    border-bottom: 1px solid var(--line);
    padding: 10px 0;
    transition: background-color var(--transition-smooth);
  }

  .pwa-banner-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .pwa-banner-text {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--ink);
    font-weight: 500;
  }

  .pwa-banner-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .pwa-banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .pwa-banner-btn.primary {
    background: var(--ink);
    color: var(--bg);
    border: 0;
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .pwa-banner-btn.primary:hover {
    opacity: 0.9;
  }

  .pwa-banner-btn.dismiss {
    background: transparent;
    border: 0;
    color: var(--muted);
    font-size: 14px;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: var(--radius-sm);
    line-height: 1;
    transition: color var(--transition-fast);
  }

  .pwa-banner-btn.dismiss:hover {
    color: var(--ink);
  }

  @media (max-width: 768px) {
    .pwa-banner-inner {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .pwa-banner-actions {
      width: 100%;
      justify-content: space-between;
    }
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

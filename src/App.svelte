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
  import Icon from './components/icons/Icon.svelte';
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
    fetchError = null;
    try {
      posts = await api.getPosts(filter);
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      fetchError = 'Unable to reach the living room. Please try again.';
      posts = [];
    }
  }

  async function handleFilterChange(filter: FeedFilter) {
    activeFilter = filter;
    isLoading = true;
    await loadFeed(filter);
    isLoading = false;
  }

  async function handleCreatePost(content: string, lifetimeHours: number) {
    const newPost = await api.createPost(content, lifetimeHours);
    if (activeFilter === 'all' || activeFilter === 'mine') {
      posts = [newPost, ...posts];
    } else {
      await loadFeed(activeFilter);
    }
  }

  async function handleReact(postId: string, kind: ReactionKind) {
    try {
      const res = await api.reactToPost(postId, kind);
      posts = posts.map((p) =>
        p.id === postId ? { ...p, reactions: res.reactions, userReaction: res.userReaction } : p
      );
    } catch (err) {
      console.error('Failed to react:', err);
    }
  }

  async function handleReply(postId: string, content: string) {
    try {
      const newReply = await api.addReply(postId, content);
      posts = posts.map((p) =>
        p.id === postId ? { ...p, replies: [...(p.replies || []), newReply] } : p
      );
    } catch (err) {
      console.error('Failed to reply:', err);
    }
  }

  async function handleDeletePost(postId: string) {
    try {
      await api.deletePost(postId);
      posts = posts.filter((p) => p.id !== postId);
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
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
    <div class="pwa-banner" role="region" aria-label="Progressive Web App prompt">
      <div class="shell pwa-banner-inner">
        <div class="pwa-banner-text">
          <Icon name="device" size={15} />
          <span>Add Afterglow to your home screen for instant launch and offline access.</span>
        </div>
        <div class="pwa-banner-actions">
          <button
            class="pwa-banner-btn primary"
            type="button"
            onclick={() => pwaStore.openInstallModal()}
          >
            Install app
          </button>
          <button
            class="pwa-banner-btn dismiss"
            type="button"
            onclick={() => pwaStore.dismissBanner()}
            aria-label="Dismiss installation prompt"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>
    </div>
  {/if}

  <main id="top" class="shell">
    <HeroSection />

    <Composer
      currentUser={authStore.currentUser}
      onSubmitPost={handleCreatePost}
      onRequestAuth={() => openAuthModal('register')}
    />

    <section class="feed-section" aria-labelledby="feed-title">
      <div class="section-heading">
        <div class="heading-title-wrap">
          <p class="eyebrow">Right now</p>
          <h2 id="feed-title">The living room</h2>
        </div>
        <FeedFilters
          currentFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {#if isLoading}
        <div class="loading-state">
          <span class="spinner" aria-hidden="true"></span>
          <p>Listening for active moments…</p>
        </div>
      {:else if fetchError}
        <div class="error-state" role="alert">
          <p>{fetchError}</p>
          <button class="retry-btn" type="button" onclick={() => loadFeed(activeFilter)}>
            Retry
          </button>
        </div>
      {:else if posts.length === 0}
        <div id="empty-state" class="empty-state">
          <div class="empty-icon-wrap">
            <Icon name="spark" size={24} />
          </div>
          <p class="empty-title">Nothing is glowing here yet.</p>
          <p class="empty-subtitle">Moments naturally fade when their time arrives. Start a new thought above.</p>
          {#if activeFilter !== 'all'}
            <button
              class="reset-btn"
              type="button"
              onclick={() => handleFilterChange('all')}
            >
              See all active moments
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
              onReply={(content) => handleReply(post.id, content)}
              onRequestAuth={() => openAuthModal('register')}
              ondelete={handleDeletePost}
            />
          {/each}
        </div>
      {/if}
    </section>
  </main>

  <footer class="footer">
    <div class="shell footer-inner">
      <span>afterglow / a quiet kind of social</span>
      <span>your moments are yours</span>
    </div>
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

  main {
    flex: 1;
    padding-bottom: 80px;
  }

  .pwa-banner {
    background: var(--surface-2);
    border-bottom: 1px solid var(--line);
    padding: 10px 0;
    animation: fadeIn 0.2s ease-out;
  }

  .pwa-banner-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .pwa-banner-text {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    color: var(--ink-secondary);
  }

  .pwa-banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pwa-banner-btn.primary {
    padding: 5px 12px;
    background: var(--ink);
    color: var(--bg);
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 500;
    transition: opacity var(--transition-fast);
  }

  .pwa-banner-btn.primary:hover {
    opacity: 0.88;
  }

  .pwa-banner-btn.dismiss {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-full);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    transition: all var(--transition-fast);
  }

  .pwa-banner-btn.dismiss:hover {
    color: var(--ink);
    background: var(--surface);
  }

  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 28px;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--line-subtle);
    padding-bottom: 16px;
  }

  .heading-title-wrap h2 {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 4px 0 0;
  }

  .eyebrow {
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 0;
  }

  .feed {
    display: flex;
    flex-direction: column;
  }

  .loading-state {
    padding: 60px 0;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    color: var(--muted);
    font-size: 14px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-state {
    padding: 32px;
    background: var(--danger-soft);
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: var(--radius-md);
    text-align: center;
    color: var(--danger);
  }

  .retry-btn {
    margin-top: 12px;
    padding: 6px 16px;
    background: var(--danger);
    color: #fff;
    border-radius: var(--radius-full);
    font-size: 13px;
    font-weight: 500;
  }

  .empty-state {
    padding: 64px 20px;
    text-align: center;
    background: var(--surface);
    border: 1px dashed var(--line);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .empty-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    background: var(--surface-2);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .empty-title {
    font-family: var(--serif);
    font-size: 20px;
    color: var(--ink);
    margin: 0 0 6px;
  }

  .empty-subtitle {
    font-size: 13px;
    color: var(--muted);
    max-width: 360px;
    margin: 0 0 18px;
    line-height: 1.5;
  }

  .reset-btn {
    padding: 6px 14px;
    background: var(--surface-2);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .reset-btn:hover {
    background: var(--surface-hover);
  }

  .footer {
    border-top: 1px solid var(--line-subtle);
    padding: 24px 0;
    font-size: 12px;
    color: var(--muted);
    background: var(--surface);
  }

  .footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>

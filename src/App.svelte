<script lang="ts">
  import { api, type Post, type FeedFilter, type ReactionKind } from './lib/api';
  import { authStore } from './lib/auth.svelte';

  import Topbar from './components/Topbar.svelte';
  import HeroSection from './components/HeroSection.svelte';
  import Composer from './components/Composer.svelte';
  import FeedFilters from './components/FeedFilters.svelte';
  import PostCard from './components/PostCard.svelte';
  import PasskeyAuthModal from './components/PasskeyAuthModal.svelte';
  import ProfileDrawer from './components/ProfileDrawer.svelte';
  import Icon from './components/icons/Icon.svelte';
  import { pwaStore } from './lib/pwa.svelte';

  // State
  let theme = $state<'light' | 'dark'>('light');
  let activeFilter = $state<FeedFilter>('all');
  let posts = $state<Post[]>([]);
  let isLoading = $state(true);
  let fetchError = $state<string | null>(null);
  let selectedProfileUsername = $state<string | null>(null);

  // Auth modal state
  let isAuthModalOpen = $state(false);
  let authMode = $state<'login' | 'register'>('register');
  let iosNotice = $state(false);

  async function handleMobileInstall() {
    if (pwaStore.deferredPrompt) {
      await pwaStore.promptInstall();
      pwaStore.dismissBanner();
    } else if (pwaStore.isIosSafari) {
      iosNotice = true;
      setTimeout(() => {
        pwaStore.dismissBanner();
      }, 4000);
    } else {
      pwaStore.dismissBanner();
    }
  }

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
      if ((filter === 'mine' || filter === 'following') && !authStore.currentUser) {
        posts = [];
        return;
      }
      posts = await api.getPosts(filter);
    } catch (err: any) {
      if (
        (filter === 'mine' || filter === 'following') &&
        (err.message === 'Unauthorized' || err.message?.includes('401'))
      ) {
        posts = [];
        return;
      }
      console.error('Failed to load posts:', err);
      fetchError = 'Unable to load moments. Please try again.';
      posts = [];
    }
  }

  async function handleFilterChange(filter: FeedFilter) {
    activeFilter = filter;
    if ((filter === 'mine' || filter === 'following') && !authStore.currentUser) {
      posts = [];
      openAuthModal('login');
      return;
    }
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
      if (activeFilter === 'mine' || activeFilter === 'following') {
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
    onProfileClick={(username) => (selectedProfileUsername = username)}
  />

  {#if !pwaStore.isStandalone && !pwaStore.isDismissed && pwaStore.canInstall}
    <aside class="mobile-pwa-overlay" role="region" aria-label="Install Afterglow">
      <div class="overlay-content">
        {#if iosNotice}
          <span class="overlay-text">Tap Share then Add to Home Screen</span>
        {:else}
          <button class="overlay-install-btn" type="button" onclick={handleMobileInstall}>
            <Icon name="device" size={13} />
            <span>Install app</span>
          </button>
        {/if}
      </div>
      <button
        class="overlay-dismiss-btn"
        type="button"
        onclick={() => pwaStore.dismissBanner()}
        aria-label="Dismiss installation prompt"
      >
        <Icon name="close" size={13} />
      </button>
    </aside>
  {/if}

  <main id="top" class="shell">
    <HeroSection />

    <Composer
      currentUser={authStore.currentUser}
      onSubmitPost={handleCreatePost}
      onRequestAuth={() => openAuthModal('register')}
    />

    <section class="feed-section" aria-labelledby="feed-title">
      <h2 id="feed-title" class="sr-only">Feed</h2>
      <div class="feed-nav-bar">
        <FeedFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {#if isLoading}
        <div class="loading-state">
          <span class="spinner" aria-hidden="true"></span>
          <p>Loading moments…</p>
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
          {#if (activeFilter === 'mine' || activeFilter === 'following') && !authStore.currentUser}
            <p class="empty-title">{activeFilter === 'following' ? 'Following' : 'Your moments'}</p>
            <p class="empty-subtitle">
              {activeFilter === 'following'
                ? 'Sign in with a passkey to view moments from people you follow.'
                : 'Sign in with a passkey to view and manage your moments.'}
            </p>
            <button
              class="reset-btn"
              type="button"
              onclick={() => openAuthModal('login')}
            >
              Sign in with Passkey
            </button>
          {:else if activeFilter === 'following'}
            <p class="empty-title">No moments from following</p>
            <p class="empty-subtitle">Follow people to see their active thoughts here.</p>
            <button
              class="reset-btn"
              type="button"
              onclick={() => handleFilterChange('all')}
            >
              See all active moments
            </button>
          {:else if activeFilter === 'mine'}
            <p class="empty-title">No moments yet</p>
            <p class="empty-subtitle">You haven't posted any moments yet.</p>
          {:else}
            <p class="empty-title">No moments here yet.</p>
            <p class="empty-subtitle">Moments naturally dissolve when their time arrives.</p>
            {#if activeFilter !== 'all'}
              <button
                class="reset-btn"
                type="button"
                onclick={() => handleFilterChange('all')}
              >
                See all active moments
              </button>
            {/if}
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
              onAuthorClick={(username) => (selectedProfileUsername = username)}
            />
          {/each}
        </div>
      {/if}
    </section>
  </main>

  <footer class="footer">
    <div class="shell footer-inner">
      <span>afterglow</span>
      <span>finite moments</span>
    </div>
  </footer>

  <PasskeyAuthModal
    isOpen={isAuthModalOpen}
    initialMode={authMode}
    onClose={closeAuthModal}
    onSuccess={handleAuthSuccess}
  />

  {#if selectedProfileUsername}
    <ProfileDrawer
      username={selectedProfileUsername}
      onClose={() => (selectedProfileUsername = null)}
      onPostUpdated={() => loadFeed(activeFilter)}
      onRequestAuth={() => openAuthModal('login')}
    />
  {/if}
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

  .mobile-pwa-overlay {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    max-width: 340px;
    margin: 0 auto;
    z-index: 100;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-xs);
    box-shadow: var(--shadow-md);
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    animation: slideUp 0.2s ease-out;
  }

  @media (min-width: 641px) {
    .mobile-pwa-overlay {
      display: none !important;
    }
  }

  .overlay-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .overlay-text {
    font-size: 11px;
    color: var(--ink);
    font-weight: 500;
  }

  .overlay-install-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 4px 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
  }

  .overlay-dismiss-btn {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-xs);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .overlay-dismiss-btn:hover {
    color: var(--ink);
    background: var(--surface-subtle);
  }

  @keyframes slideUp {
    from { transform: translateY(12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .feed-nav-bar {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--line);
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  .feed {
    display: flex;
    flex-direction: column;
  }

  .loading-state {
    padding: 48px 0;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--muted);
    font-size: 13px;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--line);
    border-top-color: var(--ink);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error-state {
    padding: 24px;
    background: var(--danger-soft);
    border: 1px solid var(--danger);
    border-radius: var(--radius-xs);
    text-align: center;
    color: var(--danger);
    font-size: 13px;
  }

  .retry-btn {
    margin-top: 10px;
    padding: 5px 12px;
    background: var(--danger);
    color: #fff;
    border-radius: var(--radius-xs);
    font-size: 12px;
    font-weight: 500;
  }

  .empty-state {
    padding: 48px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .empty-title {
    font-family: var(--serif);
    font-size: 18px;
    color: var(--ink);
    margin: 0 0 6px;
  }

  .empty-subtitle {
    font-size: 13px;
    color: var(--muted);
    max-width: 320px;
    margin: 0 0 16px;
    line-height: 1.45;
  }

  .reset-btn {
    padding: 5px 12px;
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-xs);
    font-size: 12px;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .reset-btn:hover {
    background: var(--surface-subtle);
  }

  .footer {
    border-top: 1px solid var(--line);
    padding: 24px 0 36px;
    font-size: 11px;
    color: var(--muted);
    background: transparent;
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

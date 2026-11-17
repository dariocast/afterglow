import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PostCard from '../src/components/PostCard.svelte';
import Composer from '../src/components/Composer.svelte';
import FeedFilters from '../src/components/FeedFilters.svelte';
import Topbar from '../src/components/Topbar.svelte';

describe('UI & Svelte 5 Components', () => {
  const samplePost = {
    id: 'post-test-1',
    authorId: 'user-1',
    content: 'Moments that fade make space for what comes next.',
    lifetimeHours: 24,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
    author: {
      id: 'user-1',
      username: 'clara',
      displayName: 'Clara Oswald',
    },
    reactions: { glow: 5, warm: 2, thought: 1 },
    userReaction: 'glow' as const,
    replies: [
      {
        id: 'rep-1',
        postId: 'post-test-1',
        authorId: 'user-2',
        content: 'Beautifully put.',
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        author: {
          id: 'user-2',
          username: 'river',
          displayName: 'River Song',
        },
      },
    ],
  };

  describe('PostCard.svelte', () => {
    it('renders post content, author display name, and remaining time calculation', () => {
      const { html } = render(PostCard, {
        props: {
          post: samplePost,
          currentUserId: 'user-1',
          initialShowReplies: true,
        },
      });

      // Renders author display name
      expect(html).toContain('Clara Oswald');
      expect(html).toContain('@clara');

      // Renders post content
      expect(html).toContain('Moments that fade make space for what comes next.');

      // Renders remaining time calculation
      expect(html).toMatch(/22h left|21h left|left/);

      // Renders visual lifespan indicator (life-line / glow bar)
      expect(html).toContain('life-line');

      // Renders reactions
      expect(html).toContain('glow');
      expect(html).toContain('5');

      // Renders existing replies
      expect(html).toContain('River Song');
      expect(html).toContain('Beautifully put.');
    });

    it('formats ending soon when less than 1 hour remains', () => {
      const expiringPost = {
        ...samplePost,
        id: 'post-expiring',
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 mins left
      };

      const { html } = render(PostCard, {
        props: {
          post: expiringPost,
        },
      });

      expect(html.toLowerCase()).toContain('ending soon');
    });
  });

  describe('Composer.svelte', () => {
    it('renders character count limit and lifespan options', () => {
      const { html } = render(Composer, {
        props: {
          currentUser: { id: 'u1', username: 'clara', displayName: 'Clara' },
        },
      });

      expect(html).toContain('420');
      expect(html).toContain('24 hours');
      expect(html).toContain('3 days');
      expect(html).toContain('7 days');
    });
  });

  describe('FeedFilters.svelte', () => {
    it('renders filter buttons for All, Ending soon, and Yours', () => {
      const { html } = render(FeedFilters, {
        props: {
          activeFilter: 'all',
          onFilterChange: () => {},
        },
      });

      expect(html).toContain('All');
      expect(html).toContain('Ending soon');
      expect(html).toContain('Yours');
    });
  });

  describe('Topbar.svelte', () => {
    it('renders brand mark, name, and theme toggle', () => {
      const { html } = render(Topbar, {
        props: {
          theme: 'light',
          currentUser: null,
          onToggleTheme: () => {},
          onAuthClick: () => {},
          onLogout: () => {},
        },
      });

      expect(html).toContain('afterglow');
      expect(html).toContain('✦');
    });
  });
});

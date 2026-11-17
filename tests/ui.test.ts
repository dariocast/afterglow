import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PostCard from '../src/components/PostCard.svelte';
import Composer from '../src/components/Composer.svelte';
import FeedFilters from '../src/components/FeedFilters.svelte';
import Topbar from '../src/components/Topbar.svelte';
import PasskeyAuthModal from '../src/components/PasskeyAuthModal.svelte';
import ProfileDrawer from '../src/components/ProfileDrawer.svelte';
import type { UserProfile } from '../src/lib/api';

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

    it('renders delete button for the post author and hides it for non-authors', () => {
      // As author (user-1)
      const { html: authorHtml } = render(PostCard, {
        props: {
          post: samplePost,
          currentUserId: 'user-1',
        },
      });
      expect(authorHtml).toContain('Delete this moment');
      expect(authorHtml).toContain('delete-btn');

      // As non-author (user-2)
      const { html: otherUserHtml } = render(PostCard, {
        props: {
          post: samplePost,
          currentUserId: 'user-2',
        },
      });
      expect(otherUserHtml).not.toContain('Delete this moment');
      expect(otherUserHtml).not.toContain('delete-btn');

      // As unauthenticated visitor
      const { html: guestHtml } = render(PostCard, {
        props: {
          post: samplePost,
          currentUserId: null,
        },
      });
      expect(guestHtml).not.toContain('Delete this moment');
      expect(guestHtml).not.toContain('delete-btn');
    });

    it('renders author avatar and username as clickable triggers and applies custom avatarColor', () => {
      const customAuthorPost = {
        ...samplePost,
        author: {
          ...samplePost.author,
          avatarColor: '#8a4b38',
        },
      };

      const { html } = render(PostCard, {
        props: {
          post: customAuthorPost,
          onAuthorClick: () => {},
        },
      });

      // Contains avatar background color
      expect(html).toContain('background-color: #8a4b38');
      // Contains clickable author trigger
      expect(html).toContain('author-btn');
      expect(html).toContain('@clara');
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
    it('renders filter buttons for All, Following, Ending soon, and Yours', () => {
      const { html } = render(FeedFilters, {
        props: {
          activeFilter: 'all',
          onFilterChange: () => {},
        },
      });

      expect(html).toContain('All');
      expect(html).toContain('Following');
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
      expect(html).toContain('brand-mark');
    });

    it('renders clickable profile button with avatarColor and username for logged in user', () => {
      const { html } = render(Topbar, {
        props: {
          theme: 'light',
          currentUser: {
            id: 'u-current',
            username: 'dario',
            displayName: 'Dario C',
            avatarColor: '#2b5876',
          },
          onToggleTheme: () => {},
          onProfileClick: () => {},
        },
      });

      expect(html).toContain('@dario');
      expect(html).toContain('background-color: #2b5876');
      expect(html).toContain('profile-trigger');
    });
  });

  describe('ProfileDrawer.svelte', () => {
    const mockProfile: UserProfile = {
      id: 'usr_elena',
      username: 'elena_v',
      displayName: 'Elena Voronova',
      bio: 'Typography enthusiast and ink collector.',
      avatarColor: '#7b3e2b',
      createdAt: '2026-03-15T10:00:00.000Z',
      isFollowing: false,
      activeMoments: [
        {
          id: 'post-elena-1',
          authorId: 'usr_elena',
          content: 'A fleeting note on modern typography.',
          lifetimeHours: 24,
          createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
          expiresAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
          author: {
            id: 'usr_elena',
            username: 'elena_v',
            displayName: 'Elena Voronova',
            avatarColor: '#7b3e2b',
          },
          reactions: { glow: 3, warm: 1, thought: 0 },
          userReaction: null,
          replies: [],
        },
      ],
    };

    it('renders author display name, username, bio, join date, and follow button for another user', () => {
      const { html } = render(ProfileDrawer, {
        props: {
          username: 'elena_v',
          initialProfile: mockProfile,
          currentUserId: 'usr_viewer',
          onClose: () => {},
        },
      });

      expect(html).toContain('Elena Voronova');
      expect(html).toContain('@elena_v');
      expect(html).toContain('Typography enthusiast and ink collector.');
      expect(html).toContain('Member since March 2026');
      expect(html).toContain('background-color: #7b3e2b');
      expect(html).toContain('Follow');
      expect(html).toContain('A fleeting note on modern typography.');
    });

    it('renders empty moments notice when author has no active posts', () => {
      const emptyProfile: UserProfile = {
        ...mockProfile,
        activeMoments: [],
      };

      const { html } = render(ProfileDrawer, {
        props: {
          username: 'elena_v',
          initialProfile: emptyProfile,
          currentUserId: 'usr_viewer',
          onClose: () => {},
        },
      });

      expect(html).toContain('No active moments. Thoughts will appear here while they live.');
    });

    it('renders bio edit controls and hides follow button when viewing own profile', () => {
      const { html } = render(ProfileDrawer, {
        props: {
          username: 'elena_v',
          initialProfile: mockProfile,
          currentUserId: 'usr_elena',
          onClose: () => {},
        },
      });

      // Does not show follow button for own profile
      expect(html).not.toContain('follow-btn');
      // Shows edit bio capability
      expect(html).toContain('edit-bio');
    });
  });

  describe('PasskeyAuthModal.svelte', () => {
    it('renders registration mode with username and display name fields', () => {
      const { html } = render(PasskeyAuthModal, {
        props: {
          isOpen: true,
          initialMode: 'register',
        },
      });

      expect(html).toContain('Join with Passkey');
      expect(html).toContain('Register with Passkey');
      expect(html).toContain('Username');
      expect(html).toContain('Display Name (optional)');
      expect(html).toContain('Register with Passkey &amp; Enter');
    });

    it('renders login mode with username field', () => {
      const { html } = render(PasskeyAuthModal, {
        props: {
          isOpen: true,
          initialMode: 'login',
        },
      });

      expect(html).toContain('Welcome back');
      expect(html).toContain('Log in with Passkey');
      expect(html).toContain('Username');
      expect(html).toContain('Log in with Passkey');
    });

    it('does not render markup when isOpen is false', () => {
      const { html } = render(PasskeyAuthModal, {
        props: {
          isOpen: false,
        },
      });

      expect(html).not.toContain('modal-backdrop');
      expect(html).not.toContain('auth-modal-title');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authStore } from '../src/lib/auth.svelte';
import { api, type User, type UserProfile } from '../src/lib/api';

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
  browserSupportsWebAuthn: vi.fn(() => true),
}));

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

describe('authStore (Svelte 5 runes)', () => {
  const mockUser: User = {
    id: 'user-123',
    username: 'clara',
    displayName: 'Clara Oswald',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    authStore.reset();
  });

  it('initializes with unauthenticated state', () => {
    expect(authStore.currentUser).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isChecking).toBe(false);
    expect(authStore.error).toBeNull();
  });

  it('handles unauthenticated session checks', async () => {
    vi.spyOn(api, 'getCurrentUser').mockResolvedValue(null);

    const user = await authStore.checkSession();

    expect(user).toBeNull();
    expect(authStore.currentUser).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isChecking).toBe(false);
  });

  it('handles authenticated session checks', async () => {
    vi.spyOn(api, 'getCurrentUser').mockResolvedValue(mockUser);

    const user = await authStore.checkSession();

    expect(user).toEqual(mockUser);
    expect(authStore.currentUser).toEqual(mockUser);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isChecking).toBe(false);
  });

  it('logout() resets active user state', async () => {
    vi.spyOn(api, 'getCurrentUser').mockResolvedValue(mockUser);
    await authStore.checkSession();
    expect(authStore.isAuthenticated).toBe(true);

    const logoutSpy = vi.spyOn(api, 'logout').mockResolvedValue(undefined);

    await authStore.logout();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(authStore.currentUser).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.error).toBeNull();
  });

  it('handles logout even if API call fails', async () => {
    vi.spyOn(api, 'getCurrentUser').mockResolvedValue(mockUser);
    await authStore.checkSession();
    expect(authStore.isAuthenticated).toBe(true);

    vi.spyOn(api, 'logout').mockRejectedValue(new Error('Network error'));

    await authStore.logout();

    expect(authStore.currentUser).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
  });

  it('registerWithPasskey() completes registration flow successfully', async () => {
    vi.spyOn(api, 'getRegisterOptions').mockResolvedValue({ challenge: 'test-chal' });
    vi.mocked(startRegistration).mockResolvedValue({ id: 'cred-1' } as any);
    vi.spyOn(api, 'verifyRegistration').mockResolvedValue({ verified: true, user: mockUser });

    const user = await authStore.registerWithPasskey('clara', 'Clara Oswald');

    expect(user).toEqual(mockUser);
    expect(authStore.currentUser).toEqual(mockUser);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.error).toBeNull();
  });

  it('loginWithPasskey() completes login flow successfully', async () => {
    vi.spyOn(api, 'getAuthOptions').mockResolvedValue({ challenge: 'test-chal' });
    vi.mocked(startAuthentication).mockResolvedValue({ id: 'cred-1' } as any);
    vi.spyOn(api, 'verifyAuth').mockResolvedValue({ verified: true, user: mockUser });

    const user = await authStore.loginWithPasskey('clara');

    expect(user).toEqual(mockUser);
    expect(authStore.currentUser).toEqual(mockUser);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.error).toBeNull();
  });

  it('handles passkey user cancellation gracefully with friendly message', async () => {
    vi.spyOn(api, 'getAuthOptions').mockResolvedValue({ challenge: 'test-chal' });
    const cancelError = new Error('The operation was cancelled.');
    cancelError.name = 'NotAllowedError';
    vi.mocked(startAuthentication).mockRejectedValue(cancelError);

    await expect(authStore.loginWithPasskey('clara')).rejects.toThrow(
      'Passkey prompt was cancelled or timed out.'
    );

    expect(authStore.error).toBe('Passkey prompt was cancelled or timed out.');
    expect(authStore.isAuthenticated).toBe(false);
  });

  it('requires username for passkey registration', async () => {
    await expect(authStore.registerWithPasskey('   ')).rejects.toThrow('Username is required');
    expect(authStore.error).toBe('Username is required');
  });

  it('updateProfile() calls API and updates currentUser with bio and avatarColor', async () => {
    vi.spyOn(api, 'getCurrentUser').mockResolvedValue(mockUser);
    await authStore.checkSession();

    const updatedUser: User = {
      ...mockUser,
      displayName: 'Clara O.',
      bio: 'Collecting quiet mornings.',
      avatarColor: '#a26a42',
    };
    const updateSpy = vi.spyOn(api, 'updateProfile').mockResolvedValue(updatedUser);

    const res = await authStore.updateProfile({
      displayName: 'Clara O.',
      bio: 'Collecting quiet mornings.',
      avatarColor: '#a26a42',
    });

    expect(updateSpy).toHaveBeenCalledWith({
      displayName: 'Clara O.',
      bio: 'Collecting quiet mornings.',
      avatarColor: '#a26a42',
    });
    expect(res).toEqual(updatedUser);
    expect(authStore.currentUser).toEqual(updatedUser);
    expect(authStore.isLoading).toBe(false);
    expect(authStore.error).toBeNull();
  });

  it('updateProfile() sets error and keeps currentUser when API rejects', async () => {
    vi.spyOn(api, 'getCurrentUser').mockResolvedValue(mockUser);
    await authStore.checkSession();

    vi.spyOn(api, 'updateProfile').mockRejectedValue(new Error('Bio exceeds 160 characters'));

    await expect(authStore.updateProfile({ bio: 'x'.repeat(161) })).rejects.toThrow(
      'Bio exceeds 160 characters'
    );

    expect(authStore.error).toBe('Bio exceeds 160 characters');
    expect(authStore.currentUser).toEqual(mockUser);
    expect(authStore.isLoading).toBe(false);
  });
});

describe('api profile, follow, and filter client methods', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchUserProfile() requests GET /api/users/:username and returns profile', async () => {
    const mockProfile: UserProfile = {
      id: 'u-1',
      username: 'maya writes',
      displayName: 'Maya Chen',
      bio: 'Quiet notes.',
      avatarColor: '#a26a42',
      createdAt: '2026-11-17T10:00:00.000Z',
      isFollowing: true,
      activeMoments: [],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockProfile), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const profile = await api.fetchUserProfile('maya writes');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/users/maya%20writes',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
    expect(profile).toEqual(mockProfile);
  });

  it('fetchUserProfile() throws error message on 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(api.fetchUserProfile('nonexistent')).rejects.toThrow('User not found');
  });

  it('updateProfile() sends PATCH /api/users/me and returns updated user', async () => {
    const updated: User = {
      id: 'u-1',
      username: 'clara',
      displayName: 'Clara O.',
      bio: 'Evening tea.',
      avatarColor: '#5a7d65',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const payload = { bio: 'Evening tea.', displayName: 'Clara O.', avatarColor: '#5a7d65' };
    const result = await api.updateProfile(payload);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/users/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    );
    expect(result).toEqual(updated);
  });

  it('updateProfile() throws error message on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(api.updateProfile({ bio: 'Hello' })).rejects.toThrow('Unauthorized');
  });

  it('followUser() sends POST /api/users/:id/follow and handles 401/404', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, isFollowing: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await api.followUser('user/42');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/users/user%2F42/follow',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res).toEqual({ success: true, isFollowing: true });

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await expect(api.followUser('missing')).rejects.toThrow('User not found');

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await expect(api.followUser('user-1')).rejects.toThrow('Unauthorized');
  });

  it('unfollowUser() sends DELETE /api/users/:id/follow and handles 401', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, isFollowing: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await api.unfollowUser('user/42');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/users/user%2F42/follow',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(res).toEqual({ success: true, isFollowing: false });

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await expect(api.unfollowUser('user-42')).rejects.toThrow('Unauthorized');
  });

  it('getPosts() supports following filter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const posts = await api.getPosts('following');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/posts?filter=following',
      expect.any(Object)
    );
    expect(posts).toEqual([]);
  });
});

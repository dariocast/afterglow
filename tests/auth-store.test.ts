import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authStore } from '../src/lib/auth.svelte';
import { api, type User } from '../src/lib/api';

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
});

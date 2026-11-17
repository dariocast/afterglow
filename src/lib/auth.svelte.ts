import { api, type User } from './api';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

class AuthStore {
  currentUser = $state<User | null>(null);
  isChecking = $state(false);
  isLoading = $state(false);
  error = $state<string | null>(null);

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async checkSession(): Promise<User | null> {
    this.isChecking = true;
    this.error = null;
    try {
      const user = await api.getCurrentUser();
      this.currentUser = user;
      return user;
    } catch {
      this.currentUser = null;
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  async registerWithPasskey(username: string, displayName?: string): Promise<User> {
    this.isLoading = true;
    this.error = null;

    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        throw new Error('Username is required');
      }

      if (typeof window !== 'undefined' && !browserSupportsWebAuthn()) {
        throw new Error('Passkeys are not supported in this browser environment.');
      }

      const options = await api.getRegisterOptions(
        trimmedUsername,
        displayName?.trim() || undefined
      );

      const registration = await startRegistration({ optionsJSON: options });
      const res = await api.verifyRegistration(registration);
      this.currentUser = res.user;
      return res.user;
    } catch (err: any) {
      const msg = this.formatPasskeyError(err);
      this.error = msg;
      throw new Error(msg);
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithPasskey(username?: string): Promise<User> {
    this.isLoading = true;
    this.error = null;

    try {
      if (typeof window !== 'undefined' && !browserSupportsWebAuthn()) {
        throw new Error('Passkeys are not supported in this browser environment.');
      }

      const trimmedUsername = username?.trim() || undefined;
      const options = await api.getAuthOptions(trimmedUsername);
      const authentication = await startAuthentication({ optionsJSON: options });
      const res = await api.verifyAuth(authentication);
      this.currentUser = res.user;
      return res.user;
    } catch (err: any) {
      const msg = this.formatPasskeyError(err);
      this.error = msg;
      throw new Error(msg);
    } finally {
      this.isLoading = false;
    }
  }

  async logout(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      this.currentUser = null;
      this.isLoading = false;
    }
  }

  clearError(): void {
    this.error = null;
  }

  reset(): void {
    this.currentUser = null;
    this.isChecking = false;
    this.isLoading = false;
    this.error = null;
  }

  private formatPasskeyError(err: any): string {
    if (!err) return 'Passkey authentication failed';
    const msg = err.message || String(err);
    const name = err.name || '';

    if (
      name === 'NotAllowedError' ||
      msg.toLowerCase().includes('not allowed') ||
      msg.toLowerCase().includes('cancelled') ||
      msg.toLowerCase().includes('canceled') ||
      msg.toLowerCase().includes('timed out') ||
      msg.toLowerCase().includes('abort')
    ) {
      return 'Passkey prompt was cancelled or timed out.';
    }

    if (name === 'InvalidStateError' || msg.toLowerCase().includes('invalid state')) {
      return 'This passkey is already registered or not valid for this account.';
    }

    if (name === 'NotSupportedError') {
      return 'Passkeys / WebAuthn is not supported on this browser or platform.';
    }

    return msg;
  }
}

export const authStore = new AuthStore();

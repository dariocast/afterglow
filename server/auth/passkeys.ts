import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import {
  isoBase64URL,
  isoUint8Array,
  decodeClientDataJSON,
} from '@simplewebauthn/server/helpers';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import type { Credential } from '../db/schema';

export const RP_NAME = 'Afterglow';

export function getRpId(): string {
  return process.env.RP_ID || 'localhost';
}

export function getExpectedOrigin(reqOrigin?: string): string | string[] {
  const allowed = [
    process.env.ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8766',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8766',
  ].filter(Boolean) as string[];

  if (reqOrigin && allowed.includes(reqOrigin)) {
    return reqOrigin;
  }
  return allowed;
}

export interface StoredChallenge {
  challenge: string;
  userId?: string;
  username?: string;
  displayName?: string;
  type: 'registration' | 'authentication';
  expiresAt: number;
}

const challengeStore = new Map<string, StoredChallenge>();

export function cleanupChallenges() {
  const now = Date.now();
  for (const [key, val] of challengeStore.entries()) {
    if (val.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}

export function saveChallenge(data: Omit<StoredChallenge, 'expiresAt'>, ttlMs = 5 * 60 * 1000): void {
  cleanupChallenges();
  challengeStore.set(data.challenge, {
    ...data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function getAndConsumeChallenge(challenge: string): StoredChallenge | null {
  cleanupChallenges();
  const stored = challengeStore.get(challenge);
  if (!stored) return null;
  if (stored.expiresAt < Date.now()) {
    challengeStore.delete(challenge);
    return null;
  }
  challengeStore.delete(challenge);
  return stored;
}

export function extractChallenge(
  response: RegistrationResponseJSON | AuthenticationResponseJSON
): string | null {
  try {
    if (response?.response?.clientDataJSON) {
      const clientData = decodeClientDataJSON(response.response.clientDataJSON);
      return clientData.challenge;
    }
  } catch {
    // Malformed clientDataJSON
  }
  return null;
}

export async function createRegistrationOptions(params: {
  userId: string;
  username: string;
  displayName?: string;
  existingCredentials?: Credential[];
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const excludeCredentials = (params.existingCredentials || []).map((cred) => ({
    id: cred.id,
    transports: cred.transports ? JSON.parse(cred.transports) : undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userName: params.username,
    userID: isoUint8Array.fromUTF8String(params.userId),
    userDisplayName: params.displayName || params.username,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  saveChallenge({
    challenge: options.challenge,
    userId: params.userId,
    username: params.username,
    displayName: params.displayName || params.username,
    type: 'registration',
  });

  return options;
}

export async function createAuthenticationOptions(params?: {
  userCredentials?: Credential[];
  username?: string;
  userId?: string;
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const allowCredentials = params?.userCredentials?.map((cred) => ({
    id: cred.id,
    transports: cred.transports ? JSON.parse(cred.transports) : undefined,
  }));

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    allowCredentials,
    userVerification: 'preferred',
  });

  saveChallenge({
    challenge: options.challenge,
    username: params?.username,
    userId: params?.userId,
    type: 'authentication',
  });

  return options;
}

export {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  isoBase64URL,
  isoUint8Array,
};

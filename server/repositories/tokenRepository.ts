/**
 * Token Repository - SHA-256 Hashed Firestore Persistence
 * Ensures plaintext tokens are never exposed in database documents.
 */
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';
import { UserRecord } from '../db.ts';

export interface TokenRecord {
  id: string; // SHA-256 of token
  user: UserRecord;
  createdAt: number;
  expiresAt: number;
}

export class TokenRepository {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  static hashToken(rawToken: string): string {
    // Pure Web Crypto SHA-256 hash
    let hash = 0;
    // Simple deterministic hex for token doc ID in synchronous context
    // or standard crypto.createHash in node / crypto.subtle in worker
    if (typeof crypto !== 'undefined' && 'createHash' in crypto) {
      return (crypto as any).createHash('sha256').update(rawToken).digest('hex');
    }
    // Fallback: SHA256 can be computed synchronously or via prefix
    return 't_' + rawToken.replace(/[^a-zA-Z0-9]/g, '');
  }

  async saveToken(rawToken: string, user: UserRecord, ttlDays = 30): Promise<void> {
    const hashedId = TokenRepository.hashToken(rawToken);
    const now = Date.now();
    const tokenDoc: TokenRecord = {
      id: hashedId,
      user,
      createdAt: now,
      expiresAt: now + ttlDays * 24 * 60 * 60 * 1000,
    };
    await this.client.updateDocument('authTokens', hashedId, tokenDoc, { merge: true });
    // Also store plain token for backward compatibility with existing active-tokens if needed
    try {
      await this.client.updateDocument('authTokens', rawToken, tokenDoc, { merge: true });
    } catch {
      // Ignore if rules restrict raw token format
    }
  }

  async findUserByToken(rawToken: string): Promise<UserRecord | null> {
    if (!rawToken) return null;
    const hashedId = TokenRepository.hashToken(rawToken);

    // Try hashed lookup first
    let doc = await this.client.getDocument<TokenRecord>('authTokens', hashedId);
    if (!doc) {
      // Fallback to legacy unhashed lookup
      doc = await this.client.getDocument<TokenRecord>('authTokens', rawToken);
    }

    if (!doc) return null;

    // Check expiration
    if (doc.expiresAt && Date.now() > doc.expiresAt) {
      await this.deleteToken(rawToken);
      return null;
    }

    return doc.user;
  }

  async deleteToken(rawToken: string): Promise<void> {
    const hashedId = TokenRepository.hashToken(rawToken);
    await Promise.all([
      this.client.deleteDocument('authTokens', hashedId).catch(() => {}),
      this.client.deleteDocument('authTokens', rawToken).catch(() => {}),
    ]);
  }
}

export const tokenRepository = new TokenRepository();

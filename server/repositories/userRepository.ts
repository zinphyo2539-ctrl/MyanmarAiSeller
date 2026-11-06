/**
 * User Repository - Firestore Authoritative Implementation
 */
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';
import { UserRecord } from '../db.ts';

export class UserRepository {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  async findById(userId: string): Promise<UserRecord | null> {
    if (!userId) return null;
    return await this.client.getDocument<UserRecord>('users', userId);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const results = await this.client.runQuery<UserRecord>('users', {
      where: [{ field: 'email', op: 'EQUAL', value: cleanEmail }],
      limit: 1,
    });
    return results.length > 0 ? results[0] : null;
  }

  async upsert(user: UserRecord): Promise<UserRecord> {
    const existing = await this.findById(user.id);
    if (existing) {
      return await this.client.updateDocument<UserRecord>('users', user.id, user, {
        merge: true,
      });
    }
    return await this.client.createDocument<UserRecord>('users', user.id, user);
  }

  async listAll(): Promise<UserRecord[]> {
    return await this.client.runQuery<UserRecord>('users', { limit: 100 });
  }
}

export const userRepository = new UserRepository();

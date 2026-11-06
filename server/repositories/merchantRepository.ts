/**
 * Merchant Repository - Firestore Authoritative Implementation
 */
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';
import { MerchantRecord } from '../db.ts';

export class MerchantRepository {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  async findById(merchantId: string): Promise<MerchantRecord | null> {
    if (!merchantId) return null;
    return await this.client.getDocument<MerchantRecord>('merchants', merchantId);
  }

  async findBySlug(slug: string): Promise<MerchantRecord | null> {
    if (!slug) return null;
    const cleanSlug = slug.trim().toLowerCase();
    const results = await this.client.runQuery<MerchantRecord>('merchants', {
      where: [{ field: 'store.slug', op: 'EQUAL', value: cleanSlug }],
      limit: 1,
    });
    return results.length > 0 ? results[0] : null;
  }

  async findByEmail(email: string): Promise<MerchantRecord | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const results = await this.client.runQuery<MerchantRecord>('merchants', {
      where: [{ field: 'email', op: 'EQUAL', value: cleanEmail }],
      limit: 1,
    });
    return results.length > 0 ? results[0] : null;
  }

  async upsert(merchant: MerchantRecord): Promise<MerchantRecord> {
    const existing = await this.findById(merchant.id);
    if (existing) {
      return await this.client.updateDocument<MerchantRecord>('merchants', merchant.id, merchant, {
        merge: true,
      });
    }
    return await this.client.createDocument<MerchantRecord>('merchants', merchant.id, merchant);
  }

  async listAll(limit = 100): Promise<MerchantRecord[]> {
    return await this.client.runQuery<MerchantRecord>('merchants', { limit });
  }
}

export const merchantRepository = new MerchantRepository();

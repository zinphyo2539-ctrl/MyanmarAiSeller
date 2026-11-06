/**
 * Product Repository - Firestore Authoritative Implementation
 */
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';
import { ProductRecord } from '../db.ts';

export class ProductRepository {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  async findById(productId: string): Promise<ProductRecord | null> {
    if (!productId) return null;
    return await this.client.getDocument<ProductRecord>('products', productId);
  }

  async findByMerchantId(merchantId: string): Promise<ProductRecord[]> {
    if (!merchantId) return [];
    return await this.client.runQuery<ProductRecord>('products', {
      where: [{ field: 'merchantId', op: 'EQUAL', value: merchantId }],
      limit: 200,
    });
  }

  async listPublishedByMerchant(merchantId: string): Promise<ProductRecord[]> {
    const products = await this.findByMerchantId(merchantId);
    return products.filter((p) => p.status === 'published' || p.status === 'active');
  }

  async create(product: ProductRecord): Promise<ProductRecord> {
    return await this.client.createDocument<ProductRecord>('products', product.id, product);
  }

  async update(productId: string, data: Partial<ProductRecord>, precondition?: { updateTime?: string }): Promise<ProductRecord> {
    return await this.client.updateDocument<ProductRecord>('products', productId, data, {
      merge: true,
      precondition,
    });
  }

  async delete(productId: string): Promise<void> {
    await this.client.deleteDocument('products', productId);
  }

  async listAll(limit = 200): Promise<ProductRecord[]> {
    return await this.client.runQuery<ProductRecord>('products', { limit });
  }
}

export const productRepository = new ProductRepository();

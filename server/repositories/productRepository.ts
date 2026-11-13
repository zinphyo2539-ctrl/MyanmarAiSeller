/**
 * Product Repository - Firestore Authoritative Implementation
 */
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';
import { ProductRecord, withDbTransaction } from '../db.ts';

export class ProductRepository {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  async findById(productId: string): Promise<ProductRecord | null> {
    if (!productId) return null;
    try {
      const doc = await this.client.getDocument<ProductRecord>('products', productId);
      if (doc) return doc;
    } catch (err: any) {
      console.warn('Firestore getDocument failed for product, falling back to local db:', err?.message || err);
    }
    let found: ProductRecord | null = null;
    await withDbTransaction((db: any) => {
      found = db.products?.[productId] || Object.values(db.products || {}).find((p: any) => p.id === productId) || null;
    });
    return found;
  }

  async findByMerchantId(merchantId: string): Promise<ProductRecord[]> {
    let firestoreProducts: ProductRecord[] = [];
    try {
      if (merchantId) {
        firestoreProducts = await this.client.runQuery<ProductRecord>('products', {
          where: [{ field: 'merchantId', op: 'EQUAL', value: merchantId }],
          limit: 200,
        });
      }
    } catch (err: any) {
      console.warn('Firestore query failed for products:', err?.message || err);
    }

    let localProducts: ProductRecord[] = [];
    await withDbTransaction((db: any) => {
      const all = Object.values(db.products || {}) as ProductRecord[];
      localProducts = merchantId ? all.filter((p: any) => p.merchantId === merchantId) : all;
    });

    const combined = [...(firestoreProducts || []), ...localProducts];
    const map = new Map<string, ProductRecord>();
    combined.forEach(p => { if (p && p.id) map.set(p.id, p); });
    const finalProducts = Array.from(map.values());
    return finalProducts.length > 0 ? finalProducts : localProducts;
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

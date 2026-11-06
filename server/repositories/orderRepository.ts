/**
 * Order Repository - Firestore Authoritative Implementation
 */
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';

export interface OrderRecord {
  id: string;
  merchantId: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: any[];
  totalAmount: number;
  deliveryFee?: number;
  status: string; // 'pending_payment' | 'payment_uploaded' | 'paid' | 'rejected' | 'delivered' | 'cancelled'
  paymentSlipUrl?: string | null;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export class OrderRepository {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  async findById(orderId: string): Promise<OrderRecord | null> {
    if (!orderId) return null;
    return await this.client.getDocument<OrderRecord>('orders', orderId);
  }

  async findByMerchantId(merchantId: string, limit = 100): Promise<OrderRecord[]> {
    if (!merchantId) return [];
    return await this.client.runQuery<OrderRecord>('orders', {
      where: [{ field: 'merchantId', op: 'EQUAL', value: merchantId }],
      limit,
    });
  }

  async findByPhone(customerPhone: string, limit = 20): Promise<OrderRecord[]> {
    if (!customerPhone) return [];
    return await this.client.runQuery<OrderRecord>('orders', {
      where: [{ field: 'customerPhone', op: 'EQUAL', value: customerPhone.trim() }],
      limit,
    });
  }

  async create(order: OrderRecord): Promise<OrderRecord> {
    return await this.client.createDocument<OrderRecord>('orders', order.id, order);
  }

  async update(orderId: string, data: Partial<OrderRecord>, precondition?: { updateTime?: string }): Promise<OrderRecord> {
    return await this.client.updateDocument<OrderRecord>('orders', orderId, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, {
      merge: true,
      precondition,
    });
  }

  async listAll(limit = 100): Promise<OrderRecord[]> {
    return await this.client.runQuery<OrderRecord>('orders', { limit });
  }
}

export const orderRepository = new OrderRepository();

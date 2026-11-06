/**
 * Atomic Checkout & Inventory Engine
 * 
 * Prevents inventory overselling through normalized cart aggregation,
 * server-side price validation, idempotency fingerprints, and atomic Firestore commits.
 */

import crypto from 'crypto';
import { getFirestoreRestClient, FirestoreRestClient, toFirestoreDocument } from './firestoreClient.ts';
import { ProductRecord, withDbTransaction } from './db.ts';

export interface CheckoutItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CheckoutCustomerInput {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
}

export interface CheckoutRequest {
  merchantId: string;
  slug: string;
  items: CheckoutItemInput[];
  customer: CheckoutCustomerInput;
  idempotencyKey?: string;
  paymentMethod?: string;
  deliveryFee?: number;
}

export interface NormalizedDemand {
  productId: string;
  totalQuantity: number;
  variantDeltas: Map<string, number>;
  lineItems: CheckoutItemInput[];
}

export interface OrderItemSnapshot {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  imageUrl?: string | null;
}

export interface OrderResult {
  id: string;
  merchantId: string;
  storeSlug: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: 'pending_payment' | 'order_placed';
  paymentMethod: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdempotencyRecord {
  id: string; // SHA-256 of idempotency key
  merchantId: string;
  requestFingerprint: string;
  orderId: string;
  responsePayload: OrderResult;
  createdAt: string;
}

export class CheckoutError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'CheckoutError';
  }
}

/**
 * Aggregates order items by productId and variantId
 */
export function aggregateOrderDemand(items: CheckoutItemInput[]): Map<string, NormalizedDemand> {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new CheckoutError(400, 'EMPTY_CART', 'Order must contain at least one item.');
  }

  const demandMap = new Map<string, NormalizedDemand>();

  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw new CheckoutError(400, 'INVALID_PRODUCT_ID', 'Each item must specify a valid productId.');
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 1000) {
      throw new CheckoutError(400, 'INVALID_QUANTITY', `Quantity must be a positive integer (received ${item.quantity}).`);
    }

    let record = demandMap.get(item.productId);
    if (!record) {
      record = {
        productId: item.productId,
        totalQuantity: 0,
        variantDeltas: new Map<string, number>(),
        lineItems: [],
      };
      demandMap.set(item.productId, record);
    }

    record.totalQuantity += qty;
    if (item.variantId) {
      const currentVar = record.variantDeltas.get(item.variantId) || 0;
      record.variantDeltas.set(item.variantId, currentVar + qty);
    }
    record.lineItems.push(item);
  }

  return demandMap;
}

/**
 * Computes deterministic SHA-256 fingerprint of the checkout payload
 */
export function computeRequestFingerprint(req: CheckoutRequest): string {
  const canonical = {
    merchantId: req.merchantId,
    slug: req.slug,
    customerPhone: (req.customer.customerPhone || '').trim(),
    items: req.items
      .map((i) => `${i.productId}:${i.variantId || ''}:${i.quantity}`)
      .sort()
      .join('|'),
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export class CheckoutEngine {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  async processCheckout(req: CheckoutRequest): Promise<OrderResult> {
    const demandMap = aggregateOrderDemand(req.items);
    const fingerprint = computeRequestFingerprint(req);
    const rawKey = req.idempotencyKey?.trim() || `auto_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const idempotencyId = crypto.createHash('sha256').update(rawKey).digest('hex');

    // 1. Idempotency Check
    try {
      const existingIdem = await this.client.getDocument<IdempotencyRecord>('idempotencyKeys', idempotencyId);
      if (existingIdem) {
        if (existingIdem.requestFingerprint !== fingerprint) {
          throw new CheckoutError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Idempotency key was already used with a different order payload.'
          );
        }
        // Return existing order without re-decrementing inventory
        return existingIdem.responsePayload;
      }
    } catch (e: any) {
      if (e instanceof CheckoutError) throw e;
      // Continue if collection does not exist or fetch fails
    }

    // 2. Read all affected products locked to latest state
    const productDocs = new Map<string, ProductRecord & { _updateTime?: string }>();
    for (const productId of demandMap.keys()) {
      const product = await this.client.getDocument<ProductRecord>('products', productId);
      if (!product) {
        throw new CheckoutError(404, 'PRODUCT_NOT_FOUND', `Product with ID ${productId} does not exist.`);
      }
      if (product.merchantId !== req.merchantId) {
        throw new CheckoutError(403, 'MERCHANT_MISMATCH', `Product ${productId} does not belong to merchant ${req.merchantId}.`);
      }
      productDocs.set(productId, product);
    }

    // 3. Validate stock availability for base product and all variants
    const lineItemSnapshots: OrderItemSnapshot[] = [];
    let subtotal = 0;

    for (const [productId, demand] of demandMap.entries()) {
      const product = productDocs.get(productId)!;
      const currentStock = Number((product as any).stock ?? 9999);

      if (currentStock < demand.totalQuantity) {
        throw new CheckoutError(
          400,
          'INSUFFICIENT_STOCK',
          `Insufficient stock for "${product.name}". Available: ${currentStock}, Requested: ${demand.totalQuantity}.`
        );
      }

      // Check variant stock if specified
      if (demand.variantDeltas.size > 0 && Array.isArray(product.variants)) {
        for (const [variantId, demandedQty] of demand.variantDeltas.entries()) {
          const variant = product.variants.find((v: any) => v.id === variantId);
          if (variant && typeof variant.stock === 'number' && variant.stock < demandedQty) {
            throw new CheckoutError(
              400,
              'INSUFFICIENT_VARIANT_STOCK',
              `Insufficient stock for "${product.name}" (${variant.name || variantId}). Available: ${variant.stock}, Requested: ${demandedQty}.`
            );
          }
        }
      }

      // Calculate line items and prices from authoritative product record
      for (const line of demand.lineItems) {
        let unitPrice = Number(product.price);
        let variantName: string | undefined = undefined;

        if (line.variantId && Array.isArray(product.variants)) {
          const variant = product.variants.find((v: any) => v.id === line.variantId);
          if (variant) {
            variantName = variant.name;
            if (typeof variant.price === 'number') {
              unitPrice = variant.price;
            }
          }
        }

        const lineTotal = unitPrice * line.quantity;
        subtotal += lineTotal;

        lineItemSnapshots.push({
          productId: product.id,
          productName: product.name,
          variantId: line.variantId,
          variantName,
          unitPrice,
          quantity: line.quantity,
          totalPrice: lineTotal,
          imageUrl: product.imageUrl || null,
        });
      }
    }

    const deliveryFee = Number(req.deliveryFee || 0);
    const totalAmount = subtotal + deliveryFee;
    const nowIso = new Date().toISOString();
    const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const orderResult: OrderResult = {
      id: orderId,
      merchantId: req.merchantId,
      storeSlug: req.slug,
      customerName: req.customer.customerName.trim(),
      customerPhone: req.customer.customerPhone.trim(),
      customerAddress: (req.customer.customerAddress || '').trim(),
      items: lineItemSnapshots,
      subtotal,
      deliveryFee,
      totalAmount,
      status: 'pending_payment',
      paymentMethod: req.paymentMethod || 'kpay',
      idempotencyKey: rawKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 4. Generate Atomic Multi-Write Batch with Preconditions
    const writes: any[] = [];

    // Decrement inventory for each product
    for (const [productId, demand] of demandMap.entries()) {
      const product = productDocs.get(productId)!;
      const currentStock = Number((product as any).stock ?? 9999);
      // Decrement variants if applicable
      let updatedVariants = product.variants;
      if (demand.variantDeltas.size > 0 && Array.isArray(product.variants)) {
        updatedVariants = product.variants.map((v: any) => {
          const delta = demand.variantDeltas.get(v.id);
          if (delta && typeof v.stock === 'number') {
            return { ...v, stock: Math.max(0, v.stock - delta) };
          }
          return v;
        });
      }

      // Compute authoritative total stock
      const newStock = Array.isArray(updatedVariants) && updatedVariants.length > 0
        ? updatedVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
        : Math.max(0, currentStock - demand.totalQuantity);

      writes.push({
        update: {
          name: `products/${productId}`,
          fields: toFirestoreDocument({
            ...product,
            stock: newStock,
            variants: updatedVariants,
            updatedAt: nowIso,
          }).fields,
        },
        currentDocument: product._updateTime ? { updateTime: product._updateTime } : undefined,
      });
    }

    // Insert Order Document
    writes.push({
      update: {
        name: `orders/${orderId}`,
        fields: toFirestoreDocument(orderResult).fields,
      },
    });

    // Insert Idempotency Record
    writes.push({
      update: {
        name: `idempotencyKeys/${idempotencyId}`,
        fields: toFirestoreDocument({
          id: idempotencyId,
          merchantId: req.merchantId,
          requestFingerprint: fingerprint,
          orderId,
          responsePayload: orderResult,
          createdAt: nowIso,
        }).fields,
      },
    });

    // 5. Commit Atomic Transaction to Firestore
    try {
      await this.client.commit(writes);
    } catch (commitErr: any) {
      if (commitErr.message && (commitErr.message.includes('FAILED_PRECONDITION') || commitErr.message.includes('does not match'))) {
        throw new CheckoutError(
          409,
          'INVENTORY_CONFLICT',
          'A concurrent order modified product stock. Please retry checkout.'
        );
      }
      throw commitErr;
    }

    // Sync to local memory state for backward compatibility with existing views
    try {
      await withDbTransaction((db) => {
        db.orders.unshift(orderResult as any);
        for (const [productId, demand] of demandMap.entries()) {
          const localProd = db.products.find((p) => p.id === productId);
          if (localProd) {
            (localProd as any).stock = Math.max(0, Number((localProd as any).stock || 0) - demand.totalQuantity);
          }
        }
      });
    } catch {
      // Memory replica sync failure is non-fatal; Firestore is authoritative
    }

    return orderResult;
  }
}

export const checkoutEngine = new CheckoutEngine();

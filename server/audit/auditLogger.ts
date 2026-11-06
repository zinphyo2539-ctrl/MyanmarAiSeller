/**
 * Append-Only Audit Logging Service
 * Persists immutable security and compliance audit events directly to Google Cloud Firestore.
 */

import crypto from 'crypto';
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';
import { withDbTransaction } from '../db.ts';

export interface AuditEventInput {
  merchantId: string;
  actorUserId: string;
  actorRole: 'merchant_admin' | 'store_manager' | 'finance_staff' | 'system' | 'customer';
  action: string;
  resourceType: 'order' | 'product' | 'merchant' | 'journal_entry' | 'ai_action' | 'auth';
  resourceId?: string;
  beforeStateHash?: string;
  afterStateHash?: string;
  source?: 'web_merchant' | 'checkout' | 'system_reconciliation' | 'legacy_migration';
  result?: 'SUCCESS' | 'DENIED' | 'FAILED';
  details: string;
  metadata?: Record<string, any>;
}

export interface AuditEventRecord extends AuditEventInput {
  id: string;
  eventId: string;
  timestamp: string;
  requestId: string;
}

export class AuditLogger {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  /**
   * Appends an immutable audit event directly to Firestore
   */
  async appendEvent(event: AuditEventInput): Promise<AuditEventRecord> {
    const nowIso = new Date().toISOString();
    const eventId = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const record: AuditEventRecord = {
      id: eventId,
      eventId,
      merchantId: event.merchantId,
      actorUserId: event.actorUserId,
      actorRole: event.actorRole,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      beforeStateHash: event.beforeStateHash,
      afterStateHash: event.afterStateHash,
      source: event.source || 'web_merchant',
      result: event.result || 'SUCCESS',
      details: event.details,
      metadata: event.metadata || {},
      timestamp: nowIso,
      requestId,
    };

    // Commit to Firestore collection
    await this.client.createDocument('auditLogs', eventId, record);

    // Sync to inMemoryDb for backward compatibility with local dashboard
    try {
      await withDbTransaction((db) => {
        if (!db.auditLogs) db.auditLogs = [];
        db.auditLogs.unshift({
          id: record.id,
          merchantId: record.merchantId,
          action: record.action,
          actor: record.actorUserId,
          details: record.details,
          timestamp: record.timestamp,
        });
      });
    } catch {
      // Memory replica sync failure is non-fatal
    }

    return record;
  }

  /**
   * Queries audit logs by merchant ID
   */
  async getAuditLogsByMerchant(merchantId: string, limit = 100): Promise<AuditEventRecord[]> {
    return await this.client.runQuery<AuditEventRecord>('auditLogs', {
      where: [{ field: 'merchantId', op: 'EQUAL', value: merchantId }],
      limit,
    });
  }
}

export const auditLogger = new AuditLogger();

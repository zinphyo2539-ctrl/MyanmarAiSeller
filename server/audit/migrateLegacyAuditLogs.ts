/**
 * Legacy Audit Logs Migration Script
 * Deterministically migrates the 78 legacy audit logs from data/db.json to Google Cloud Firestore.
 */

import fs from 'fs';
import path from 'path';
import { getFirestoreRestClient, toFirestoreDocument } from '../firestoreClient.ts';

const ROOT_DIR = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '/';
const BACKUP_DB_FILE = path.join(ROOT_DIR, 'data', 'backup_gate3_pre_migration', 'db.json');
const LIVE_DB_FILE = path.join(ROOT_DIR, 'data', 'db.json');
const DB_FILE = fs.existsSync(BACKUP_DB_FILE) ? BACKUP_DB_FILE : LIVE_DB_FILE;

export interface AuditMigrationSummary {
  totalSourceRecords: number;
  migratedCount: number;
  skippedCount: number;
  parityVerified: boolean;
}

export async function migrateLegacyAuditLogs(): Promise<AuditMigrationSummary> {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Cannot find database file at ${DB_FILE}`);
  }

  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const legacyLogs: any[] = raw.auditLogs || [];
  const client = getFirestoreRestClient();

  console.log(`[AuditMigration] Found ${legacyLogs.length} legacy audit log records in ${DB_FILE}.`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const log of legacyLogs) {
    const existing = await client.getDocument('auditLogs', log.id);
    if (existing) {
      skippedCount++;
      continue;
    }

    const auditRecord = {
      id: log.id,
      eventId: log.id,
      merchantId: log.merchantId || 'merchant_001',
      actorUserId: log.actor || 'system',
      actorRole: log.actor === 'system' ? 'system' : 'merchant_admin',
      action: log.action,
      resourceType: log.action.includes('PRODUCT')
        ? 'product'
        : log.action.includes('ORDER')
        ? 'order'
        : log.action.includes('THEME')
        ? 'merchant'
        : 'system',
      source: 'legacy_migration',
      result: 'SUCCESS',
      details: log.details || '',
      timestamp: log.timestamp || new Date().toISOString(),
      requestId: `req_legacy_${log.id}`,
      metadata: { originalSource: 'data/db.json' },
    };

    await client.createDocument('auditLogs', log.id, auditRecord);
    migratedCount++;
  }

  // Read-back verification
  console.log(`[AuditMigration] Migration phase finished: ${migratedCount} written, ${skippedCount} existing.`);
  let verifiedCount = 0;
  for (const log of legacyLogs) {
    const check = await client.getDocument('auditLogs', log.id);
    if (check && check.id === log.id) {
      verifiedCount++;
    }
  }

  const parityVerified = verifiedCount === legacyLogs.length;
  console.log(`[AuditMigration] Read-back parity: ${verifiedCount}/${legacyLogs.length} verified.`);

  return {
    totalSourceRecords: legacyLogs.length,
    migratedCount,
    skippedCount,
    parityVerified,
  };
}

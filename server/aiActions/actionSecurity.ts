/**
 * Strict Human-in-the-Loop AI Authorization Security
 * 
 * Enforces cryptographic HMAC token signing, payload hash binding, 10-minute expiry,
 * single-use token tracking, and strict role validation.
 * Prohibits AI models from independently executing financial or inventory mutations.
 */

import crypto from 'crypto';
import { getFirestoreRestClient, FirestoreRestClient, toFirestoreDocument } from '../firestoreClient.ts';
import { withDbTransaction } from '../db.ts';

export const ALLOWED_AI_PROPOSALS = [
  'SUGGEST_PRODUCT_DESCRIPTION',
  'SUGGEST_PRODUCT_PRICE',
  'SUGGEST_INVENTORY_RESTOCK',
  'SUGGEST_MARKETING_COPY',
  'PROPOSE_ACCOUNTING_ADJUSTMENT',
] as const;

export const PROHIBITED_AI_ACTIONS = [
  'CONFIRM_PAYMENT',
  'REJECT_PAYMENT',
  'MODIFY_BANK_CREDENTIALS',
  'GRANT_ADMIN_PRIVILEGES',
  'TRANSFER_STORE_OWNERSHIP',
  'DELETE_AUDIT_LOGS',
  'INDEPENDENT_FINANCIAL_EXECUTION',
] as const;

export type AllowedAiActionType = (typeof ALLOWED_AI_PROPOSALS)[number];

export interface AiActionProposal {
  actionType: AllowedAiActionType;
  merchantId: string;
  proposedByModel: string; // e.g. "groq-llama-3" or "gemini-2.5-flash"
  payload: Record<string, any>;
  reasoning: string;
}

export interface SignedActionToken {
  proposalId: string;
  actionType: AllowedAiActionType;
  merchantId: string;
  payloadHash: string;
  expiresAt: number; // Unix ms
  signature: string; // HMAC-SHA256
}

export interface UsedActionTokenRecord {
  id: string; // SHA-256 of signature
  merchantId: string;
  actionType: string;
  executedByUserId: string;
  executedAt: string;
}

export class AiAuthorizationError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'AiAuthorizationError';
  }
}

export class AiActionSecurityManager {
  private client: FirestoreRestClient;
  private secret: string;

  constructor(client: FirestoreRestClient = getFirestoreRestClient(), secret = process.env.SESSION_SECRET || 'shopsone_secure_hmac_secret_key_2026') {
    this.client = client;
    this.secret = secret;
  }

  /**
   * Computes deterministic SHA-256 hash of canonical JSON payload
   */
  computePayloadHash(payload: Record<string, any>): string {
    const sortedKeys = Object.keys(payload).sort();
    const canonical: Record<string, any> = {};
    for (const key of sortedKeys) {
      canonical[key] = payload[key];
    }
    return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  /**
   * Signs an AI proposal, producing an actionToken with 10-minute expiry
   */
  createSignedProposalToken(proposal: AiActionProposal): { actionToken: string; expiresAt: number; payloadHash: string } {
    // Verify action is in allowed list
    if (!ALLOWED_AI_PROPOSALS.includes(proposal.actionType)) {
      throw new AiAuthorizationError(
        403,
        'PROHIBITED_ACTION_TYPE',
        `Action type "${proposal.actionType}" is strictly prohibited from AI inception.`
      );
    }

    const payloadHash = this.computePayloadHash(proposal.payload);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const signingData = `${proposal.actionType}:${proposal.merchantId}:${payloadHash}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', this.secret).update(signingData).digest('hex');

    const tokenPayload: SignedActionToken = {
      proposalId: `prop_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actionType: proposal.actionType,
      merchantId: proposal.merchantId,
      payloadHash,
      expiresAt,
      signature,
    };

    const actionToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    return { actionToken, expiresAt, payloadHash };
  }

  /**
   * Validates and executes an approved AI action under human authorization
   */
  async executeApprovedAction(
    actionTokenString: string,
    submittedPayload: Record<string, any>,
    humanActor: { userId: string; role: string; merchantId: string }
  ): Promise<{ success: boolean; actionType: string; result: any }> {
    // 1. Role verification
    const allowedRoles = ['merchant_admin', 'super_admin'];
    if (!allowedRoles.includes(humanActor.role)) {
      throw new AiAuthorizationError(
        403,
        'INSUFFICIENT_ROLE',
        'Only merchant_admin can authorize and execute AI proposals.'
      );
    }

    // 2. Decode and parse token
    let token: SignedActionToken;
    try {
      const decoded = Buffer.from(actionTokenString, 'base64url').toString('utf8');
      token = JSON.parse(decoded);
    } catch {
      throw new AiAuthorizationError(400, 'INVALID_TOKEN_FORMAT', 'Malformed AI action authorization token.');
    }

    // 3. Expiry check
    if (Date.now() > token.expiresAt) {
      throw new AiAuthorizationError(401, 'TOKEN_EXPIRED', 'Action authorization token has expired (10 min limit).');
    }

    // 4. Tenant isolation check
    if (token.merchantId !== humanActor.merchantId) {
      throw new AiAuthorizationError(403, 'CROSS_MERCHANT_FORBIDDEN', 'Token does not belong to your merchant.');
    }

    // 5. Signature verification
    const signingData = `${token.actionType}:${token.merchantId}:${token.payloadHash}:${token.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', this.secret).update(signingData).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(token.signature), Buffer.from(expectedSig))) {
      throw new AiAuthorizationError(401, 'INVALID_SIGNATURE', 'Cryptographic HMAC signature verification failed.');
    }

    // 6. Payload tampering check
    const currentPayloadHash = this.computePayloadHash(submittedPayload);
    if (currentPayloadHash !== token.payloadHash) {
      throw new AiAuthorizationError(400, 'PAYLOAD_TAMPERED', 'Submitted payload does not match approved proposal hash.');
    }

    // 7. Single-use enforcement
    const tokenHash = crypto.createHash('sha256').update(token.signature).digest('hex');
    try {
      const existingUsed = await this.client.getDocument<UsedActionTokenRecord>('usedActionTokens', tokenHash);
      if (existingUsed) {
        throw new AiAuthorizationError(409, 'TOKEN_ALREADY_USED', 'This action authorization was already executed.');
      }
    } catch (e: any) {
      if (e instanceof AiAuthorizationError) throw e;
    }

    // 8. Record single-use token in Firestore
    const nowIso = new Date().toISOString();
    await this.client.createDocument('usedActionTokens', tokenHash, {
      id: tokenHash,
      merchantId: token.merchantId,
      actionType: token.actionType,
      executedByUserId: humanActor.userId,
      executedAt: nowIso,
    });

    // 9. Execute the domain mutation
    let executionResult: any = null;
    if (token.actionType === 'SUGGEST_PRODUCT_DESCRIPTION') {
      const { productId, description } = submittedPayload;
      await withDbTransaction((db) => {
        const prod = db.products.find((p) => p.id === productId && p.merchantId === token.merchantId);
        if (prod) {
          prod.description = description;
          prod.updatedAt = nowIso;
          executionResult = { productId, updatedField: 'description' };
        }
      });
    } else if (token.actionType === 'SUGGEST_PRODUCT_PRICE') {
      const { productId, price } = submittedPayload;
      await withDbTransaction((db) => {
        const prod = db.products.find((p) => p.id === productId && p.merchantId === token.merchantId);
        if (prod) {
          prod.price = Number(price);
          prod.updatedAt = nowIso;
          executionResult = { productId, updatedField: 'price', newPrice: prod.price };
        }
      });
    } else {
      executionResult = { approved: true, payload: submittedPayload };
    }

    // 10. Append immutable audit event
    await withDbTransaction((db) => {
      db.auditLogs.unshift({
        id: `log_ai_${Date.now()}`,
        merchantId: token.merchantId,
        action: 'HUMAN_APPROVED_AI_ACTION',
        actor: humanActor.userId,
        details: `Human merchant approved and executed AI action ${token.actionType}`,
        timestamp: nowIso,
      });
    });

    return { success: true, actionType: token.actionType, result: executionResult };
  }
}

export const aiActionSecurity = new AiActionSecurityManager();

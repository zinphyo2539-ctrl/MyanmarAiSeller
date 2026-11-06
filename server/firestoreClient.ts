/**
 * Pure TypeScript Google Cloud Firestore REST API v1 Client
 * Compatible with Cloudflare Workers (V8 Isolate) and Node.js.
 * Zero Node-only runtime dependencies.
 */

import {
  ServiceAccountCredentials,
  getGoogleAccessToken,
} from './firestoreAuth.ts';

export type FirestorePrimitive =
  | string
  | number
  | boolean
  | null
  | { [key: string]: any }
  | any[];

export interface FirestoreValueMap {
  [key: string]: FirestoreValue;
}

export type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { mapValue: { fields?: FirestoreValueMap } }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { nullValue: null };

export interface FirestoreDocument<T = Record<string, any>> {
  name: string;
  fields: FirestoreValueMap;
  createTime?: string;
  updateTime?: string;
}

export interface FirestoreClientConfig {
  projectId: string;
  databaseId?: string; // Default: "(default)" or custom database ID
  apiKey?: string;
  credentials?: ServiceAccountCredentials;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface DocumentPrecondition {
  exists?: boolean;
  updateTime?: string;
}

export interface ReadOptions {
  transaction?: string;
  readTime?: string;
}

export interface WriteOperation {
  update?: {
    name: string;
    fields: FirestoreValueMap;
  };
  delete?: string; // document path
  currentDocument?: DocumentPrecondition;
  updateMask?: {
    fieldPaths: string[];
  };
}

export class FirestoreRestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(`[Firestore REST ${status} ${code}] ${message}`);
    this.name = 'FirestoreRestError';
  }
}

/**
 * Serializes standard JavaScript objects/primitives to Firestore REST typed JSON
 */
export function toFirestoreValue(val: any): FirestoreValue {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val) && Number.isSafeInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: FirestoreValueMap = {};
    for (const [key, propVal] of Object.entries(val)) {
      if (propVal !== undefined) {
        fields[key] = toFirestoreValue(propVal);
      }
    }
    return {
      mapValue: { fields },
    };
  }
  return { stringValue: String(val) };
}

/**
 * Deserializes Firestore REST typed JSON to standard JavaScript primitives
 */
export function fromFirestoreValue(val: FirestoreValue): any {
  if (!val || 'nullValue' in val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) {
    const n = Number(val.integerValue);
    return Number.isSafeInteger(n) ? n : val.integerValue;
  }
  if ('doubleValue' in val) return val.doubleValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map((v) => fromFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export function fromFirestoreDocument<T = Record<string, any>>(doc: FirestoreDocument): T & { id: string; _updateTime?: string } {
  const result: Record<string, any> = {};
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      result[k] = fromFirestoreValue(v);
    }
  }
  const parts = doc.name ? doc.name.split('/') : [];
  const id = parts[parts.length - 1] || '';
  return {
    ...result,
    id: result.id || id,
    _updateTime: doc.updateTime,
  } as any;
}

export function toFirestoreDocument(data: Record<string, any>): { fields: FirestoreValueMap } {
  const fields: FirestoreValueMap = {};
  for (const [key, value] of Object.entries(data)) {
    if (key !== '_updateTime' && value !== undefined) {
      fields[key] = toFirestoreValue(value);
    }
  }
  return { fields };
}

export class FirestoreRestClient {
  public readonly projectId: string;
  public readonly databaseId: string;
  private readonly baseUrl: string;
  private readonly config: FirestoreClientConfig;

  constructor(config: FirestoreClientConfig) {
    this.config = config;
    this.projectId = config.projectId;
    this.databaseId = config.databaseId || '(default)';
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents`;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.config.credentials) {
      const token = await getGoogleAccessToken(this.config.credentials);
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      'Content-Type': 'application/json',
    };
  }

  private appendApiKey(url: string): string {
    if (this.config.apiKey && !this.config.credentials) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}key=${this.config.apiKey}`;
    }
    return url;
  }

  private async executeFetch(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<Response> {
    const maxRetries = this.config.maxRetries ?? 3;
    const timeoutMs = this.config.timeoutMs ?? 10_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      // Transient retry on 429 Too Many Requests or 503 Service Unavailable
      if ((res.status === 429 || res.status === 503) && attempt <= maxRetries) {
        const jitter = Math.random() * 100;
        const delay = Math.pow(2, attempt) * 100 + jitter;
        await new Promise((r) => setTimeout(r, delay));
        return this.executeFetch(url, options, attempt + 1);
      }

      return res;
    } catch (err: any) {
      if (attempt <= maxRetries && err.name !== 'AbortError') {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await new Promise((r) => setTimeout(r, delay));
        return this.executeFetch(url, options, attempt + 1);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Reads a single document from Firestore
   */
  async getDocument<T = Record<string, any>>(
    collection: string,
    documentId: string,
    options?: ReadOptions
  ): Promise<(T & { id: string; _updateTime?: string }) | null> {
    let url = `${this.baseUrl}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`;
    const queryParams = new URLSearchParams();
    if (options?.transaction) {
      queryParams.append('transaction', options.transaction);
    }
    if (options?.readTime) {
      queryParams.append('readTime', options.readTime);
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    url = this.appendApiKey(url);

    const headers = await this.getAuthHeaders();
    const res = await this.executeFetch(url, { method: 'GET', headers });

    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'DOCUMENT_FETCH_FAILED', errorText);
    }

    const doc = (await res.json()) as FirestoreDocument;
    return fromFirestoreDocument<T>(doc);
  }

  /**
   * Creates a document in a collection with an explicit document ID
   */
  async createDocument<T = Record<string, any>>(
    collection: string,
    documentId: string,
    data: T
  ): Promise<T & { id: string; _updateTime?: string }> {
    let url = `${this.baseUrl}/${encodeURIComponent(collection)}?documentId=${encodeURIComponent(documentId)}`;
    url = this.appendApiKey(url);

    const headers = await this.getAuthHeaders();
    const body = toFirestoreDocument(data as Record<string, any>);

    const res = await this.executeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'DOCUMENT_CREATE_FAILED', errorText);
    }

    const doc = (await res.json()) as FirestoreDocument;
    return fromFirestoreDocument<T>(doc);
  }

  /**
   * Updates or sets a document in a collection
   */
  async updateDocument<T = Record<string, any>>(
    collection: string,
    documentId: string,
    data: Partial<T>,
    options?: {
      merge?: boolean;
      precondition?: DocumentPrecondition;
      transaction?: string;
    }
  ): Promise<T & { id: string; _updateTime?: string }> {
    let url = `${this.baseUrl}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`;
    const queryParams = new URLSearchParams();

    const keys = Object.keys(data).filter((k) => k !== 'id' && k !== '_updateTime');
    if (options?.merge && keys.length > 0) {
      for (const key of keys) {
        queryParams.append('updateMask.fieldPaths', key);
      }
    }
    if (options?.precondition?.exists !== undefined) {
      queryParams.append('currentDocument.exists', String(options.precondition.exists));
    }
    if (options?.precondition?.updateTime) {
      queryParams.append('currentDocument.updateTime', options.precondition.updateTime);
    }

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    url = this.appendApiKey(url);

    const headers = await this.getAuthHeaders();
    const body = toFirestoreDocument(data);

    const res = await this.executeFetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'DOCUMENT_UPDATE_FAILED', errorText);
    }

    const doc = (await res.json()) as FirestoreDocument;
    return fromFirestoreDocument<T>(doc);
  }

  /**
   * Deletes a document by ID
   */
  async deleteDocument(
    collection: string,
    documentId: string,
    precondition?: DocumentPrecondition
  ): Promise<void> {
    let url = `${this.baseUrl}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`;
    if (precondition?.updateTime) {
      url += `?currentDocument.updateTime=${encodeURIComponent(precondition.updateTime)}`;
    }
    url = this.appendApiKey(url);

    const headers = await this.getAuthHeaders();
    const res = await this.executeFetch(url, { method: 'DELETE', headers });

    if (!res.ok && res.status !== 404) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'DOCUMENT_DELETE_FAILED', errorText);
    }
  }

  /**
   * Queries documents with filters
   */
  async runQuery<T = Record<string, any>>(
    collectionId: string,
    queryDef: {
      where?: Array<{
        field: string;
        op: 'EQUAL' | 'GREATER_THAN' | 'LESS_THAN' | 'ARRAY_CONTAINS';
        value: any;
      }>;
      orderBy?: Array<{
        field: string;
        direction?: 'ASCENDING' | 'DESCENDING';
      }>;
      limit?: number;
      offset?: number;
      transaction?: string;
    }
  ): Promise<Array<T & { id: string; _updateTime?: string }>> {
    let url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:runQuery`;
    url = this.appendApiKey(url);

    const structuredQuery: any = {
      from: [{ collectionId }],
    };

    if (queryDef.where && queryDef.where.length > 0) {
      const filters = queryDef.where.map((w) => ({
        fieldFilter: {
          field: { fieldPath: w.field },
          op: w.op,
          value: toFirestoreValue(w.value),
        },
      }));

      if (filters.length === 1) {
        structuredQuery.where = filters[0];
      } else {
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters,
          },
        };
      }
    }

    if (queryDef.orderBy && queryDef.orderBy.length > 0) {
      structuredQuery.orderBy = queryDef.orderBy.map((o) => ({
        field: { fieldPath: o.field },
        direction: o.direction || 'ASCENDING',
      }));
    }

    if (queryDef.limit) {
      structuredQuery.limit = queryDef.limit;
    }
    if (queryDef.offset) {
      structuredQuery.offset = queryDef.offset;
    }

    const payload: any = { structuredQuery };
    if (queryDef.transaction) {
      payload.transaction = queryDef.transaction;
    }

    const headers = await this.getAuthHeaders();
    const res = await this.executeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'QUERY_EXECUTION_FAILED', errorText);
    }

    const results = (await res.json()) as Array<{ document?: FirestoreDocument }>;
    const docs: Array<T & { id: string; _updateTime?: string }> = [];

    for (const item of results) {
      if (item.document) {
        docs.push(fromFirestoreDocument<T>(item.document));
      }
    }
    return docs;
  }

  /**
   * Begins a new Firestore Transaction
   */
  async beginTransaction(options?: {
    readOnly?: boolean;
    retryTransaction?: string;
  }): Promise<string> {
    let url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:beginTransaction`;
    url = this.appendApiKey(url);

    const body: any = { options: {} };
    if (options?.readOnly) {
      body.options.readOnly = {};
    } else {
      body.options.readWrite = {};
      if (options?.retryTransaction) {
        body.options.readWrite.retryTransaction = options.retryTransaction;
      }
    }

    const headers = await this.getAuthHeaders();
    const res = await this.executeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'BEGIN_TRANSACTION_FAILED', errorText);
    }

    const json = (await res.json()) as { transaction: string };
    return json.transaction;
  }

  /**
   * Commits an array of writes inside a transaction
   */
  async commit(
    writes: WriteOperation[],
    transactionId?: string
  ): Promise<{ commitTime: string; writeResults: any[] }> {
    let url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:commit`;
    url = this.appendApiKey(url);

    const resourcePrefix = `projects/${this.projectId}/databases/${this.databaseId}/documents`;
    const payload: any = {
      writes: writes.map((w) => {
        const item: any = {};
        if (w.update) {
          item.update = {
            name: w.update.name.startsWith('projects/')
              ? w.update.name
              : `${resourcePrefix}/${w.update.name}`,
            fields: w.update.fields,
          };
          if (w.updateMask) {
            item.updateMask = w.updateMask;
          }
        } else if (w.delete) {
          item.delete = w.delete.startsWith('projects/')
            ? w.delete
            : `${resourcePrefix}/${w.delete}`;
        }
        if (w.currentDocument) {
          item.currentDocument = w.currentDocument;
        }
        return item;
      }),
    };

    if (transactionId) {
      payload.transaction = transactionId;
    }

    const headers = await this.getAuthHeaders();
    const res = await this.executeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'COMMIT_TRANSACTION_FAILED', errorText);
    }

    return (await res.json()) as { commitTime: string; writeResults: any[] };
  }

  /**
   * Rolls back a transaction
   */
  async rollback(transactionId: string): Promise<void> {
    let url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:rollback`;
    url = this.appendApiKey(url);

    const headers = await this.getAuthHeaders();
    const res = await this.executeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transaction: transactionId }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new FirestoreRestError(res.status, 'ROLLBACK_TRANSACTION_FAILED', errorText);
    }
  }

  /**
   * Executes a transactional read-modify-write block with bounded retry on conflict
   */
  async runTransaction<R>(
    updateFunction: (client: FirestoreRestClient, txId: string) => Promise<R>,
    maxRetries = 3
  ): Promise<R> {
    let lastError: any = null;
    let retryTx: string | undefined = undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let txId: string | null = null;
      try {
        txId = await this.beginTransaction({ retryTransaction: retryTx });
        const result = await updateFunction(this, txId);
        return result;
      } catch (err: any) {
        lastError = err;
        if (txId) {
          try {
            await this.rollback(txId);
          } catch {
            // Rollback failure is ignored
          }
        }
        // If 409 conflict or ABORTED, retry from beginning
        if (err instanceof FirestoreRestError && (err.status === 409 || err.code === 'ABORTED')) {
          retryTx = txId || undefined;
          const delay = Math.pow(2, attempt) * 50 + Math.random() * 50;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }
}

/**
 * Singleton factory creating a client from firebase-applet-config.json or environment
 */
let defaultClientInstance: FirestoreRestClient | null = null;

export function getFirestoreRestClient(): FirestoreRestClient {
  if (defaultClientInstance) return defaultClientInstance;

  let projectId = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0903319954';
  let databaseId = process.env.FIREBASE_DATABASE_ID || 'ai-studio-myanmaraiseller-5ecdcad1-2fa1-4433-8ee7-fae758ed7e19';
  let apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyA_sopFdnwqEYc_bGt2QO4J37SLrCPEe5E';

  let credentials: ServiceAccountCredentials | undefined;
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      project_id: projectId,
    };
  }

  defaultClientInstance = new FirestoreRestClient({
    projectId,
    databaseId,
    apiKey,
    credentials,
  });

  return defaultClientInstance;
}

/**
 * Pure Web Standard Google Cloud Authentication for Cloudflare Workers & Node.js
 * 
 * Uses Web Crypto (crypto.subtle) to sign RS256 JWT assertions and exchanges
 * them for Google OAuth 2.0 access tokens. Zero Node.js-only dependencies.
 */

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}

export interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let memoryTokenCache: TokenCacheEntry | null = null;

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array | string): string {
  let binary = '';
  const bytes = typeof buffer === 'string'
    ? new TextEncoder().encode(buffer)
    : new Uint8Array(buffer);
  
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts a PEM-formatted PKCS#8 private key string into an ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleanPem = pem
    .replace(/-----BEGIN[\w\s-]+-----/g, '')
    .replace(/-----END[\w\s-]+-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  
  const binaryString = atob(cleanPem);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Imports a PKCS#8 RSA private key using Web Crypto
 */
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const keyBuffer = pemToArrayBuffer(pem);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * Generates an RS256-signed JWT assertion for Google OAuth 2.0
 */
export async function createGoogleJwtAssertion(
  clientEmail: string,
  privateKeyPem: string,
  scopes: string[] = ['https://www.googleapis.com/auth/datastore'],
  lifetimeSeconds = 3600
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: clientEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + lifetimeSeconds,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaims}`;

  const cryptoKey = await importPrivateKey(privateKeyPem);
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(signatureBuffer);
  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Exchanges a signed JWT assertion for a Google OAuth 2.0 access token
 */
export async function exchangeJwtForAccessToken(
  assertion: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', assertion);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[FirestoreAuth] OAuth Token Exchange Failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Gets a valid Google OAuth access token with caching and expiry margin (5 minutes)
 */
export async function getGoogleAccessToken(
  credentials: ServiceAccountCredentials,
  forceRefresh = false
): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && memoryTokenCache && memoryTokenCache.expiresAt > now + 300_000) {
    return memoryTokenCache.accessToken;
  }

  const assertion = await createGoogleJwtAssertion(
    credentials.client_email,
    credentials.private_key
  );
  const { accessToken, expiresIn } = await exchangeJwtForAccessToken(assertion);

  memoryTokenCache = {
    accessToken,
    expiresAt: now + expiresIn * 1000,
  };

  return accessToken;
}

export function clearAccessTokenCache(): void {
  memoryTokenCache = null;
}

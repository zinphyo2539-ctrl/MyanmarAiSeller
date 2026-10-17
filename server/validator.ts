/**
 * Product Image URL Validator (Strict Absolute HTTPS, No Base64, No Credentials)
 * Enforces protocol, hostname, credentials check, and max length.
 */
export function validateProductImageUrl(urlInput: any): { isValid: boolean; sanitizedUrl: string | null; error?: string } {
  if (urlInput === undefined || urlInput === null || urlInput === '') {
    return { isValid: true, sanitizedUrl: null };
  }

  if (typeof urlInput !== 'string') {
    return { isValid: false, sanitizedUrl: null, error: 'Product image URL must be a string' };
  }

  const trimmed = urlInput.trim();
  if (trimmed === '') {
    return { isValid: true, sanitizedUrl: null };
  }

  if (trimmed.length > 1024) {
    return { isValid: false, sanitizedUrl: null, error: 'Product image URL exceeds maximum length of 1,024 characters' };
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('javascript:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) {
    return { isValid: false, sanitizedUrl: null, error: 'Image URL must use the HTTPS protocol. Data URLs, JavaScript, and file schemes are not allowed.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, sanitizedUrl: null, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:') {
    return { isValid: false, sanitizedUrl: null, error: 'Only secure HTTPS image URLs are supported (HTTP, FTP, and other protocols are rejected)' };
  }

  if (!parsed.hostname || parsed.hostname.length === 0 || !parsed.hostname.includes('.')) {
    return { isValid: false, sanitizedUrl: null, error: 'Image URL must contain a valid domain name' };
  }

  if (parsed.username || parsed.password) {
    return { isValid: false, sanitizedUrl: null, error: 'Image URL must not contain embedded credentials' };
  }

  return { isValid: true, sanitizedUrl: parsed.toString() };
}

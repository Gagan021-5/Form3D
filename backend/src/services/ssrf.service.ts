import { validateImageSignature } from '../middleware/upload.js';
import { MAX_UPLOAD_SIZE_BYTES } from '@forma3d/shared';

// Forbidden IP patterns (private, loopback, link-local, carrier-grade NAT, etc.)
const PRIVATE_IP_REGEX = /^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.0\.0\.0|::1|fc00:|fe80:)/i;
const FORBIDDEN_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', '127.0.0.1', '0.0.0.0', '[::1]']);

export class SecurityError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 400) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validate that an image URL is safe to fetch (prevents SSRF).
 */
export function validateSafeImageUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SecurityError('Invalid image URL format.', 'INVALID_URL', 400);
  }

  // Only allow HTTP/HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SecurityError('Only HTTP and HTTPS image URLs are supported.', 'UNSUPPORTED_PROTOCOL', 400);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Disallow localhost or internal hostnames
  if (
    FORBIDDEN_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost') ||
    PRIVATE_IP_REGEX.test(hostname)
  ) {
    throw new SecurityError(
      'Image URL cannot point to internal, private, or loopback network addresses.',
      'SSRF_PROHIBITED',
      403
    );
  }

  return parsed;
}

/**
 * Safely download an image from a validated remote URL with timeouts,
 * size boundaries, and file signature verification.
 */
export async function downloadRemoteImage(rawUrl: string): Promise<{
  buffer: Buffer;
  detectedType: string;
  size: number;
  filename: string;
}> {
  const validatedUrl = validateSafeImageUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(validatedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Forma3D-Product-Importer/1.0',
        Accept: 'image/jpeg,image/png,image/webp,image/*',
      },
    });

    if (!res.ok) {
      throw new SecurityError(
        `Failed to retrieve image from source (HTTP ${res.status}).`,
        'IMAGE_FETCH_FAILED',
        400
      );
    }

    // Check Content-Length if provided
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_SIZE_BYTES) {
      throw new SecurityError(
        'The remote image exceeds the maximum permitted size limit of 10 MB.',
        'FILE_TOO_LARGE',
        400
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
      throw new SecurityError(
        'The remote image exceeds the maximum permitted size limit of 10 MB.',
        'FILE_TOO_LARGE',
        400
      );
    }

    // Verify magic bytes
    const { valid, detectedType } = validateImageSignature(buffer);
    if (!valid || !detectedType) {
      throw new SecurityError(
        'The downloaded file does not contain a valid image signature (JPEG, PNG, or WebP required).',
        'INVALID_IMAGE_SIGNATURE',
        400
      );
    }

    // Derive a clean filename
    const pathname = validatedUrl.pathname;
    const baseName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'shopify-product';
    const ext = detectedType === 'image/jpeg' ? '.jpg' : detectedType === 'image/png' ? '.png' : '.webp';
    const filename = baseName.includes('.') ? baseName : `${baseName}${ext}`;

    return {
      buffer,
      detectedType,
      size: buffer.length,
      filename,
    };
  } catch (err: unknown) {
    if (err instanceof SecurityError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new SecurityError('Image download timed out after 15 seconds.', 'DOWNLOAD_TIMEOUT', 408);
    }
    throw new SecurityError(
      `Could not retrieve product image: ${err instanceof Error ? err.message : 'Unknown error'}`,
      'IMAGE_FETCH_ERROR',
      400
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Validate and sanitize returnUrl to prevent open redirect vulnerabilities.
 * Only allows relative paths or matching Shopify domain origins.
 */
export function validateReturnUrl(returnUrl?: string, shopDomain?: string): string | null {
  if (!returnUrl) return null;

  const trimmed = returnUrl.trim();
  // Safe relative paths (e.g., /products/sneaker)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }

  // Safe absolute URLs matching shop domain or myshopify.com
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    // Allow myshopify.com domains or user's specific shop domain
    if (
      host.endsWith('.myshopify.com') ||
      (shopDomain && host === shopDomain.toLowerCase())
    ) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

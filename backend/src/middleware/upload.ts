import multer from 'multer';
import { config } from '../config/env.js';
import { ALLOWED_IMAGE_MIMES } from '@forma3d/shared';

/**
 * Multer upload middleware configured for image uploads.
 * Stores files in memory for validation before writing to disk.
 */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxSizeBytes,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype as typeof ALLOWED_IMAGE_MIMES[number])) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_IMAGE_MIMES.join(', ')}`
        )
      );
    }
  },
});

/**
 * Validate image file signatures (magic bytes).
 */
export function validateImageSignature(buffer: Buffer): {
  valid: boolean;
  detectedType: string | null;
} {
  if (buffer.length < 4) {
    return { valid: false, detectedType: null };
  }

  // JPEG: starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedType: 'image/jpeg' };
  }

  // PNG: starts with 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, detectedType: 'image/png' };
  }

  // WebP: starts with RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedType: 'image/webp' };
  }

  return { valid: false, detectedType: null };
}

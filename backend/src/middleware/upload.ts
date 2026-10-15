import multer from 'multer';
import { config } from '../config/env.js';
import { ALLOWED_IMAGE_MIMES, MAX_MODEL_UPLOAD_SIZE_BYTES } from '@forma3d/shared';
import path from 'path';

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
 * Multer upload middleware configured for 3D model (.glb) uploads.
 * Stores file in memory for binary signature verification before saving.
 */
export const uploadModel = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxModelSizeBytes || MAX_MODEL_UPLOAD_SIZE_BYTES, // 100 MB default
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.glb') {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid model file type: ${ext || 'unknown'}. Only .glb 3D model files are currently supported.`
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

/**
 * Validate GLB (Binary glTF) magic bytes and header structure.
 * Spec: 12-byte header:
 * - uint32 magic = 0x46546C67 (ASCII 'glTF')
 * - uint32 version = 1 or 2
 * - uint32 length = total binary file length
 */
export function validateGlbSignature(buffer: Buffer): {
  valid: boolean;
  version?: number;
  declaredLength?: number;
} {
  if (buffer.length < 12) {
    return { valid: false };
  }

  // GLB magic: 0x46546C67 -> bytes [0x67, 0x6C, 0x54, 0x46] in little-endian
  const isMagicGlb =
    buffer[0] === 0x67 && // 'g'
    buffer[1] === 0x6c && // 'l'
    buffer[2] === 0x54 && // 'T'
    buffer[3] === 0x46;   // 'F'

  if (!isMagicGlb) {
    return { valid: false };
  }

  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);

  // glTF 2.0 or 1.0
  if (version !== 1 && version !== 2) {
    return { valid: false, version, declaredLength };
  }

  return { valid: true, version, declaredLength };
}


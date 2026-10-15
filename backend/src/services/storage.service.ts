import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { config } from '../config/env.js';

/**
 * Initialize storage directories on startup.
 */
export async function initStorage(): Promise<void> {
  await fsp.mkdir(config.storage.uploadsDir, { recursive: true });
  await fsp.mkdir(config.storage.modelsDir, { recursive: true });
  console.log(`✓ Storage initialized at ${config.storage.dataDir}`);
}

/**
 * Generate a random storage filename while preserving the extension.
 */
function generateFilename(originalExt: string): string {
  return `${uuid()}${originalExt}`;
}

/**
 * Save an uploaded image buffer to the uploads directory.
 * Returns the relative path from the data directory.
 */
export async function saveUploadedImage(
  buffer: Buffer,
  originalName: string
): Promise<{ relativePath: string; absolutePath: string; fileSize: number }> {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const filename = generateFilename(ext);
  const absolutePath = path.join(config.storage.uploadsDir, filename);
  const relativePath = path.join('uploads', filename);

  await fsp.writeFile(absolutePath, buffer);
  const stat = await fsp.stat(absolutePath);

  return { relativePath, absolutePath, fileSize: stat.size };
}

/**
 * Save a downloaded model file to the models directory.
 * Returns the relative path from the data directory.
 */
export async function saveModelFile(
  buffer: Buffer,
  format: string = 'glb'
): Promise<{ relativePath: string; absolutePath: string; fileSize: number }> {
  const filename = generateFilename(`.${format}`);
  const absolutePath = path.join(config.storage.modelsDir, filename);
  const relativePath = path.join('models', filename);

  await fsp.writeFile(absolutePath, buffer);
  const stat = await fsp.stat(absolutePath);

  return { relativePath, absolutePath, fileSize: stat.size };
}

/**
 * Get the absolute path for a relative storage path.
 * Validates the path doesn't escape the data directory.
 */
export function getAbsolutePath(relativePath: string): string {
  const absolutePath = path.resolve(config.storage.dataDir, relativePath);
  const normalizedDataDir = path.resolve(config.storage.dataDir);

  if (!absolutePath.startsWith(normalizedDataDir)) {
    throw new Error('Invalid file path: path traversal detected');
  }

  return absolutePath;
}

/**
 * Check if a file exists in storage.
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const absPath = getAbsolutePath(relativePath);
    await fsp.access(absPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats for a storage file.
 */
export async function getFileStats(
  relativePath: string
): Promise<{ size: number; exists: boolean }> {
  try {
    const absPath = getAbsolutePath(relativePath);
    const stat = await fsp.stat(absPath);
    return { size: stat.size, exists: true };
  } catch {
    return { size: 0, exists: false };
  }
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(relativePath: string): Promise<void> {
  try {
    const absPath = getAbsolutePath(relativePath);
    await fsp.unlink(absPath);
  } catch (err: unknown) {
    // Ignore if file doesn't exist
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
}

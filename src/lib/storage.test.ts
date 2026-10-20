import { describe, it, expect } from 'vitest';
import {
  validateFileBuffer,
  validateProfileImageBuffer,
  isSafeStorageKey,
  MAX_FILE_SIZE,
  MAX_PROFILE_IMAGE_SIZE,
} from './storage';

// Minimal valid file signatures (magic bytes) plus enough trailing bytes for
// file-type to confirm the format.
const jpegBytes = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  Buffer.alloc(4990),
]);
const pngBytes = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(4992),
]);
const webpBytes = Buffer.concat([
  Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20, // VP8
  ]),
  Buffer.alloc(4980),
]);
const pdfBytes = Buffer.concat([
  Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]), // %PDF-1.5
  Buffer.alloc(4992),
]);
const htmlBytes = new TextEncoder().encode('<html><body>hi</body></html>');
const exeBytes = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ

describe('validateFileBuffer', () => {
  it('accepts a JPEG image', async () => {
    const result = await validateFileBuffer(jpegBytes, 'photo.jpg');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('accepts a PNG image', async () => {
    const result = await validateFileBuffer(pngBytes, 'photo.png');
    expect(result.mimeType).toBe('image/png');
  });

  it('accepts a WebP image', async () => {
    const result = await validateFileBuffer(webpBytes, 'photo.webp');
    expect(result.mimeType).toBe('image/webp');
  });

  it('accepts a PDF document', async () => {
    const result = await validateFileBuffer(pdfBytes, 'cv.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('rejects HTML (active content)', async () => {
    await expect(
      validateFileBuffer(Buffer.from(htmlBytes), 'page.html')
    ).rejects.toThrow(/Unsupported file type/);
  });

  it('rejects an executable', async () => {
    await expect(
      validateFileBuffer(Buffer.from(exeBytes), 'program.exe')
    ).rejects.toThrow(/Unsupported file type/);
  });

  it('rejects an empty file', async () => {
    await expect(validateFileBuffer(Buffer.alloc(0), 'empty.pdf')).rejects.toThrow(
      /empty/
    );
  });

  it('rejects an oversized file', async () => {
    const big = Buffer.alloc(MAX_FILE_SIZE + 1);
    await expect(validateFileBuffer(big, 'big.pdf')).rejects.toThrow(
      /too large/
    );
  });

  it('detects JPEG by signature regardless of extension', async () => {
    const result = await validateFileBuffer(jpegBytes, 'photo.txt');
    expect(result.mimeType).toBe('image/jpeg');
  });
});

describe('validateProfileImageBuffer', () => {
  it('accepts an image', async () => {
    const result = await validateProfileImageBuffer(pngBytes, 'winnie.png');
    expect(result.mimeType).toBe('image/png');
  });

  it('refuses a document', async () => {
    await expect(
      validateProfileImageBuffer(pdfBytes, 'cv.pdf')
    ).rejects.toThrow(/must be an image/);
  });

  it('refuses a file over the profile picture limit', async () => {
    const big = Buffer.alloc(MAX_PROFILE_IMAGE_SIZE + 1);
    await expect(validateProfileImageBuffer(big, 'big.png')).rejects.toThrow(
      /too large/
    );
  });
});

describe('isSafeStorageKey', () => {
  it('accepts a generated file name', () => {
    expect(isSafeStorageKey('a44da932d16b.png')).toBe(true);
  });

  it('accepts a file inside a folder', () => {
    expect(isSafeStorageKey('profile/a44da932d16b.png')).toBe(true);
  });

  it('refuses anything that could walk out of the storage directory', () => {
    expect(isSafeStorageKey('../package.json')).toBe(false);
    expect(isSafeStorageKey('profile/../../package.json')).toBe(false);
    expect(isSafeStorageKey('/etc/passwd')).toBe(false);
    expect(isSafeStorageKey('profile\\..\\secret')).toBe(false);
    expect(isSafeStorageKey('profile/a b.png')).toBe(false);
    expect(isSafeStorageKey('')).toBe(false);
  });
});

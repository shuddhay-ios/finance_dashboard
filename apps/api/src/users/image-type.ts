import type { AvatarContentType } from '@finance/shared';

/**
 * Works out an image's real type from its first bytes (its "magic number"). The file name
 * and the Content-Type the browser sends are both chosen by the uploader, so neither can be
 * trusted: a renamed script would claim to be "photo.png" just as easily.
 */
export function detectImageType(bytes: Buffer): AvatarContentType | null {
  // PNG files always start with these 8 bytes.
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  // JPEG files start with FF D8 FF.
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  // WebP files are "RIFF", 4 size bytes, then "WEBP".
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

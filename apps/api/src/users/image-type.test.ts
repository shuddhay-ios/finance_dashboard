import { describe, expect, it } from 'vitest';
import { detectImageType } from './image-type';

describe('detectImageType', () => {
  it('recognises PNG, JPEG and WebP by their first bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);

    expect(detectImageType(png)).toBe('image/png');
    expect(detectImageType(jpeg)).toBe('image/jpeg');
    expect(detectImageType(webp)).toBe('image/webp');
  });

  it('rejects anything else, whatever it is called', () => {
    expect(detectImageType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

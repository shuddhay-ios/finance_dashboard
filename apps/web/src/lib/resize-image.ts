/**
 * Crops an image to a centred square and scales it to `size` × `size` pixels. A phone photo
 * of several megabytes becomes a few kilobytes, so the upload is quick and well under the
 * server's limit. WebP where the browser supports it; the canvas falls back to PNG otherwise.
 */
export async function resizeImage(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('This browser cannot process images');
  }
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the image'))),
      'image/webp',
      0.9,
    );
  });
}

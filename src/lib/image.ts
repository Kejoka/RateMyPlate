const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_MAX_BYTES = 1_200_000;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
  objectUrl?: string;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close()
      };
    } catch {
      // Safari can expose createImageBitmap but still reject SVG/HEIC files.
      // Fall through to the Image element decoder below.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('The image could not be decoded.'));
    image.src = objectUrl;
  });
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    objectUrl
  };
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The image could not be converted.'));
    }, 'image/jpeg', quality);
  });
}

/** Produces a small, browser-compatible JPEG for fast Appwrite uploads. */
export async function compressImageToJpeg(
  file: File,
  options: { maxDimension?: number; maxBytes?: number } = {}
) {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const decoded = await decodeImage(file);

  try {
    const scale = Math.min(1, maxDimension / Math.max(decoded.width, decoded.height));
    let width = Math.max(1, Math.round(decoded.width * scale));
    let height = Math.max(1, Math.round(decoded.height * scale));
    let quality = 0.82;
    const canvas = document.createElement('canvas');
    let blob: Blob;

    const render = async (renderQuality: number) => {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The image could not be prepared for upload.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(decoded.source, 0, 0, width, height);
      return canvasBlob(canvas, renderQuality);
    };

    blob = await render(quality);
    while (blob.size > maxBytes && quality > 0.52) {
      quality = Math.max(0.52, quality - 0.08);
      blob = await render(quality);
    }

    while (blob.size > maxBytes && Math.max(width, height) > 960) {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
      blob = await render(0.68);
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'meal-photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } finally {
    decoded.close?.();
    if (decoded.objectUrl) URL.revokeObjectURL(decoded.objectUrl);
  }
}

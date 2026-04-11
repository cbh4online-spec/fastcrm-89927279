/**
 * Resize an image (base64 string or File) so that neither dimension exceeds
 * `maxDimension` pixels. Returns a base64 data-URL (JPEG).
 *
 * Works entirely in the browser via Canvas.
 */
export async function resizeImageForAI(
  base64OrFile: string | File | Blob,
  maxDimension = 1568,
): Promise<string> {
  const src = base64OrFile instanceof Blob
    ? await blobToDataUrl(base64OrFile)
    : base64OrFile;

  const img = await loadImage(src);

  const { width, height } = img;
  if (width <= maxDimension && height <= maxDimension) {
    // Already within limits – return as-is
    return src;
  }

  const scale = Math.min(maxDimension / width, maxDimension / height);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(img, 0, 0, newW, newH);

  return canvas.toDataURL("image/jpeg", 0.85);
}

/* ── helpers ─────────────────────────────────────────────── */

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

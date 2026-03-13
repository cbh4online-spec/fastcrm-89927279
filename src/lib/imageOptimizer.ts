/**
 * Client-side image compression using Canvas API.
 * Generates thumbnail and medium variants before upload.
 */

interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format?: "image/jpeg" | "image/webp";
}

const PRESETS = {
  thumb: { maxWidth: 400, maxHeight: 300, quality: 0.7, format: "image/jpeg" as const },
  medium: { maxWidth: 800, maxHeight: 600, quality: 0.8, format: "image/jpeg" as const },
} as const;

export type ImageVariant = "thumb" | "medium";

export async function compressImage(file: File, options: CompressOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > options.maxWidth || height > options.maxHeight) {
        const ratio = Math.min(options.maxWidth / width, options.maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Failed to compress")),
        options.format || "image/jpeg",
        options.quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export async function generateVariants(file: File): Promise<Record<ImageVariant, Blob>> {
  const [thumb, medium] = await Promise.all([
    compressImage(file, PRESETS.thumb),
    compressImage(file, PRESETS.medium),
  ]);
  return { thumb, medium };
}

export function getThumbnailUrl(originalUrl: string): string {
  if (!originalUrl || originalUrl.startsWith("data:")) return originalUrl;
  const lastDot = originalUrl.lastIndexOf(".");
  if (lastDot === -1) return originalUrl;
  return `${originalUrl.substring(0, lastDot)}_thumb${originalUrl.substring(lastDot)}`;
}

export function getMediumUrl(originalUrl: string): string {
  if (!originalUrl || originalUrl.startsWith("data:")) return originalUrl;
  const lastDot = originalUrl.lastIndexOf(".");
  if (lastDot === -1) return originalUrl;
  return `${originalUrl.substring(0, lastDot)}_med${originalUrl.substring(lastDot)}`;
}

export { PRESETS };

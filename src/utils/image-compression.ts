/**
 * Browser-side image compression wrapper with project defaults.
 */
import imageCompression from "browser-image-compression";

const DEFAULTS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
} satisfies Parameters<typeof imageCompression>[1];

export async function compressImageFile(
  file: File,
  options?: Partial<Parameters<typeof imageCompression>[1]>,
): Promise<File> {
  return imageCompression(file, { ...DEFAULTS, ...options });
}

export async function compressToThumbnail(file: File): Promise<File> {
  return imageCompression(file, {
    ...DEFAULTS,
    maxSizeMB: 0.1,
    maxWidthOrHeight: 400,
  });
}

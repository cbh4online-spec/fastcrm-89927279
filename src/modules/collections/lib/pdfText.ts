/**
 * Extracts plain text from a PDF File using pdfjs-dist (already shipped via react-pdf).
 * Returns a single string with line breaks between text items to feed the ARTSOFT parser.
 */
// @ts-expect-error - pdfjs-dist legacy build ships with its own types
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// @ts-expect-error - worker entry
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractPdfText(file: File | Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Group items by approximate Y position to reconstruct lines.
    const lines = new Map<number, { x: number; str: string }[]>();
    for (const it of content.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x, str: it.str });
    }
    const sortedY = [...lines.keys()].sort((a, b) => b - a);
    for (const y of sortedY) {
      const row = lines.get(y)!.sort((a, b) => a.x - b.x);
      // Use whitespace gaps proportional to x distance to mimic pdftotext -layout
      let line = "";
      let lastX = 0;
      for (const seg of row) {
        const gap = Math.max(0, Math.round((seg.x - lastX) / 4));
        if (line.length > 0 && gap > 0) line += " ".repeat(Math.min(gap, 12));
        line += seg.str;
        lastX = seg.x + seg.str.length * 5;
      }
      parts.push(line);
    }
    parts.push("");
  }
  return parts.join("\n");
}

export async function hashFile(file: File | Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

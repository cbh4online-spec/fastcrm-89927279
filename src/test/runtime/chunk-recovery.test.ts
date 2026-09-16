import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "@/lib/chunkRecovery";

describe("chunk recovery classification", () => {
  it.each([
    "Failed to fetch dynamically imported module: /assets/page-old.js",
    "Importing a module script failed.",
    "error loading dynamically imported module",
    "ChunkLoadError: Loading chunk 42 failed",
  ])("recognises recoverable module errors", (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it("does not hide ordinary application errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
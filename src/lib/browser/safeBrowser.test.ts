import { describe, it, expect, vi, afterEach } from "vitest";
import { safeRandomId } from "./safeBrowser";

describe("safeRandomId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gera um UUID quando crypto.randomUUID não existe (iOS antigo)", () => {
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => a.fill(7) });
    expect(safeRandomId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("não falha sem crypto nenhum", () => {
    vi.stubGlobal("crypto", undefined);
    expect(safeRandomId()).toHaveLength(36);
  });
});

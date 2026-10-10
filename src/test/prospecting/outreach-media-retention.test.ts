import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  randomId, SECURE_RANDOM_UNAVAILABLE_MESSAGE, needsVideoLinkRenewal, isVideoLinkExpired, sentMediaUrlFor,
} from "@/lib/prospecting/outreachMedia";

const DAY = 86_400_000;

describe("randomId", () => {
  it("usa crypto forte e falha claramente sem ele (sem Math.random)", () => {
    expect(randomId({ randomUUID: () => "u" } as unknown as Crypto)).toBe("u");
    const viaBytes = randomId({ getRandomValues: (b: Uint8Array) => b.fill(255) } as unknown as Crypto);
    expect(viaBytes).toBe("f".repeat(32));
    expect(() => randomId({} as Crypto)).toThrow(SECURE_RANDOM_UNAVAILABLE_MESSAGE);
    expect(readFileSync("src/lib/prospecting/outreachMedia.ts", "utf8")).not.toMatch(/Math\.random/);
  });
});

describe("validade das ligações de vídeo", () => {
  const now = Date.now();
  it("renova perto do fim, expirado ou sem data; links normais nunca", () => {
    expect(needsVideoLinkRenewal({ kind: "video", url_expires_at: new Date(now + 30 * DAY).toISOString() }, now)).toBe(false);
    expect(needsVideoLinkRenewal({ kind: "video", url_expires_at: new Date(now + 3_600_000).toISOString() }, now)).toBe(true);
    expect(needsVideoLinkRenewal({ kind: "video", url_expires_at: null }, now)).toBe(true);
    expect(isVideoLinkExpired({ kind: "video", url_expires_at: new Date(now - 1).toISOString() }, now)).toBe(true);
    expect(needsVideoLinkRenewal({ kind: "url", url_expires_at: null }, now)).toBe(false);
  });
  it("sent_media_url só quando o texto real contém o URL", () => {
    expect(sentMediaUrlFor("olá https://a.pt/v", "https://a.pt/v")).toBe("https://a.pt/v");
    expect(sentMediaUrlFor("olá", "https://a.pt/v")).toBeNull();
  });
});

describe("retenção de ficheiros partilhados", () => {
  it("o hook nunca apaga automaticamente MP4 do Storage após substituir/remover", () => {
    const src = readFileSync("src/hooks/useOutreachMedia.ts", "utf8");
    expect(src).not.toMatch(/cleanupPaths\(/);
    // A única remoção é do ficheiro acabado de carregar que nunca chegou a ser partilhado.
    expect(src.match(/\.remove\(\[path\]\)/g)?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

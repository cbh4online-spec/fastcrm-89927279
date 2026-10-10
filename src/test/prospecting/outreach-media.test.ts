import { describe, expect, it } from "vitest";
import {
  buildVideoPath, composeMessageWithLink, describeShareUrl, validateShareUrl, validateVideoFile, PROSPECTING_VIDEO_MAX_BYTES,
} from "@/lib/prospecting/outreachMedia";

const reel = "https://www.instagram.com/reel/Cx1abc/";

describe("composeMessageWithLink", () => {
  it("acrescenta a ligação uma vez", () => {
    const out = composeMessageWithLink("Olá Ana, veja isto", reel);
    expect(out.split(reel)).toHaveLength(2);
    expect(out.endsWith(reel)).toBe(true);
  });
  it("não duplica se a mensagem já contém a ligação (mesmo repetida)", () => {
    const out = composeMessageWithLink(`Veja ${reel}\n\nOutra vez ${reel}`, reel);
    expect(out.split(reel)).toHaveLength(2);
    expect(composeMessageWithLink(composeMessageWithLink("Olá", reel), reel).split(reel)).toHaveLength(2);
  });
  it("sem ligação devolve só a mensagem", () => {
    expect(composeMessageWithLink("  Olá  ", null)).toBe("Olá");
  });
});

describe("validateShareUrl", () => {
  it.each(["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "http://instagram.com/x", "https://user:pw@x.pt/", "https://local", "ftp://x.pt", "https://x.pt/a b", ""])(
    "rejeita %s",
    (v) => expect(validateShareUrl(v).ok).toBe(false),
  );
  it("aceita Reel e página de vídeo https", () => {
    expect(validateShareUrl(reel)).toEqual({ ok: true, url: reel });
    expect(validateShareUrl(" https://vimeo.com/123 ").ok).toBe(true);
  });
  it("pré-visualização textual identifica Reel como conteúdo", () => {
    expect(describeShareUrl(reel)).toBe("Reel do Instagram (Cx1abc)");
    expect(describeShareUrl("https://www.instagram.com/joana/")).toBe("Perfil Instagram @joana");
  });
});

describe("validateVideoFile / buildVideoPath", () => {
  it("só MP4 até 16 MiB", () => {
    expect(validateVideoFile({ name: "a.mp4", type: "video/mp4", size: 1000 }).ok).toBe(true);
    expect(validateVideoFile({ name: "a.mov", type: "video/quicktime", size: 1000 }).ok).toBe(false);
    expect(validateVideoFile({ name: "a.mp4", type: "text/html", size: 1000 }).ok).toBe(false);
    expect(validateVideoFile({ name: "a.mp4", type: "video/mp4", size: PROSPECTING_VIDEO_MAX_BYTES + 1 }).ok).toBe(false);
  });
  it("caminho workspace/utilizador com nome aleatório", () => {
    const p = buildVideoPath("ws-1", "u-1");
    expect(p).toMatch(/^ws-1\/u-1\/[0-9a-f-]{32,36}\.mp4$/);
    expect(buildVideoPath("ws-1", "u-1")).not.toBe(p);
  });
});

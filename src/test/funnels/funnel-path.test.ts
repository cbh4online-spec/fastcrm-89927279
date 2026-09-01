import { describe, expect, it } from "vitest";
import { normalizeFunnelPublicPath } from "../../utils/funnelPath";

describe("normalizeFunnelPublicPath", () => {
  it("keeps an existing public funnel path", () => {
    expect(normalizeFunnelPublicPath("/demo-mymia")).toEqual({
      slug: "demo-mymia",
      path: "/demo-mymia",
    });
  });

  it("normalizes text into the public slug", () => {
    expect(normalizeFunnelPublicPath(" Demo MÍMIA ")).toEqual({
      slug: "demo-mimia",
      path: "/demo-mimia",
    });
  });

  it("rejects nested paths because the public route accepts one slug", () => {
    expect(normalizeFunnelPublicPath("/demo/mymia")).toBeNull();
  });

  it("rejects empty and too-short paths", () => {
    expect(normalizeFunnelPublicPath("")).toBeNull();
    expect(normalizeFunnelPublicPath("/ab")).toBeNull();
  });
});

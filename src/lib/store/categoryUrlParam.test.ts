import { describe, it, expect } from "vitest";
import { readCategoryParam, withCategoryParam } from "./categoryUrlParam";

describe("categoryUrlParam", () => {
  it("lê categoria raiz ou filho do URL", () => {
    expect(readCategoryParam(new URLSearchParams("category=3363db48-ce02-485c-8d84-662ab0915cd6"))).toBe(
      "3363db48-ce02-485c-8d84-662ab0915cd6",
    );
    expect(readCategoryParam(new URLSearchParams("q=hub"))).toBeUndefined();
    expect(readCategoryParam(new URLSearchParams("category="))).toBeUndefined();
  });
  it("define categoria preservando q e outros parâmetros", () => {
    const n = withCategoryParam(new URLSearchParams("q=hub&utm=x"), "abc");
    expect(n.get("q")).toBe("hub");
    expect(n.get("utm")).toBe("x");
    expect(n.get("category")).toBe("abc");
  });
  it("limpar remove só a categoria", () => {
    const n = withCategoryParam(new URLSearchParams("q=hub&category=abc"), undefined);
    expect(n.toString()).toBe("q=hub");
  });
});

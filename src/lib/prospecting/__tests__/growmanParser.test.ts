import { describe, expect, it } from "vitest";
import { mapGrowmanRows, normalizeInstagramUsername, parseCsvText } from "../growmanParser";

describe("growmanParser", () => {
  it("lê CSV com BOM e «;», mapeia email/telefone e ignora inválidos e repetidos", () => {
    const csv = '\uFEFFUsername;Full Name;Public Email;Phone Number;Followers\n@Joao.Silva;"João; Silva";JOAO@X.PT;+351 912 345 678;1.234\nreel;X;;;\njoao.silva;Dup;;;\nhttps://evilinstagram.com/ana;A;;;\n';
    const r = mapGrowmanRows(parseCsvText(csv));
    expect(r.profiles).toHaveLength(1);
    expect(r.profiles[0]).toMatchObject({
      username: "joao.silva",
      profileUrl: "https://www.instagram.com/joao.silva/",
      fullName: "João; Silva",
      email: "joao@x.pt",
      phone: "+351912345678",
      followers: 1234,
    });
    expect(r.invalidRows).toBe(2);
    expect(r.duplicateRows).toBe(1);
  });

  it("aceita só URLs de perfil Instagram reais", () => {
    expect(normalizeInstagramUsername("https://www.instagram.com/ana_m/")).toBe("ana_m");
    expect(normalizeInstagramUsername("https://instagram.com/p/ABC")).toBeNull();
    expect(normalizeInstagramUsername("javascript:alert(1)")).toBeNull();
    expect(normalizeInstagramUsername("http://instagram.com/ana")).toBeNull();
  });
});

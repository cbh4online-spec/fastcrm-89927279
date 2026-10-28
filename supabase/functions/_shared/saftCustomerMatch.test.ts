import { assertEquals } from "jsr:@std/assert@1";
import { buildMatchIndex, matchCustomer, normalizeNif } from "./saftCustomerMatch.ts";

Deno.test("NIF ignora espaços e prefixo do país", () => {
  assertEquals(normalizeNif("LU 34823971"), "34823971");
  assertEquals(normalizeNif("LU34823971"), "34823971");
  assertEquals(normalizeNif("PT 508.871.352"), "508871352");
  assertEquals(normalizeNif("999999990"), "");
});

const rows = [
  { id: "trico", name: "Trico Spa Cabo Verde, Sociedade Unipessoal Lda", tax_id: null, email: "adelciagarcia@hotmail.com" },
  { id: "adelcia", name: "Adelcia Maria Monteiro Garcia", tax_id: "LU 34823971", email: "adelciagarcia@hotmail.com" },
];
const idx = buildMatchIndex(rows);

Deno.test("NIF com formato diferente encontra a ficha certa", () => {
  assertEquals(matchCustomer(idx, { tax_id: "LU34823971", name: "Adelcia Maria Monteiro Garcia", email: "adelciagarcia@hotmail.com" }), "adelcia");
});

Deno.test("email partilhado desempata pelo nome", () => {
  assertEquals(matchCustomer(idx, { tax_id: null, name: "Trico Spa Cabo Verde, Sociedade Unipessoal Lda", email: "adelciagarcia@hotmail.com" }), "trico");
});

Deno.test("email partilhado sem nome igual não associa", () => {
  assertEquals(matchCustomer(idx, { tax_id: null, name: "Outra Pessoa", email: "adelciagarcia@hotmail.com" }), null);
});

Deno.test("nome igual antes de email", () => {
  assertEquals(matchCustomer(idx, { name: "adelcia maria monteiro garcia", email: "x@y.pt" }), "adelcia");
});

Deno.test("NIF/email partilhado entre pessoa e empresa: nome do documento decide", () => {
  const idx = buildMatchIndex([
    { id: "pessoa", name: "Adelcia Maria Monteiro Garcia", tax_id: "LU 34823971", email: "a@h.com" },
    { id: "empresa", name: "Trico Spa Cabo Verde, Sociedade Unipessoal Lda", tax_id: null, email: "a@h.com" },
  ]);
  if (matchCustomer(idx, { tax_id: "LU34823971", name: "Trico Spa Cabo Verde, Sociedade Unipessoal Lda", email: "a@h.com" }) !== "empresa") throw new Error("empresa");
  if (matchCustomer(idx, { tax_id: "LU34823971", name: "Adelcia Maria Monteiro Garcia", email: "a@h.com" }) !== "pessoa") throw new Error("pessoa");
});

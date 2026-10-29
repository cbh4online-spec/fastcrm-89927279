import { describe, it, expect } from "vitest";
import { clientHref, clientInvoicesHref } from "../clientHref";
describe("clientHref", () => {
  it("empresa primeiro", () => expect(clientHref({ companyId: "c1", contactId: "k1", name: "X" })).toBe("/dashboard/companies/c1"));
  it("contacto sem empresa", () => expect(clientHref({ contactId: "k1", name: "X" })).toBe("/dashboard/contacts/k1"));
  it("sem ficha → faturas pelo nome", () => expect(clientHref({ name: "Luísa Peña" })).toBe("/dashboard/invoices?q=Lu%C3%ADsa+Pe%C3%B1a"));
  it("vencidas do cliente", () => expect(clientInvoicesHref("Ana", "overdue")).toBe("/dashboard/invoices?q=Ana&due=overdue"));
});

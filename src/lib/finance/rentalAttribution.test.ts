import { describe, it, expect } from "vitest";
import { aggregateClientsWithRental } from "./rentalAttribution";

const rentals = {
  rc1: { end_client_id: "franci", end_client_name: "Franci Abreu Lobo", financier_id: "liq", financier_name: "Liqui.do S.A" },
};

describe("renting attribution", () => {
  const invoices = [
    { id: "1", status: "paid", document_type: "invoice", client_name: "Liqui.do S.A", company_id: "liq", total: 2126.67, rental_contract_id: "rc1" },
    { id: "2", status: "draft", document_type: "proforma", client_name: "Franci Abreu Lobo", company_id: "franci", total: 2126.67, rental_contract_id: "rc1" },
  ];

  it("counts the renting once, attributed to the end client", () => {
    const r = aggregateClientsWithRental(invoices, rentals);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("Franci Abreu Lobo");
    expect(r[0].total).toBeCloseTo(2126.67);
    expect(r[0].viaFinanciers).toEqual(["Liqui.do S.A"]);
  });

  it("ignores proformas even when sent", () => {
    const r = aggregateClientsWithRental(
      [{ id: "3", status: "sent", document_type: "proforma", client_name: "X", company_id: "x", total: 100 }],
      {},
    );
    expect(r).toHaveLength(0);
  });
});

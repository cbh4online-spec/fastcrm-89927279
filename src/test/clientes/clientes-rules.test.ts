import { describe, it, expect } from "vitest";
import { calendarDaysFromToday, relativeDayLabel } from "@/lib/dates/lisbonDays";
import { computeCoverage } from "@/lib/crm/coverage";
import { resolveWhatsAppAvailability } from "@/lib/whatsapp/availability";
import { computeLeadPageKpis } from "@/lib/crm/leadKpis";
import { plural, displayLabel } from "@/lib/crm/displayLabels";

describe("dias de calendário Europe/Lisbon", () => {
  it("amanhã mesmo que faltem menos de 24h", () => {
    // 23:30 em Lisboa (verão, UTC+1) de 6/10 → renovação 7/10
    expect(calendarDaysFromToday("2026-10-07", new Date("2026-10-06T22:30:00Z"))).toBe(1);
  });
  it("hoje é 0 e ontem é 1 dia de atraso", () => {
    const now = new Date("2026-10-06T08:00:00Z");
    expect(calendarDaysFromToday("2026-10-06", now)).toBe(0);
    expect(relativeDayLabel(calendarDaysFromToday("2026-10-05", now))).toBe("1 dia de atraso");
  });
  it("usa o dia de Lisboa e não o de UTC à meia-noite", () => {
    // 00:30 de 7/10 em Lisboa = 23:30Z de 6/10
    expect(calendarDaysFromToday("2026-10-07", new Date("2026-10-06T23:30:00Z"))).toBe(0);
  });
  it("rótulos", () => {
    expect(relativeDayLabel(0)).toBe("Hoje");
    expect(relativeDayLabel(1)).toBe("Amanhã");
    expect(relativeDayLabel(-3)).toBe("3 dias de atraso");
    expect(relativeDayLabel(5)).toBe("em 5 dias");
  });
});

describe("cobertura de gestores", () => {
  it("9403 leads + 27 contactos com 13 atribuídos não dá 100%", () => {
    const c = computeCoverage({ total: 9430, unassigned: 9417, assignedToMembers: 13 });
    expect(c.coveragePct).toBe(0);
    expect(c.assignedToOthers).toBe(0);
  });
  it("atribuídos fora da equipa contam à parte", () => {
    expect(computeCoverage({ total: 100, unassigned: 40, assignedToMembers: 50 }).assignedToOthers).toBe(10);
  });
});

describe("disponibilidade WhatsApp", () => {
  it("has_whatsapp falso com número válido = não confirmado (não indisponível)", () => {
    const r = resolveWhatsAppAvailability({ phone: "912345678", hasWhatsapp: false });
    expect(r.status).toBe("unconfirmed");
    expect(r.number).toBe("351912345678");
  });
  it("bloqueado impede abrir", () => {
    expect(resolveWhatsAppAvailability({ phone: "912345678", hasWhatsapp: true, isBlocked: true }).canOpen).toBe(false);
  });
  it("sem número válido impede abrir", () => {
    expect(resolveWhatsAppAvailability({ phone: "12", hasWhatsapp: true }).status).toBe("invalid_number");
  });
  it("prefere o número de WhatsApp ao telefone", () => {
    expect(resolveWhatsAppAvailability({ phone: "912345678", whatsappNumber: "+34600111222", hasWhatsapp: true }).number).toBe("34600111222");
  });
});

describe("KPIs de leads e textos", () => {
  it("calcula sobre as linhas dadas", () => {
    const now = Date.parse("2026-10-06T00:00:00Z");
    const k = computeLeadPageKpis([
      { ai_temperature: "HOT", estimated_value: "100", lead_score: 80, last_contact_at: "2026-10-05T00:00:00Z" },
      { estimated_value: 50, lead_score: 40 },
    ], now);
    expect(k).toEqual({ hot: 1, pipeline: 150, stale: 1, avg: 60 });
  });
  it("singular/plural e valores internos", () => {
    expect(plural(1, "contacto", "contactos")).toBe("1 contacto");
    expect(plural(27, "contacto", "contactos")).toBe("27 contactos");
    expect(displayLabel("consumidor_final")).toBe("Consumidor final");
    expect(displayLabel("owner")).toBe("Proprietário");
  });
});

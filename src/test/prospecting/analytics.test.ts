import { describe, expect, it } from "vitest";
import { summarizeProspectingActivity, type SearchActivity } from "@/lib/prospecting/analytics";

const now = new Date("2026-10-09T15:00:00Z");
const search = (id: string, source: SearchActivity["source"], created_at: string): SearchActivity => ({
  id, source, created_at, title: id, location: null, results_count: 12,
});

describe("métricas de prospeção", () => {
  it("conta fontes e importações pela data real de criação do lead", () => {
    const result = summarizeProspectingActivity(
      [
        search("google", "google_local", "2026-10-02T10:00:00Z"),
        search("professional", "professional", "2026-10-03T10:00:00Z"),
        search("instagram", "instagram_extraction", "2026-10-04T10:00:00Z"),
        search("old", "web_search", "2026-09-10T10:00:00Z"),
      ],
      [
        { created_at: "2026-10-08T11:00:00Z" },
        { created_at: "2026-09-11T11:00:00Z" },
      ],
      [{ created_at: "2026-10-05T11:00:00Z", credits_amount: -4 }],
      now,
    );

    expect(result.totalSearches).toBe(3);
    expect(result.lastMonthSearches).toBe(1);
    expect(result.importedLeads).toBe(1);
    expect(result.lastMonthLeads).toBe(1);
    expect(result.creditsSpent).toBe(4);
    expect(result.counts.instagram_extraction).toBe(1);
    expect(result.weekly.reduce((sum, week) => sum + week.imported, 0)).toBe(2);
  });

  it("não estima créditos nem importações a partir de pesquisas", () => {
    const result = summarizeProspectingActivity(
      [search("google", "google_local", "2026-10-02T10:00:00Z")],
      [],
      [],
      now,
    );
    expect(result.importedLeads).toBe(0);
    expect(result.creditsSpent).toBe(0);
  });
});

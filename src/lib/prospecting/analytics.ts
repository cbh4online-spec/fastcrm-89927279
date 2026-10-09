export type ProspectingSource = "google_local" | "web_search" | "professional" | "instagram_extraction";

export interface SearchActivity {
  id: string;
  source: ProspectingSource;
  title: string;
  location: string | null;
  results_count: number;
  created_at: string;
}

export interface LeadActivity {
  created_at: string;
}

export interface CreditActivity {
  created_at: string;
  credits_amount: number;
}

export const SOURCE_LABELS: Record<ProspectingSource, string> = {
  google_local: "Google Local",
  web_search: "Web Search",
  professional: "Profissionais",
  instagram_extraction: "Instagram",
};

function utcMonthStart(date: Date, offset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function utcWeekStart(date: Date, weeksBefore = 0): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - weeksBefore * 7);
  return start;
}

export function activitySince(now: Date): string {
  return new Date(Math.min(
    utcMonthStart(now, -1).getTime(),
    utcWeekStart(now, 7).getTime(),
  )).toISOString();
}

export function summarizeProspectingActivity(
  searches: SearchActivity[],
  leads: LeadActivity[],
  credits: CreditActivity[],
  now = new Date(),
) {
  const monthStart = utcMonthStart(now).getTime();
  const lastMonthStart = utcMonthStart(now, -1).getTime();
  const date = (value: string) => new Date(value).getTime();
  const thisMonthSearches = searches.filter((row) => date(row.created_at) >= monthStart);
  const lastMonthSearches = searches.filter((row) => date(row.created_at) >= lastMonthStart && date(row.created_at) < monthStart);
  const thisMonthLeads = leads.filter((row) => date(row.created_at) >= monthStart);
  const lastMonthLeads = leads.filter((row) => date(row.created_at) >= lastMonthStart && date(row.created_at) < monthStart);
  const creditsSpent = credits
    .filter((row) => date(row.created_at) >= monthStart)
    .reduce((total, row) => total + Math.abs(row.credits_amount), 0);

  const counts: Record<ProspectingSource, number> = {
    google_local: 0,
    web_search: 0,
    professional: 0,
    instagram_extraction: 0,
  };
  for (const row of thisMonthSearches) counts[row.source]++;

  const firstWeek = utcWeekStart(now, 7);
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(firstWeek.getTime() + index * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inWeek = (value: string) => date(value) >= start.getTime() && date(value) < end.getTime();
    const weekSearches = searches.filter((row) => inWeek(row.created_at));
    return {
      start,
      google: weekSearches.filter((row) => row.source === "google_local").length,
      web: weekSearches.filter((row) => row.source === "web_search").length,
      professional: weekSearches.filter((row) => row.source === "professional").length,
      instagram: weekSearches.filter((row) => row.source === "instagram_extraction").length,
      imported: leads.filter((row) => inWeek(row.created_at)).length,
    };
  });

  return {
    thisMonthSearches: [...thisMonthSearches].sort((a, b) => date(b.created_at) - date(a.created_at)),
    totalSearches: thisMonthSearches.length,
    lastMonthSearches: lastMonthSearches.length,
    totalResults: thisMonthSearches.reduce((total, row) => total + (row.results_count || 0), 0),
    importedLeads: thisMonthLeads.length,
    lastMonthLeads: lastMonthLeads.length,
    creditsSpent,
    counts,
    weekly,
  };
}

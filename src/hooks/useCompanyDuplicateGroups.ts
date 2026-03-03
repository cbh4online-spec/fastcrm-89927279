import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Company } from "./useCompanies";

export interface CompanyDuplicateGroup {
  id: string;
  matchType: "domain" | "tax_id" | "email_domain" | "name_similarity";
  matchValue: string;
  companies: CompanyWithRelations[];
  similarity: number;
}

export interface CompanyWithRelations extends Company {
  relatedCounts: {
    contacts: number;
    opportunities: number;
    invoices: number;
    proposals: number;
  };
}

function normalizeString(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function extractDomain(input: string): string | null {
  const emailMatch = input.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) return emailMatch[1].toLowerCase();
  try {
    let url = input.trim();
    if (!url.startsWith("http")) url = `https://${url}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch { return null; }
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  if (s1 === s2) return 1;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) { costs[j] = j; }
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  return (longer.length - costs[longer.length]) / longer.length;
}

async function fetchCompanyRelations(ids: string[]): Promise<Map<string, CompanyWithRelations["relatedCounts"]>> {
  const counts = new Map<string, CompanyWithRelations["relatedCounts"]>();
  ids.forEach(id => counts.set(id, { contacts: 0, opportunities: 0, invoices: 0, proposals: 0 }));

  const [contacts, opportunities, invoices, proposals] = await Promise.all([
    supabase.from("contacts").select("company_id").in("company_id", ids),
    supabase.from("opportunities").select("company_id").in("company_id", ids),
    supabase.from("invoices").select("company_id").in("company_id", ids),
    supabase.from("proposals").select("company_id").in("company_id", ids),
  ]);

  contacts.data?.forEach(r => { const c = counts.get(r.company_id); if (c) c.contacts++; });
  opportunities.data?.forEach(r => { const c = counts.get(r.company_id); if (c) c.opportunities++; });
  invoices.data?.forEach(r => { const c = counts.get(r.company_id); if (c) c.invoices++; });
  proposals.data?.forEach(r => { const c = counts.get(r.company_id); if (c) c.proposals++; });

  return counts;
}

export function useCompanyDuplicateGroups() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["company-duplicate-groups", currentWorkspace?.id],
    queryFn: async (): Promise<CompanyDuplicateGroup[]> => {
      if (!currentWorkspace) return [];

      const { data: companies, error } = await supabase
        .from("companies")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!companies || companies.length === 0) return [];

      const groups: Map<string, { matchType: CompanyDuplicateGroup["matchType"]; matchValue: string; companies: Company[]; similarity: number }> = new Map();
      const processedPairs = new Set<string>();

      // Group by website domain
      const domainMap = new Map<string, Company[]>();
      companies.forEach(c => {
        const domain = c.website ? extractDomain(c.website) : null;
        if (domain) {
          const existing = domainMap.get(domain) || [];
          existing.push(c as Company);
          domainMap.set(domain, existing);
        }
      });
      domainMap.forEach((list, domain) => {
        if (list.length > 1) {
          groups.set(`domain_${domain}`, { matchType: "domain", matchValue: domain, companies: list, similarity: 1 });
          list.forEach(c1 => list.forEach(c2 => { if (c1.id !== c2.id) processedPairs.add([c1.id, c2.id].sort().join("_")); }));
        }
      });

      // Group by tax_id (NIF)
      const taxIdMap = new Map<string, Company[]>();
      companies.forEach(c => {
        if (c.tax_id) {
          const normalized = c.tax_id.replace(/\s/g, "");
          const existing = taxIdMap.get(normalized) || [];
          existing.push(c as Company);
          taxIdMap.set(normalized, existing);
        }
      });
      taxIdMap.forEach((list, taxId) => {
        if (list.length > 1) {
          const ungrouped = list.filter(c1 => list.some(c2 => c1.id !== c2.id && !processedPairs.has([c1.id, c2.id].sort().join("_"))));
          if (ungrouped.length > 1) {
            groups.set(`taxid_${taxId}`, { matchType: "tax_id", matchValue: taxId, companies: ungrouped, similarity: 1 });
            ungrouped.forEach(c1 => ungrouped.forEach(c2 => { if (c1.id !== c2.id) processedPairs.add([c1.id, c2.id].sort().join("_")); }));
          }
        }
      });

      // Group by email domain
      const emailDomainMap = new Map<string, Company[]>();
      companies.forEach(c => {
        if (c.email) {
          const domain = extractDomain(c.email);
          if (domain && !["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "sapo.pt", "mail.com"].includes(domain)) {
            const existing = emailDomainMap.get(domain) || [];
            existing.push(c as Company);
            emailDomainMap.set(domain, existing);
          }
        }
      });
      emailDomainMap.forEach((list, domain) => {
        if (list.length > 1) {
          const ungrouped = list.filter(c1 => list.some(c2 => c1.id !== c2.id && !processedPairs.has([c1.id, c2.id].sort().join("_"))));
          if (ungrouped.length > 1) {
            groups.set(`emaildomain_${domain}`, { matchType: "email_domain", matchValue: domain, companies: ungrouped, similarity: 0.95 });
            ungrouped.forEach(c1 => ungrouped.forEach(c2 => { if (c1.id !== c2.id) processedPairs.add([c1.id, c2.id].sort().join("_")); }));
          }
        }
      });

      // Group by similar name (≥80%)
      for (let i = 0; i < companies.length; i++) {
        for (let j = i + 1; j < companies.length; j++) {
          const c1 = companies[i], c2 = companies[j];
          const pairKey = [c1.id, c2.id].sort().join("_");
          if (processedPairs.has(pairKey)) continue;
          if (c1.name && c2.name) {
            const similarity = calculateSimilarity(c1.name, c2.name);
            if (similarity >= 0.80) {
              const existing = Array.from(groups.values()).find(g => g.matchType === "name_similarity" && g.companies.some(c => c.id === c1.id || c.id === c2.id));
              if (existing) {
                if (!existing.companies.find(c => c.id === c1.id)) existing.companies.push(c1 as Company);
                if (!existing.companies.find(c => c.id === c2.id)) existing.companies.push(c2 as Company);
              } else {
                groups.set(`name_${c1.id}_${c2.id}`, { matchType: "name_similarity", matchValue: c1.name, companies: [c1 as Company, c2 as Company], similarity });
              }
              processedPairs.add(pairKey);
            }
          }
        }
      }

      const allIds = Array.from(new Set(Array.from(groups.values()).flatMap(g => g.companies.map(c => c.id))));
      const relationCounts = await fetchCompanyRelations(allIds);

      let idx = 0;
      const result: CompanyDuplicateGroup[] = [];
      groups.forEach(group => {
        const withRelations: CompanyWithRelations[] = group.companies.map(c => ({
          ...c,
          relatedCounts: relationCounts.get(c.id) || { contacts: 0, opportunities: 0, invoices: 0, proposals: 0 },
        }));
        withRelations.sort((a, b) => {
          const aT = Object.values(a.relatedCounts).reduce((s, v) => s + v, 0);
          const bT = Object.values(b.relatedCounts).reduce((s, v) => s + v, 0);
          if (aT !== bT) return bT - aT;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        result.push({ id: `group_${idx++}`, matchType: group.matchType, matchValue: group.matchValue, companies: withRelations, similarity: group.similarity });
      });

      return result.sort((a, b) => b.similarity - a.similarity);
    },
    enabled: !!currentWorkspace,
    staleTime: 1000 * 60 * 5,
  });
}

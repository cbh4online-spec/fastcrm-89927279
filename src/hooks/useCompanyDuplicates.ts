import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Company } from "@/hooks/useCompanies";

export interface DuplicateMatch {
  company: Company;
  matchType: "domain" | "name" | "email_domain";
  similarity: number;
}

function extractDomain(input: string): string | null {
  // From email
  const emailMatch = input.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) return emailMatch[1].toLowerCase();
  
  // From URL
  try {
    let url = input.trim();
    if (!url.startsWith("http")) url = `https://${url}`;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Simple Levenshtein-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
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

export function useCompanyDuplicateCheck(
  companyName: string,
  website?: string,
  email?: string,
  excludeId?: string
) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["company-duplicates", currentWorkspace?.id, companyName, website, email],
    queryFn: async (): Promise<DuplicateMatch[]> => {
      if (!currentWorkspace || (!companyName && !website && !email)) {
        return [];
      }

      const { data: companies, error } = await supabase
        .from("companies")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      if (!companies) return [];

      const duplicates: DuplicateMatch[] = [];
      const inputDomain = website ? extractDomain(website) : email ? extractDomain(email) : null;

      for (const company of companies) {
        if (excludeId && company.id === excludeId) continue;

        // Check domain match
        if (inputDomain) {
          const companyDomain = company.website 
            ? extractDomain(company.website) 
            : company.email 
              ? extractDomain(company.email) 
              : null;
          
          if (companyDomain && companyDomain === inputDomain) {
            duplicates.push({
              company: company as Company,
              matchType: "domain",
              similarity: 1,
            });
            continue;
          }
        }

        // Check name similarity
        if (companyName) {
          const similarity = calculateSimilarity(companyName, company.name);
          if (similarity >= 0.8) {
            duplicates.push({
              company: company as Company,
              matchType: "name",
              similarity,
            });
            continue;
          }
        }

        // Check email domain match
        if (email && company.email) {
          const inputEmailDomain = extractDomain(email);
          const companyEmailDomain = extractDomain(company.email);
          if (inputEmailDomain && companyEmailDomain && inputEmailDomain === companyEmailDomain) {
            duplicates.push({
              company: company as Company,
              matchType: "email_domain",
              similarity: 0.95,
            });
          }
        }
      }

      // Sort by similarity descending
      return duplicates.sort((a, b) => b.similarity - a.similarity);
    },
    enabled: !!currentWorkspace && (!!companyName || !!website || !!email) && (companyName.length >= 2 || !!website || !!email),
    staleTime: 5000,
  });
}

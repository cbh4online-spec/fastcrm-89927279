import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Lead } from "./useLeads";

export interface LeadDuplicateGroup {
  id: string;
  matchType: "email" | "phone" | "name_similarity";
  matchValue: string;
  leads: LeadWithRelations[];
  similarity: number;
}

export interface LeadWithRelations extends Lead {
  relatedCounts: {
    opportunities: number;
    proposals: number;
    conversations: number;
  };
}

function normalizeString(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
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

async function fetchLeadRelations(leadIds: string[]): Promise<Map<string, LeadWithRelations["relatedCounts"]>> {
  const counts = new Map<string, LeadWithRelations["relatedCounts"]>();
  leadIds.forEach(id => counts.set(id, { opportunities: 0, proposals: 0, conversations: 0 }));

  const opportunities = await supabase.from("opportunities").select("lead_id").in("lead_id", leadIds);
  const proposals = await (supabase.from("proposals") as any).select("lead_id").in("lead_id", leadIds);
  const conversations = await supabase.from("conversations").select("lead_id").in("lead_id", leadIds);

  opportunities.data?.forEach((row: any) => { const c = counts.get(row.lead_id); if (c) c.opportunities++; });
  proposals.data?.forEach((row: any) => { const c = counts.get(row.lead_id); if (c) c.proposals++; });
  conversations.data?.forEach((row: any) => { const c = counts.get(row.lead_id); if (c) c.conversations++; });

  return counts;
}

export function useLeadDuplicateGroups() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["lead-duplicate-groups", currentWorkspace?.id],
    queryFn: async (): Promise<LeadDuplicateGroup[]> => {
      if (!currentWorkspace) return [];

      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!leads || leads.length === 0) return [];

      const groups: Map<string, { matchType: LeadDuplicateGroup["matchType"]; matchValue: string; leads: Lead[]; similarity: number }> = new Map();
      const processedPairs = new Set<string>();

      // Group by exact email
      const emailMap = new Map<string, Lead[]>();
      leads.forEach(lead => {
        if (lead.email) {
          const emailLower = lead.email.toLowerCase().trim();
          const existing = emailMap.get(emailLower) || [];
          existing.push(lead as Lead);
          emailMap.set(emailLower, existing);
        }
      });
      emailMap.forEach((list, email) => {
        if (list.length > 1) {
          groups.set(`email_${email}`, { matchType: "email", matchValue: email, leads: list, similarity: 1 });
          list.forEach(c1 => list.forEach(c2 => { if (c1.id !== c2.id) processedPairs.add([c1.id, c2.id].sort().join("_")); }));
        }
      });

      // Group by phone (last 9 digits)
      const phoneMap = new Map<string, Lead[]>();
      leads.forEach(lead => {
        if (lead.phone) {
          const last9 = normalizePhone(lead.phone).slice(-9);
          if (last9.length >= 9) {
            const existing = phoneMap.get(last9) || [];
            existing.push(lead as Lead);
            phoneMap.set(last9, existing);
          }
        }
      });
      phoneMap.forEach((list, phone) => {
        if (list.length > 1) {
          const ungrouped = list.filter(c1 => list.some(c2 => c1.id !== c2.id && !processedPairs.has([c1.id, c2.id].sort().join("_"))));
          if (ungrouped.length > 1) {
            groups.set(`phone_${phone}`, { matchType: "phone", matchValue: phone, leads: ungrouped, similarity: 1 });
            ungrouped.forEach(c1 => ungrouped.forEach(c2 => { if (c1.id !== c2.id) processedPairs.add([c1.id, c2.id].sort().join("_")); }));
          }
        }
      });

      // Group by similar name (≥85%)
      for (let i = 0; i < leads.length; i++) {
        for (let j = i + 1; j < leads.length; j++) {
          const c1 = leads[i], c2 = leads[j];
          const pairKey = [c1.id, c2.id].sort().join("_");
          if (processedPairs.has(pairKey)) continue;
          if (c1.name && c2.name) {
            const similarity = calculateSimilarity(c1.name, c2.name);
            if (similarity >= 0.85) {
              const existing = Array.from(groups.values()).find(g => g.matchType === "name_similarity" && g.leads.some(l => l.id === c1.id || l.id === c2.id));
              if (existing) {
                if (!existing.leads.find(l => l.id === c1.id)) existing.leads.push(c1 as Lead);
                if (!existing.leads.find(l => l.id === c2.id)) existing.leads.push(c2 as Lead);
              } else {
                groups.set(`name_${c1.id}_${c2.id}`, { matchType: "name_similarity", matchValue: c1.name, leads: [c1 as Lead, c2 as Lead], similarity });
              }
              processedPairs.add(pairKey);
            }
          }
        }
      }

      // Fetch relation counts
      const allIds = Array.from(new Set(Array.from(groups.values()).flatMap(g => g.leads.map(l => l.id))));
      const relationCounts = await fetchLeadRelations(allIds);

      let groupIndex = 0;
      const result: LeadDuplicateGroup[] = [];
      groups.forEach(group => {
        const leadsWithRelations: LeadWithRelations[] = group.leads.map(lead => ({
          ...lead,
          relatedCounts: relationCounts.get(lead.id) || { opportunities: 0, proposals: 0, conversations: 0 },
        }));
        leadsWithRelations.sort((a, b) => {
          const aTotal = Object.values(a.relatedCounts).reduce((s, v) => s + v, 0);
          const bTotal = Object.values(b.relatedCounts).reduce((s, v) => s + v, 0);
          if (aTotal !== bTotal) return bTotal - aTotal;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        result.push({ id: `group_${groupIndex++}`, matchType: group.matchType, matchValue: group.matchValue, leads: leadsWithRelations, similarity: group.similarity });
      });

      return result.sort((a, b) => b.similarity - a.similarity);
    },
    enabled: !!currentWorkspace,
    staleTime: 1000 * 60 * 5,
  });
}

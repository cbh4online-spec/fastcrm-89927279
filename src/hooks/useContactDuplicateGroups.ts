import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Contact } from "./useContacts";

export interface DuplicateGroup {
  id: string;
  matchType: "email" | "phone" | "name_similarity";
  matchValue: string;
  contacts: ContactWithRelations[];
  similarity: number;
}

export interface ContactWithRelations extends Contact {
  relatedCounts: {
    opportunities: number;
    proposals: number;
    invoices: number;
    meetings: number;
    conversations: number;
    profiles: number;
  };
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
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

async function fetchContactRelations(contactIds: string[]): Promise<Map<string, ContactWithRelations["relatedCounts"]>> {
  const counts = new Map<string, ContactWithRelations["relatedCounts"]>();
  
  // Initialize all with zero counts
  contactIds.forEach(id => {
    counts.set(id, {
      opportunities: 0,
      proposals: 0,
      invoices: 0,
      meetings: 0,
      conversations: 0,
      profiles: 0,
    });
  });

  // Fetch counts for each relation in parallel
  const [opportunities, proposals, invoices, meetings, conversations, profiles] = await Promise.all([
    supabase.from("opportunities").select("contact_id").in("contact_id", contactIds),
    supabase.from("proposals").select("contact_id").in("contact_id", contactIds),
    supabase.from("invoices").select("contact_id").in("contact_id", contactIds),
    supabase.from("meetings").select("contact_id").in("contact_id", contactIds),
    supabase.from("conversations").select("contact_id").in("contact_id", contactIds),
    supabase.from("sj_profiles").select("contact_id").in("contact_id", contactIds),
  ]);

  // Count per contact
  opportunities.data?.forEach(row => {
    const current = counts.get(row.contact_id);
    if (current) current.opportunities++;
  });
  
  proposals.data?.forEach(row => {
    const current = counts.get(row.contact_id);
    if (current) current.proposals++;
  });
  
  invoices.data?.forEach(row => {
    const current = counts.get(row.contact_id);
    if (current) current.invoices++;
  });
  
  meetings.data?.forEach(row => {
    const current = counts.get(row.contact_id);
    if (current) current.meetings++;
  });
  
  conversations.data?.forEach(row => {
    const current = counts.get(row.contact_id);
    if (current) current.conversations++;
  });
  
  profiles.data?.forEach(row => {
    const current = counts.get(row.contact_id);
    if (current) current.profiles++;
  });

  return counts;
}

export function useContactDuplicateGroups() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["contact-duplicate-groups", currentWorkspace?.id],
    queryFn: async (): Promise<DuplicateGroup[]> => {
      if (!currentWorkspace) return [];

      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!contacts || contacts.length === 0) return [];

      const groups: Map<string, { matchType: DuplicateGroup["matchType"]; matchValue: string; contacts: Contact[]; similarity: number }> = new Map();
      const processedPairs = new Set<string>();

      // Group by exact email
      const emailMap = new Map<string, Contact[]>();
      contacts.forEach(contact => {
        if (contact.email) {
          const emailLower = contact.email.toLowerCase().trim();
          const existing = emailMap.get(emailLower) || [];
          existing.push(contact as Contact);
          emailMap.set(emailLower, existing);
        }
      });

      emailMap.forEach((contactList, email) => {
        if (contactList.length > 1) {
          const groupId = `email_${email}`;
          groups.set(groupId, {
            matchType: "email",
            matchValue: email,
            contacts: contactList,
            similarity: 1,
          });
          // Mark pairs as processed
          contactList.forEach(c1 => {
            contactList.forEach(c2 => {
              if (c1.id !== c2.id) {
                processedPairs.add([c1.id, c2.id].sort().join("_"));
              }
            });
          });
        }
      });

      // Group by phone (last 9 digits)
      const phoneMap = new Map<string, Contact[]>();
      contacts.forEach(contact => {
        if (contact.phone) {
          const normalized = normalizePhone(contact.phone);
          const last9 = normalized.slice(-9);
          if (last9.length >= 9) {
            const existing = phoneMap.get(last9) || [];
            existing.push(contact as Contact);
            phoneMap.set(last9, existing);
          }
        }
      });

      phoneMap.forEach((contactList, phone) => {
        if (contactList.length > 1) {
          // Check if any pair is not already in email groups
          const ungroupedContacts = contactList.filter(c1 => {
            return contactList.some(c2 => {
              if (c1.id === c2.id) return false;
              const pairKey = [c1.id, c2.id].sort().join("_");
              return !processedPairs.has(pairKey);
            });
          });

          if (ungroupedContacts.length > 1) {
            const groupId = `phone_${phone}`;
            groups.set(groupId, {
              matchType: "phone",
              matchValue: phone,
              contacts: ungroupedContacts,
              similarity: 1,
            });
            ungroupedContacts.forEach(c1 => {
              ungroupedContacts.forEach(c2 => {
                if (c1.id !== c2.id) {
                  processedPairs.add([c1.id, c2.id].sort().join("_"));
                }
              });
            });
          }
        }
      });

      // Group by similar name (>85%)
      for (let i = 0; i < contacts.length; i++) {
        for (let j = i + 1; j < contacts.length; j++) {
          const c1 = contacts[i];
          const c2 = contacts[j];
          const pairKey = [c1.id, c2.id].sort().join("_");
          
          if (processedPairs.has(pairKey)) continue;
          
          if (c1.name && c2.name) {
            const similarity = calculateSimilarity(c1.name, c2.name);
            if (similarity >= 0.85) {
              const groupId = `name_${c1.id}_${c2.id}`;
              const existingGroup = Array.from(groups.values()).find(g => 
                g.matchType === "name_similarity" && 
                g.contacts.some(c => c.id === c1.id || c.id === c2.id)
              );
              
              if (existingGroup) {
                if (!existingGroup.contacts.find(c => c.id === c1.id)) {
                  existingGroup.contacts.push(c1 as Contact);
                }
                if (!existingGroup.contacts.find(c => c.id === c2.id)) {
                  existingGroup.contacts.push(c2 as Contact);
                }
              } else {
                groups.set(groupId, {
                  matchType: "name_similarity",
                  matchValue: c1.name,
                  contacts: [c1 as Contact, c2 as Contact],
                  similarity,
                });
              }
              processedPairs.add(pairKey);
            }
          }
        }
      }

      // Fetch relation counts
      const allContactIds = Array.from(new Set(
        Array.from(groups.values()).flatMap(g => g.contacts.map(c => c.id))
      ));
      
      const relationCounts = await fetchContactRelations(allContactIds);

      // Build final groups with relations
      const result: DuplicateGroup[] = [];
      let groupIndex = 0;
      
      groups.forEach((group) => {
        const contactsWithRelations: ContactWithRelations[] = group.contacts.map(contact => ({
          ...contact,
          relatedCounts: relationCounts.get(contact.id) || {
            opportunities: 0,
            proposals: 0,
            invoices: 0,
            meetings: 0,
            conversations: 0,
            profiles: 0,
          },
        }));

        // Sort by created_at (oldest first) and by most relations
        contactsWithRelations.sort((a, b) => {
          const aTotal = Object.values(a.relatedCounts).reduce((sum, v) => sum + v, 0);
          const bTotal = Object.values(b.relatedCounts).reduce((sum, v) => sum + v, 0);
          if (aTotal !== bTotal) return bTotal - aTotal;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        result.push({
          id: `group_${groupIndex++}`,
          matchType: group.matchType,
          matchValue: group.matchValue,
          contacts: contactsWithRelations,
          similarity: group.similarity,
        });
      });

      return result.sort((a, b) => b.similarity - a.similarity);
    },
    enabled: !!currentWorkspace,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Contact } from "./useContacts";

export interface DuplicateMatch {
  contact: Contact;
  matchType: "email" | "phone" | "name_similarity";
  similarity: number;
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

export function useContactDuplicateCheck(
  name?: string,
  email?: string,
  phone?: string,
  excludeId?: string
) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["contact-duplicates", currentWorkspace?.id, name, email, phone, excludeId],
    queryFn: async (): Promise<DuplicateMatch[]> => {
      if (!currentWorkspace) return [];
      if (!name && !email && !phone) return [];

      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      if (!contacts) return [];

      const duplicates: DuplicateMatch[] = [];

      for (const contact of contacts) {
        if (excludeId && contact.id === excludeId) continue;

        // Check email match
        if (email && contact.email) {
          const emailLower = email.toLowerCase().trim();
          const contactEmailLower = contact.email.toLowerCase().trim();
          if (emailLower === contactEmailLower) {
            duplicates.push({
              contact: contact as Contact,
              matchType: "email",
              similarity: 1,
            });
            continue;
          }
        }

        // Check phone match
        if (phone && contact.phone) {
          const normalizedInput = normalizePhone(phone);
          const normalizedContact = normalizePhone(contact.phone);
          // Compare last 9 digits (ignoring country code variations)
          const inputLast9 = normalizedInput.slice(-9);
          const contactLast9 = normalizedContact.slice(-9);
          if (inputLast9.length >= 9 && inputLast9 === contactLast9) {
            duplicates.push({
              contact: contact as Contact,
              matchType: "phone",
              similarity: 1,
            });
            continue;
          }
        }

        // Check name similarity
        if (name && contact.name) {
          const similarity = calculateSimilarity(name, contact.name);
          if (similarity >= 0.85) {
            duplicates.push({
              contact: contact as Contact,
              matchType: "name_similarity",
              similarity,
            });
          }
        }
      }

      return duplicates.sort((a, b) => b.similarity - a.similarity);
    },
    enabled: !!currentWorkspace && (!!name || !!email || !!phone),
    staleTime: 1000 * 30, // 30 seconds
  });
}

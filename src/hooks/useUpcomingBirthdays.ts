import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface BirthdayEntry {
  name: string;
  entityType: "contact" | "lead" | "company";
  entityId: string;
  birthDate: string;
  daysUntil: number;
}

function daysUntilBirthday(birthDateStr: string): number {
  const today = new Date();
  const birth = new Date(birthDateStr);
  const thisYear = today.getFullYear();

  let next = new Date(thisYear, birth.getMonth(), birth.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next = new Date(thisYear + 1, birth.getMonth(), birth.getDate());
  }

  const diffMs = next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function useUpcomingBirthdays(windowDays = 30) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["upcoming-birthdays", currentWorkspace?.id, windowDays],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const results: BirthdayEntry[] = [];

      // Contacts
      const { data: contacts } = await (supabase
        .from("contacts")
        .select("id, first_name, last_name, birth_date, deleted_at") as any)
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .not("birth_date", "is", null);

      (contacts || []).forEach((c: any) => {
        const days = daysUntilBirthday(c.birth_date);
        if (days <= windowDays) {
          results.push({
            name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sem nome",
            entityType: "contact",
            entityId: c.id,
            birthDate: c.birth_date,
            daysUntil: days,
          });
        }
      });

      // Leads
      const { data: leads } = await (supabase
        .from("leads")
        .select("id, name, birth_date, deleted_at") as any)
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .not("birth_date", "is", null);

      (leads || []).forEach((l: any) => {
        const days = daysUntilBirthday(l.birth_date);
        if (days <= windowDays) {
          results.push({
            name: l.name || "Sem nome",
            entityType: "lead",
            entityId: l.id,
            birthDate: l.birth_date,
            daysUntil: days,
          });
        }
      });

      // Companies
      const { data: companies } = await (supabase
        .from("companies")
        .select("id, name, birth_date, deleted_at") as any)
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .not("birth_date", "is", null);

      (companies || []).forEach((co: any) => {
        const days = daysUntilBirthday(co.birth_date);
        if (days <= windowDays) {
          results.push({
            name: co.name || "Sem nome",
            entityType: "company",
            entityId: co.id,
            birthDate: co.birth_date,
            daysUntil: days,
          });
        }
      });

      return results.sort((a, b) => a.daysUntil - b.daysUntil);
    },
    enabled: !!currentWorkspace,
  });
}

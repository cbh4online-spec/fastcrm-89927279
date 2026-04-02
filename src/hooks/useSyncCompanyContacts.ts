import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSyncCompanyContacts() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { currentWorkspace } = useWorkspace();

  const sync = async () => {
    if (!currentWorkspace?.id) return;
    setIsSyncing(true);

    try {
      // 1. Fetch orphaned contacts (company text but no company_id)
      const { data: orphans, error: fetchErr } = await supabase
        .from("contacts")
        .select("id, company, email, phone, created_by")
        .eq("workspace_id", currentWorkspace.id)
        .not("company", "is", null)
        .is("company_id", null);

      if (fetchErr) throw fetchErr;
      if (!orphans || orphans.length === 0) {
        toast.info("Todos os contactos já estão vinculados a empresas.");
        return;
      }

      // 2. Get unique company names (case-insensitive grouping)
      const nameMap = new Map<string, typeof orphans>();
      for (const c of orphans) {
        if (!c.company?.trim()) continue;
        const key = c.company.trim().toLowerCase();
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(c);
      }

      // 3. Fetch existing companies for matching
      const { data: existingCompanies } = await supabase
        .from("companies")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id);

      const existingMap = new Map<string, string>();
      for (const co of existingCompanies || []) {
        existingMap.set(co.name.trim().toLowerCase(), co.id);
      }

      let companiesCreated = 0;
      let contactsLinked = 0;

      // 4. Process each unique company name
      for (const [normalizedName, contactGroup] of nameMap) {
        let companyId = existingMap.get(normalizedName);

        // Create company if it doesn't exist
        if (!companyId) {
          const displayName = contactGroup[0].company!.trim();
          const firstContact = contactGroup[0];

          const { data: newCompany, error: createErr } = await supabase
            .from("companies")
            .insert({
              name: displayName,
              workspace_id: currentWorkspace.id,
              created_by: firstContact.created_by,
              email: firstContact.email || null,
              phone: firstContact.phone || null,
            })
            .select("id")
            .single();

          if (createErr) {
            console.error(`Erro ao criar empresa "${displayName}":`, createErr);
            continue;
          }
          companyId = newCompany.id;
          companiesCreated++;
        }

        // 5. Link all contacts in this group
        const contactIds = contactGroup.map(c => c.id);
        const { error: updateErr } = await supabase
          .from("contacts")
          .update({ company_id: companyId })
          .in("id", contactIds);

        if (updateErr) {
          console.error(`Erro ao vincular contactos:`, updateErr);
          continue;
        }
        contactsLinked += contactIds.length;
      }

      toast.success(
        `Sincronização concluída: ${companiesCreated} empresa(s) criada(s), ${contactsLinked} contacto(s) vinculado(s).`
      );
    } catch (err) {
      console.error("Erro na sincronização:", err);
      toast.error("Erro ao sincronizar empresas dos contactos.");
    } finally {
      setIsSyncing(false);
    }
  };

  return { sync, isSyncing };
}

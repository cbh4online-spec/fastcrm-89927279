import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Props {
  contractId: string;
  companyId?: string | null;
  companyName?: string;
  contactId?: string | null;
  contactName?: string;
}

/** Linhas Empresa/Contacto clicáveis, com fallback para o contacto da empresa. */
export function RenewalContactLinks({ contractId, companyId, companyName, contactId, contactName }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [linking, setLinking] = useState(false);

  const { data: fallback } = useQuery({
    queryKey: ["renewal-company-contact", companyId],
    enabled: !contactId && !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: true })
        .limit(1);
      return (data?.[0] as { id: string; name: string | null; email: string | null } | undefined) ?? null;
    },
  });

  const linkContact = async () => {
    if (!fallback) return;
    setLinking(true);
    const { error } = await supabase
      .from("renewal_contracts")
      .update({ contact_id: fallback.id } as any)
      .eq("id", contractId);
    setLinking(false);
    if (error) return toast.error("Não foi possível ligar o contacto: " + error.message);
    toast.success("Contacto ligado ao contrato");
    qc.invalidateQueries({ queryKey: ["renewal-contract"] });
    qc.invalidateQueries({ queryKey: ["renewal-contracts"] });
  };

  const linkBtn = (label: string, to: string) => (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      {label}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </button>
  );

  return (
    <>
      <div className="flex justify-between gap-2">
        <span className="text-muted-foreground">Empresa</span>
        {companyId ? linkBtn(companyName || "Abrir empresa", `/dashboard/companies/${companyId}`) : <span>{companyName || "—"}</span>}
      </div>
      <div className="flex justify-between gap-2 items-center">
        <span className="text-muted-foreground">Contacto</span>
        {contactId ? (
          linkBtn(contactName || "Abrir contacto", `/dashboard/contacts/${contactId}`)
        ) : fallback ? (
          <span className="flex items-center gap-2 flex-wrap justify-end">
            {linkBtn(fallback.name || fallback.email || "Abrir contacto", `/dashboard/contacts/${fallback.id}`)}
            <Badge variant="outline" className="text-[10px]">Contacto da empresa</Badge>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={linkContact} disabled={linking}>
              <Link2 className="h-3 w-3 mr-1" />Ligar ao contrato
            </Button>
          </span>
        ) : (
          <span>—</span>
        )}
      </div>
    </>
  );
}

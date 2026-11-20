import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const ENSI_FORM_ID = "29967420322844561";

type EnsiContactCardProps = {
  contactId: string;
  workspaceId?: string;
};

export function EnsiContactCard({ contactId, workspaceId }: EnsiContactCardProps) {
  const { data: lead } = useQuery({
    queryKey: ["contact-ensi-lead", workspaceId, contactId],
    enabled: Boolean(workspaceId && contactId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_leads" as any)
        .select("id, normalized_payload_json, received_at")
        .eq("workspace_id", workspaceId!)
        .eq("contact_id", contactId)
        .eq("form_id", ENSI_FORM_ID)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (!lead) return null;
  const answers = lead.normalized_payload_json ?? {};

  return (
    <Card aria-labelledby="ensi-contact-card-title">
      <CardHeader className="pb-3">
        <CardTitle id="ensi-contact-card-title" className="text-base">Formulário ENSI</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Edição</dt>
            <dd className="mt-1 font-medium">{answers.edicao || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Presencial</dt>
            <dd className="mt-1 font-medium">{answers.presencial || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Atividade</dt>
            <dd className="mt-1 font-medium">{answers.atividade || "—"}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

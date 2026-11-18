import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Archive, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const db = supabase as any;
const ENTITY_LABEL: Record<string, string> = { contact: "Contacto", profile: "Perfil", enrollment: "Inscrição" };
const ACTION_LABEL: Record<string, string> = { created: "Criado", reused: "Reconhecido", linked: "Associado", evidence: "Evidência" };

interface Props {
  workspaceId: string;
  profileId: string;
  contactId?: string | null;
  enrollments: { id: string; course?: { name?: string } | null }[];
}

/** Origem dos dados (proveniência auditável) do perfil, do contacto e das inscrições — incluindo perfis consolidados neste. */
export function ProfileProvenanceCard({ workspaceId, profileId, contactId, enrollments }: Props) {
  const enrIds = enrollments.map((e) => e.id);
  const q = useQuery({
    queryKey: ["sj-provenance", workspaceId, profileId, contactId, enrIds.join(",")],
    queryFn: async () => {
      const { data: merged } = await db.from("sj_profiles").select("id").eq("workspace_id", workspaceId).eq("merged_into_profile_id", profileId);
      const profileIds = [profileId, ...((merged ?? []) as { id: string }[]).map((m) => m.id)];
      const ors = [`and(entity_type.eq.profile,entity_id.in.(${profileIds.join(",")}))`];
      if (contactId) ors.push(`and(entity_type.eq.contact,entity_id.eq.${contactId})`);
      if (enrIds.length) ors.push(`and(entity_type.eq.enrollment,entity_id.in.(${enrIds.join(",")}))`);
      const { data, error } = await db.from("sj_import_provenance")
        .select("id, entity_type, entity_id, action, source_label, file_name, sheet_name, row_ref, changes, created_at")
        .eq("workspace_id", workspaceId).or(ors.join(",")).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
  });
  const courseOf = (id: string) => enrollments.find((e) => e.id === id)?.course?.name;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4" aria-hidden />Origem dos dados</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <Skeleton className="h-16" /> : q.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar a origem.</p>
        ) : !q.data?.length ? (
          <p className="text-sm text-muted-foreground">Sem registos de importação para este aluno.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {q.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
                <Badge variant="secondary">{p.source_label}</Badge>
                <span>{ENTITY_LABEL[p.entity_type]}{p.entity_type === "enrollment" && courseOf(p.entity_id) ? ` · ${courseOf(p.entity_id)}` : ""}</span>
                <Badge variant="outline">{ACTION_LABEL[p.action] ?? p.action}</Badge>
                <span className="text-muted-foreground">{p.file_name}{p.sheet_name ? ` › ${p.sheet_name}` : ""} · linha {p.row_ref}</span>
                <span className="text-muted-foreground">{format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}</span>
                {p.changes?.pedagogic_status && <span className="text-muted-foreground">· conclusão aplicada</span>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Aviso de perfil arquivado por consolidação, com ligação ao perfil final. */
export function ArchivedProfileBanner({ profile }: { profile: { archived_at?: string | null; merged_into_profile_id?: string | null; archive_reason?: string | null } }) {
  if (!profile.archived_at) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
      <Archive className="h-4 w-4" aria-hidden />
      <span>Perfil arquivado em {format(new Date(profile.archived_at), "dd/MM/yyyy")}{profile.archive_reason ? ` — ${profile.archive_reason}` : ""}.</span>
      {profile.merged_into_profile_id && (
        <Link className="font-medium text-primary underline-offset-4 hover:underline" to={`/dashboard/student-journey/profiles/${profile.merged_into_profile_id}`}>Abrir perfil consolidado</Link>
      )}
    </div>
  );
}

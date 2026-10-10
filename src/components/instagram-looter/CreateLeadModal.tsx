import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, Instagram, MapPin, Briefcase, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  checkProspectingIdentity,
  describeProspectingIdentity,
  importProspectingLead,
  prospectingIdentityHref,
  prospectingIdentityLabel,
  type ProspectingIdentityCheck,
} from "@/lib/prospecting/identity";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface ProfileData {
  username: string;
  full_name?: string;
  biography?: string;
  external_url?: string;
  profile_pic_url?: string;
  follower_count?: number;
}

interface AIInsight {
  is_individual: boolean;
  category_guess: string;
  specialty_guess: string;
  city_guess: string;
  works_at: string | null;
  contact_signals: string[];
  confidence: number;
  reasons: string[];
  red_flags: string[];
  lead_score: number;
}

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  insight: AIInsight | null;
  profileId?: string;
  onSuccess?: () => void;
}

export function CreateLeadModal({
  open,
  onOpenChange,
  profile,
  insight,
  profileId,
  onSuccess,
}: CreateLeadModalProps) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [confirmPossible, setConfirmPossible] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.full_name || profile?.username || "",
    notes: "",
  });

  const username = (profile?.username || "").replace(/^@/, "").trim().toLowerCase();
  const validUsername = /^[a-z0-9._]{1,30}$/.test(username);
  const instagramUrl = validUsername ? `https://www.instagram.com/${username}` : null;
  const trimmedName = formData.name.trim();
  const workspaceId = currentWorkspace?.id;

  // Server-side check across leads, contacts, companies and profiles of this workspace only.
  const identityQuery = useQuery({
    queryKey: ["prospecting-identity-single", workspaceId, username, trimmedName, profile?.external_url ?? null],
    queryFn: () =>
      checkProspectingIdentity(supabase, workspaceId!, {
        name: trimmedName,
        instagram_url: instagramUrl,
        website: profile?.external_url || null,
      }),
    enabled: open && !!workspaceId && validUsername && trimmedName.length >= 2,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    setConfirmPossible(false);
  }, [identityQuery.data?.status, trimmedName]);

  const identity: ProspectingIdentityCheck | undefined = identityQuery.isError
    ? { status: "unavailable", matches: [] }
    : identityQuery.data;
  const identityHref = identity && identity.status !== "new" ? prospectingIdentityHref(identity) : null;
  const isBlockingStatus = !identity || ["exists", "opportunity", "blocked", "unavailable"].includes(identity.status);
  const canCreate =
    !isCreating &&
    !identityQuery.isFetching &&
    validUsername &&
    trimmedName.length >= 2 &&
    !!identity &&
    !isBlockingStatus &&
    (identity.status === "new" || (identity.status === "review" && confirmPossible));

  const handleCreate = async () => {
    if (!workspaceId) {
      toast.error("Workspace não selecionado");
      return;
    }
    if (!canCreate || !instagramUrl || !identity) return;

    setIsCreating(true);
    try {
      const insightNotes = insight ? `
## Análise IA Instagram
- **Categoria:** ${insight.category_guess}
- **Especialidade:** ${insight.specialty_guess}
- **Cidade:** ${insight.city_guess}
- **Lead Score:** ${insight.lead_score}/100
- **Tipo:** ${insight.is_individual ? "Profissional Individual" : "Empresa/Clínica"}
${insight.works_at ? `- **Local de Trabalho:** ${insight.works_at}` : ""}
${insight.contact_signals.length > 0 ? `- **Sinais de Contacto:** ${insight.contact_signals.join(", ")}` : ""}

### Pontos Positivos
${insight.reasons.map(r => `- ${r}`).join("\n")}

${insight.red_flags.length > 0 ? `### Alertas\n${insight.red_flags.map(f => `- ${f}`).join("\n")}` : ""}
` : "";

      const fullNotes = `
## Perfil Instagram
- **Username:** @${username}
- **Link:** ${instagramUrl}
${profile.biography ? `- **Bio:** ${profile.biography}` : ""}
${profile.external_url ? `- **Website:** ${profile.external_url}` : ""}
${profile.follower_count ? `- **Seguidores:** ${profile.follower_count.toLocaleString("pt-PT")}` : ""}

${insightNotes}

${formData.notes.trim() ? `## Notas Adicionais\n${formData.notes.trim()}` : ""}
`.trim();

      // ig_profiles.id is not a professional_prospecting_profiles.id, so p_profile_id stays NULL.
      // The server rechecks identity and creates the lead in the same transaction.
      const result = await importProspectingLead(
        supabase,
        workspaceId,
        {
          name: trimmedName,
          source: "instagram_looter",
          lead_type: insight && !insight.is_individual ? "company" : "person",
          notes: fullNotes,
          lead_score: insight?.lead_score ?? null,
          ai_insight: insight ? `${insight.category_guess} | ${insight.specialty_guess} | Score: ${insight.lead_score}/100` : null,
          instagram_url: instagramUrl,
          website: profile.external_url || null,
          avatar_url: profile.profile_pic_url || null,
          instagram_bio: profile.biography || null,
          instagram_followers_count: profile.follower_count ?? null,
        },
        undefined,
        identity.status === "review" && confirmPossible,
      );

      if (!result.lead_id) {
        // The server found a match created meanwhile: show it instead of creating.
        queryClient.setQueryData(
          ["prospecting-identity-single", workspaceId, username, trimmedName, profile?.external_url ?? null],
          result,
        );
        toast.error("Lead não criado", { description: describeProspectingIdentity(result) });
        return;
      }

      // Preserve the ig_profiles association only after the lead is confirmed,
      // and only for a profile that exists in this workspace.
      if (profileId) {
        const { data: igProfile } = await supabase
          .from("ig_profiles")
          .select("id")
          .eq("id", profileId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (igProfile?.id) {
          const { data: { user } } = await supabase.auth.getUser();
          const { error: linkError } = user
            ? await supabase.from("ig_generated_leads").insert({
                workspace_id: workspaceId,
                profile_id: igProfile.id,
                crm_lead_id: result.lead_id,
                status: "created",
                sync_data: {
                  lead_score: insight?.lead_score,
                  category: insight?.category_guess,
                  specialty: insight?.specialty_guess,
                  city: insight?.city_guess,
                },
                created_by: user.id,
              })
            : { error: new Error("Sessão expirada") };
          if (linkError) {
            toast.warning("Lead criado, mas não foi possível associá-lo ao perfil guardado.");
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["prospecting-identity-single"] });
      queryClient.invalidateQueries({ queryKey: ["prospecting-identity-batch"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead criado com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar lead");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Lead no CRM
          </DialogTitle>
          <DialogDescription>
            Criar um novo lead a partir do perfil @{profile.username}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profile Summary */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            {profile.profile_pic_url && (
              <img
                src={profile.profile_pic_url}
                alt={profile.username}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <p className="font-semibold">@{username}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Instagram className="h-3 w-3" />
                <a 
                  href={`https://www.instagram.com/${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Ver perfil
                </a>
              </div>
            </div>
            {insight && (
              <Badge variant={insight.lead_score >= 70 ? "default" : insight.lead_score >= 40 ? "secondary" : "outline"}>
                Score: {insight.lead_score}
              </Badge>
            )}
          </div>

          {/* AI Insights Summary */}
          {insight && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{insight.category_guess}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{insight.city_guess}</span>
              </div>
            </div>
          )}

          {/* Warning if no AI insight */}
          {!insight && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Recomendamos analisar o perfil com IA antes de criar o lead para ter informações mais completas.
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Nome do Lead</Label>
              <Input
                id="lead-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do lead"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-notes">Notas Adicionais (opcional)</Label>
              <Textarea
                id="lead-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Adicione notas sobre este lead..."
                rows={3}
              />
            </div>
          </div>

          {/* CRM identity check */}
          <div aria-live="polite">
            {!validUsername ? (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>O utilizador do Instagram não é válido; não é possível criar o lead.</AlertDescription>
              </Alert>
            ) : trimmedName.length < 2 ? null : identityQuery.isFetching && !identity ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> A verificar duplicados no CRM…
              </div>
            ) : identity ? (
              <Alert variant={identity.status === "new" ? "default" : identity.status === "review" ? "default" : "destructive"}>
                {identity.status === "new" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                <AlertDescription className="space-y-2">
                  <p>
                    <span className="font-medium">{prospectingIdentityLabel(identity).label}.</span>{" "}
                    {describeProspectingIdentity(identity)}
                  </p>
                  {identityHref && (
                    <Link to={identityHref} className="text-primary underline" onClick={() => onOpenChange(false)}>
                      Abrir registo existente
                    </Link>
                  )}
                  {identity.status === "review" && (
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={confirmPossible}
                        onCheckedChange={(v) => setConfirmPossible(v === true)}
                        aria-label="Confirmo que é uma entidade diferente"
                      />
                      <span>Revi a correspondência e confirmo que é uma entidade diferente.</span>
                    </label>
                  )}
                  {identity.status === "unavailable" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => identityQuery.refetch()}>
                      Tentar novamente
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          {/* What will be saved */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Será guardado automaticamente:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Link do perfil Instagram</li>
              <li>Bio e website (se existir)</li>
              {insight && <li>Análise IA completa com score e classificação</li>}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Criar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

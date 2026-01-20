import { useState } from "react";
import { Loader2, UserPlus, Instagram, MapPin, Briefcase, AlertCircle } from "lucide-react";
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
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state with pre-filled data from AI
  const [formData, setFormData] = useState({
    name: profile.full_name || profile.username,
    source: "instagram_looter",
    notes: "",
  });

  const handleCreate = async () => {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não selecionado");
      return;
    }

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Build lead notes with AI insights
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
- **Username:** @${profile.username}
- **Link:** https://instagram.com/${profile.username}
${profile.biography ? `- **Bio:** ${profile.biography}` : ""}
${profile.external_url ? `- **Website:** ${profile.external_url}` : ""}
${profile.follower_count ? `- **Seguidores:** ${profile.follower_count.toLocaleString()}` : ""}

${insightNotes}

${formData.notes ? `## Notas Adicionais\n${formData.notes}` : ""}
`.trim();

      // Create lead in CRM
      const { data: lead, error } = await supabase
        .from("leads")
        .insert({
          workspace_id: currentWorkspace.id,
          name: formData.name,
          source: "instagram_looter",
          notes: fullNotes,
          lead_score: insight?.lead_score || null,
          ai_insight: insight ? `${insight.category_guess} | ${insight.specialty_guess} | Score: ${insight.lead_score}/100` : null,
          instagram_url: `https://instagram.com/${profile.username}`,
          website: profile.external_url || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Record the generated lead if we have a profile ID
      if (profileId) {
        await supabase
          .from("ig_generated_leads")
          .insert({
            workspace_id: currentWorkspace.id,
            profile_id: profileId,
            crm_lead_id: lead.id,
            status: "created",
            sync_data: {
              lead_score: insight?.lead_score,
              category: insight?.category_guess,
              specialty: insight?.specialty_guess,
              city: insight?.city_guess,
            },
            created_by: user.id,
          });
      }

      toast.success("Lead criado com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating lead:", error);
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
              <p className="font-semibold">@{profile.username}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Instagram className="h-3 w-3" />
                <a 
                  href={`https://instagram.com/${profile.username}`}
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
          <Button onClick={handleCreate} disabled={isCreating || !formData.name.trim()}>
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

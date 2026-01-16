import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLead, useUpdateLead, useDeleteLead, Lead } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft,
  ArrowRight,
  User, 
  Mail, 
  Phone, 
  Trash2, 
  Clock,
  Tag,
  Sparkles,
  Instagram,
  Globe,
  MessageSquare,
  UserCircle
} from "lucide-react";
import { toast } from "sonner";
import { 
  useGenerateFieldSuggestions,
} from "@/hooks/useFieldSuggestions";
import { InsightsSidebar } from "@/components/insights";
import { ConvertLeadDialog } from "@/components/crm/ConvertLeadDialog";
import { IdentificationSection } from "@/components/leads/sections/IdentificationSection";
import { TagsSection } from "@/components/leads/sections/TagsSection";
import { SocialMediaSection } from "@/components/leads/sections/SocialMediaSection";

// Status colors and labels
const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};

const statusLabels: Record<string, string> = {
  new: "Novo",
  in_progress: "Em Progresso",
  completed: "Concluído",
};

// Source icon mapping
const sourceIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  website: <Globe className="w-3 h-3" />,
  whatsapp: <MessageSquare className="w-3 h-3" />,
  referral: <UserCircle className="w-3 h-3" />,
};

// Helper function for time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias`;
  
  return date.toLocaleDateString('pt-PT');
}

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  
  // AI field suggestions
  const generateSuggestions = useGenerateFieldSuggestions();

  // Handler for inline field change
  const handleFieldChange = useCallback(async (field: keyof Lead, value: unknown) => {
    if (!lead) return;
    await updateLead.mutateAsync({
      id: lead.id,
      [field]: value || undefined,
    });
    toast.success("Campo atualizado");
  }, [lead, updateLead]);

  const handleDelete = async () => {
    if (!lead) return;

    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success("Lead eliminado com sucesso");
      navigate("/dashboard/leads");
    } catch (error) {
      toast.error("Erro ao eliminar lead");
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!id) return;
    await generateSuggestions.mutateAsync({ entityType: "lead", entityId: id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Lead não encontrado</h2>
        <p className="text-muted-foreground mb-4">
          O lead que procura não existe ou foi eliminado.
        </p>
        <Button onClick={() => navigate("/dashboard/leads")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Leads
        </Button>
      </div>
    );
  }

  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sourceTag = lead.source?.toLowerCase() || "outro";
  const SourceIcon = sourceIcons[sourceTag] || <Tag className="w-3 h-3" />;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <PageBreadcrumbs
        items={[
          { label: "CRM", href: "/dashboard/crm" },
          { label: "Leads", href: "/dashboard/leads" },
          { label: lead.name },
        ]}
      />
      
      {/* Header - Same style as ENIContactDetail */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/leads")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <Avatar className="h-16 w-16 text-xl ring-2 ring-violet-500/20">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-violet-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{lead.name}</h1>
              
              {/* Source Tag */}
              {lead.source && (
                <Badge variant="secondary" className="gap-1 text-xs uppercase font-medium">
                  {SourceIcon}
                  {lead.source}
                </Badge>
              )}
              
              {/* Status Badge */}
              <Badge variant="outline" className={statusColors[lead.status]}>
                {statusLabels[lead.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Atualizado há {getTimeAgo(new Date(lead.updated_at))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          {lead.email && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`mailto:${lead.email}`}>
                      <Mail className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enviar E-mail</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {lead.phone && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ligar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleGenerateSuggestions}
            disabled={generateSuggestions.isPending}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {generateSuggestions.isPending ? "A analisar..." : "Analisar com IA"}
          </Button>
          
          <ConvertLeadDialog 
            lead={lead}
            trigger={
              <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <ArrowRight className="w-4 h-4" />
                Converter
              </Button>
            }
          />
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar Lead</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem a certeza que deseja eliminar este lead? Esta ação não pode ser revertida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* AI Insights */}
      <InsightsSidebar
        entityType="lead"
        entityId={id || ''}
      />

      {/* Main Content - 2 Column Layout like Contact */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Sections */}
        <div className="lg:col-span-2 space-y-4">
          <IdentificationSection 
            lead={lead} 
            onFieldChange={handleFieldChange}
          />
          
          <SocialMediaSection 
            lead={lead} 
            onFieldChange={handleFieldChange}
          />
        </div>

        {/* Right Column - Tags */}
        <div className="space-y-4">
          <TagsSection 
            lead={lead} 
            onFieldChange={handleFieldChange}
          />
        </div>
      </div>
    </div>
  );
}

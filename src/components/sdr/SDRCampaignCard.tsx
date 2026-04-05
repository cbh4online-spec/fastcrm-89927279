import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Play, Pause, Trash2, BarChart3, Settings2 } from "lucide-react";
import type { SDRCampaign } from "@/hooks/useSDRCampaigns";

interface SDRCampaignCardProps {
  campaign: SDRCampaign;
  onSelect: (id: string) => void;
  onToggleStatus: (id: string, newStatus: "active" | "paused") => void;
  onDelete: (id: string) => void;
  onOpenSettings?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Ativa", variant: "default" },
  paused: { label: "Pausada", variant: "secondary" },
  completed: { label: "Concluída", variant: "secondary" },
};

export function SDRCampaignCard({ campaign, onSelect, onToggleStatus, onDelete, onOpenSettings }: SDRCampaignCardProps) {
  const sc = statusConfig[campaign.status] || statusConfig.draft;
  const replyRate = campaign.total_enrolled > 0
    ? ((campaign.total_replied / campaign.total_enrolled) * 100).toFixed(1)
    : "0.0";
  const meetingRate = campaign.total_enrolled > 0
    ? ((campaign.total_meetings / campaign.total_enrolled) * 100).toFixed(1)
    : "0.0";

  return (
    <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onSelect(campaign.id)}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">{campaign.name}</CardTitle>
          {campaign.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{campaign.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={sc.variant}>{sc.label}</Badge>
          {onOpenSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onOpenSettings(campaign.id); }}
              title="Configurações"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {campaign.status === "active" ? (
                <DropdownMenuItem onClick={() => onToggleStatus(campaign.id, "paused")}>
                  <Pause className="h-4 w-4 mr-2" /> Pausar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onToggleStatus(campaign.id, "active")}>
                  <Play className="h-4 w-4 mr-2" /> Ativar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onSelect(campaign.id)}>
                <BarChart3 className="h-4 w-4 mr-2" /> Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(campaign.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{campaign.total_enrolled}</p>
            <p className="text-[11px] text-muted-foreground">Enrolled</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{replyRate}%</p>
            <p className="text-[11px] text-muted-foreground">Reply Rate</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{meetingRate}%</p>
            <p className="text-[11px] text-muted-foreground">Meeting Rate</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{campaign.total_converted}</p>
            <p className="text-[11px] text-muted-foreground">Convertidos</p>
          </div>
        </div>
        {campaign.auto_enroll_enabled && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-enroll ativo (score ≥ {campaign.auto_enroll_min_score})
          </div>
        )}
      </CardContent>
    </Card>
  );
}

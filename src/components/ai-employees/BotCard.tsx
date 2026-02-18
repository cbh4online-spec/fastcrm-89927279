import { Bot } from "@/hooks/useBots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot as BotIcon,
  Wand2,
  GitBranch,
  MoreVertical,
  Play,
  Pause,
  Settings,
  Trash2,
  BarChart3,
  MessageSquare,
  Phone,
  Instagram,
  Mail,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const TYPE_CONFIG = {
  guided: { label: "Guided", icon: Wand2, color: "text-blue-500 bg-blue-500/10" },
  prompt: { label: "Prompt", icon: BotIcon, color: "text-purple-500 bg-purple-500/10" },
  flow: { label: "Flow", icon: GitBranch, color: "text-emerald-500 bg-emerald-500/10" },
};

const STATUS_CONFIG = {
  active: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground border-border" },
  paused: { label: "Pausado", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: Phone,
  instagram: Instagram,
  email: Mail,
  widget: Globe,
  sms: MessageSquare,
};

interface BotCardProps {
  bot: Bot;
  onToggleStatus: (id: string, status: "active" | "paused") => void;
  onDelete: (id: string) => void;
}

export function BotCard({ bot, onToggleStatus, onDelete }: BotCardProps) {
  const navigate = useNavigate();
  const typeConfig = TYPE_CONFIG[bot.type];
  const statusConfig = STATUS_CONFIG[bot.status];
  const TypeIcon = typeConfig.icon;
  const ChannelIcon = bot.channel ? (CHANNEL_ICONS[bot.channel] || Globe) : Globe;

  return (
    <Card className="group hover:shadow-md hover:shadow-primary/5 transition-all duration-200 border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", typeConfig.color)}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground leading-tight">{bot.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{bot.description || "Sem descrição"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-[10px] px-2 py-0.5 font-medium", statusConfig.color)}
            >
              {statusConfig.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => navigate(`/dashboard/ai-employees/${bot.id}`)}>
                  <Settings className="w-3.5 h-3.5 mr-2" /> Configurar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/dashboard/ai-employees/${bot.id}/analytics`)}>
                  <BarChart3 className="w-3.5 h-3.5 mr-2" /> Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {bot.status !== "active" ? (
                  <DropdownMenuItem onClick={() => onToggleStatus(bot.id, "active")}>
                    <Play className="w-3.5 h-3.5 mr-2" /> Ativar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onToggleStatus(bot.id, "paused")}>
                    <Pause className="w-3.5 h-3.5 mr-2" /> Pausar
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(bot.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
              <TypeIcon className="w-2.5 h-2.5" />
              {typeConfig.label}
            </Badge>
          </div>
          {bot.channel && (
            <div className="flex items-center gap-1">
              <ChannelIcon className="w-3 h-3" />
              <span className="capitalize">{bot.channel}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => navigate(`/dashboard/ai-employees/${bot.id}`)}
          >
            <Settings className="w-3 h-3 mr-1.5" /> Configurar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => navigate(`/dashboard/ai-employees/${bot.id}/analytics`)}
          >
            <BarChart3 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { Link } from "react-router-dom";
import { SmartLead, NextActionType } from "@/hooks/useSmartLeads";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Mail, 
  Phone, 
  Instagram, 
  MessageSquare, 
  Globe,
  FileText,
  Snowflake,
  Flame,
  ThermometerSun,
  Sparkles,
  AlertTriangle,
  Zap,
  ExternalLink,
  MoreHorizontal,
  Reply,
  FileSpreadsheet,
  Target,
  Settings2,
  Archive,
  Clock,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface SmartLeadRowProps {
  lead: SmartLead;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
  showAdvanced?: boolean;
}

const sourceIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-3 h-3" />,
  instagram: <Instagram className="w-3 h-3" />,
  whatsapp: <MessageSquare className="w-3 h-3" />,
  form: <FileText className="w-3 h-3" />,
  website: <Globe className="w-3 h-3" />,
};

const sourceColors: Record<string, string> = {
  email: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  instagram: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  whatsapp: "bg-green-500/10 text-green-600 border-green-500/20",
  form: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  website: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "Em contacto", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { label: "Qualificado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

const temperatureConfig = {
  cold: { icon: <Snowflake className="w-4 h-4" />, label: "Frio", emoji: "❄️", color: "text-blue-500", bg: "bg-blue-500/10" },
  warm: { icon: <ThermometerSun className="w-4 h-4" />, label: "Morno", emoji: "🟡", color: "text-amber-500", bg: "bg-amber-500/10" },
  hot: { icon: <Flame className="w-4 h-4" />, label: "Quente", emoji: "🔥", color: "text-red-500", bg: "bg-red-500/10" },
};

const nextActionIcons: Record<NextActionType, React.ReactNode> = {
  reply_manual: <Reply className="w-3 h-3" />,
  send_template: <FileSpreadsheet className="w-3 h-3" />,
  create_opportunity: <Target className="w-3 h-3" />,
  activate_automation: <Settings2 className="w-3 h-3" />,
  archive: <Archive className="w-3 h-3" />,
  follow_up: <Clock className="w-3 h-3" />,
};

const nextActionLabels: Record<NextActionType, string> = {
  reply_manual: "Responder manualmente",
  send_template: "Enviar template",
  create_opportunity: "Criar oportunidade",
  activate_automation: "Ativar automação",
  archive: "Arquivar",
  follow_up: "Follow-up",
};

export function SmartLeadRow({ 
  lead, 
  isSelected, 
  onToggleSelect, 
  onAnalyze,
  isAnalyzing,
  showAdvanced = false 
}: SmartLeadRowProps) {
  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const tempConfig = temperatureConfig[lead.ai_temperature];
  const status = statusLabels[lead.status] || statusLabels.new;
  const sourceKey = lead.source?.toLowerCase() || "website";
  const SourceIcon = sourceIcons[sourceKey] || <Globe className="w-3 h-3" />;
  const sourceColor = sourceColors[sourceKey] || sourceColors.website;

  const formatSLA = () => {
    if (lead.hoursSinceLastContact === null) return "—";
    if (lead.hoursSinceLastContact < 1) return "Agora";
    if (lead.hoursSinceLastContact < 24) return `${Math.round(lead.hoursSinceLastContact)}h`;
    return `${Math.round(lead.hoursSinceLastContact / 24)}d`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value}`;
  };

  return (
    <TableRow className={cn(
      "group transition-colors",
      isSelected && "bg-muted/50",
      lead.slaBreach && "bg-destructive/5"
    )}>
      {/* Checkbox */}
      <TableCell className="w-[40px]">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>

      {/* Lead Info */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link 
              to={`/dashboard/leads/${lead.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline truncate block"
            >
              {lead.name}
            </Link>
            {lead.company_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{lead.company_name}</span>
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Source */}
      <TableCell>
        <Badge variant="outline" className={cn("gap-1 text-xs capitalize", sourceColor)}>
          {SourceIcon}
          {lead.source || "Website"}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant="outline" className={cn("text-xs", status.color)}>
          {status.label}
        </Badge>
      </TableCell>

      {/* Temperature */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                tempConfig.bg, tempConfig.color
              )}>
                <span>{tempConfig.emoji}</span>
                <span>{tempConfig.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Classificação automática baseada na intenção do lead</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Lead Score */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      lead.lead_score >= 70 ? "bg-emerald-500" :
                      lead.lead_score >= 40 ? "bg-amber-500" : "bg-muted-foreground"
                    )}
                    style={{ width: `${lead.lead_score}%` }}
                  />
                </div>
                <span className={cn(
                  "text-sm font-medium tabular-nums",
                  lead.lead_score >= 70 ? "text-emerald-600" :
                  lead.lead_score >= 40 ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {lead.lead_score}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Score calculado automaticamente (0-100)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Next Action */}
      <TableCell>
        {lead.ai_next_action ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs">
                  {lead.ai_next_action_type && (
                    <span className="text-primary">
                      {nextActionIcons[lead.ai_next_action_type]}
                    </span>
                  )}
                  <span className="text-muted-foreground truncate max-w-[140px]">
                    {lead.ai_next_action_type ? nextActionLabels[lead.ai_next_action_type] : lead.ai_next_action}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">
                  <span className="font-medium">O que faz mais sentido agora:</span><br />
                  {lead.ai_next_action}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* SLA */}
      <TableCell>
        <div className={cn(
          "flex items-center gap-1 text-xs",
          lead.slaBreach && "text-destructive font-medium"
        )}>
          {lead.slaBreach && <AlertTriangle className="w-3 h-3" />}
          <Clock className="w-3 h-3 text-muted-foreground" />
          {formatSLA()}
        </div>
      </TableCell>

      {/* Advanced columns */}
      {showAdvanced && (
        <>
          {/* Estimated Value */}
          <TableCell>
            <span className="text-sm font-medium text-emerald-600">
              {lead.estimated_value > 0 ? formatCurrency(lead.estimated_value) : "—"}
            </span>
          </TableCell>

          {/* Conversion Probability */}
          <TableCell>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${lead.conversion_probability}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {lead.conversion_probability}%
              </span>
            </div>
          </TableCell>

          {/* Automation */}
          <TableCell>
            {lead.automation_active ? (
              <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                <Zap className="w-3 h-3" />
                Ativa
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>

          {/* Insight */}
          <TableCell>
            {lead.ai_insight ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[180px]">
                      <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="truncate">{lead.ai_insight}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[250px]">
                      <span className="font-medium">Resumo rápido para decidir sem abrir o lead:</span><br />
                      {lead.ai_insight}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
        </>
      )}

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                >
                  <Sparkles className={cn(
                    "w-4 h-4",
                    isAnalyzing && "animate-pulse"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Analisar com IA</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Link to={`/dashboard/leads/${lead.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Reply className="w-4 h-4 mr-2" />
                Enviar mensagem
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Target className="w-4 h-4 mr-2" />
                Criar oportunidade
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings2 className="w-4 h-4 mr-2" />
                Ativar automação
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Archive className="w-4 h-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
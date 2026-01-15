import { Link } from "react-router-dom";
import { SmartContact, NextActionType } from "@/hooks/useSmartContacts";
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
  Building2,
  Briefcase,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartContactRowProps {
  contact: SmartContact;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
  showAdvanced?: boolean;
}

const temperatureConfig = {
  cold: { icon: <Snowflake className="w-4 h-4" />, label: "Frio", emoji: "❄️", color: "text-blue-500", bg: "bg-blue-500/10" },
  warm: { icon: <ThermometerSun className="w-4 h-4" />, label: "Morno", emoji: "🟡", color: "text-amber-500", bg: "bg-amber-500/10" },
  hot: { icon: <Flame className="w-4 h-4" />, label: "Quente", emoji: "🔥", color: "text-red-500", bg: "bg-red-500/10" },
};

const contactTypeLabels: Record<string, { label: string; color: string }> = {
  decision_maker: { label: "Decisor", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  influencer: { label: "Influenciador", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  champion: { label: "Champion", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  blocker: { label: "Blocker", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  end_user: { label: "Utilizador", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  unknown: { label: "Desconhecido", color: "bg-muted text-muted-foreground" },
};

const sourceColors: Record<string, string> = {
  email: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  referral: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  website: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  linkedin: "bg-blue-700/10 text-blue-700 border-blue-700/20",
  event: "bg-pink-500/10 text-pink-600 border-pink-500/20",
};

const nextActionIcons: Record<NextActionType, React.ReactNode> = {
  reply_manual: <Reply className="w-3 h-3" />,
  send_template: <FileSpreadsheet className="w-3 h-3" />,
  create_opportunity: <Target className="w-3 h-3" />,
  activate_automation: <Settings2 className="w-3 h-3" />,
  archive: <Archive className="w-3 h-3" />,
  follow_up: <Clock className="w-3 h-3" />,
  schedule_meeting: <Clock className="w-3 h-3" />,
  nurture: <Mail className="w-3 h-3" />,
};

const nextActionLabels: Record<NextActionType, string> = {
  reply_manual: "Responder manualmente",
  send_template: "Enviar template",
  create_opportunity: "Criar oportunidade",
  activate_automation: "Ativar automação",
  archive: "Arquivar",
  follow_up: "Follow-up",
  schedule_meeting: "Agendar reunião",
  nurture: "Nutrir",
};

export function SmartContactRow({ 
  contact, 
  isSelected, 
  onToggleSelect, 
  onAnalyze,
  isAnalyzing,
  showAdvanced = false 
}: SmartContactRowProps) {
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const tempConfig = temperatureConfig[contact.ai_temperature];
  const typeConfig = contactTypeLabels[contact.ai_contact_type || "unknown"];
  const sourceKey = contact.source?.toLowerCase() || "website";
  const sourceColor = sourceColors[sourceKey] || sourceColors.website;

  const formatSLA = () => {
    if (contact.hoursSinceLastContact === null) return "—";
    if (contact.hoursSinceLastContact < 1) return "Agora";
    if (contact.hoursSinceLastContact < 24) return `${Math.round(contact.hoursSinceLastContact)}h`;
    return `${Math.round(contact.hoursSinceLastContact / 24)}d`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value}`;
  };

  return (
    <TableRow className={cn(
      "group transition-colors",
      isSelected && "bg-muted/50",
      contact.slaBreach && "bg-destructive/5"
    )}>
      {/* Checkbox */}
      <TableCell className="w-[40px]">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>

      {/* Contact Info */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link 
              to={`/dashboard/contacts/${contact.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline truncate block"
            >
              {contact.name}
            </Link>
            {contact.job_title && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                <span className="truncate">{contact.job_title}</span>
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Company */}
      <TableCell>
        {contact.company ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Building2 className="w-3 h-3 text-muted-foreground" />
            <span className="truncate max-w-[120px]">{contact.company}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Source */}
      <TableCell>
        <Badge variant="outline" className={cn("text-xs capitalize", sourceColor)}>
          {contact.source || "Website"}
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
              <p className="text-xs">Classificação automática baseada na intenção</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Score */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      contact.contact_score >= 70 ? "bg-emerald-500" :
                      contact.contact_score >= 40 ? "bg-amber-500" : "bg-muted-foreground"
                    )}
                    style={{ width: `${contact.contact_score}%` }}
                  />
                </div>
                <span className={cn(
                  "text-sm font-medium tabular-nums",
                  contact.contact_score >= 70 ? "text-emerald-600" :
                  contact.contact_score >= 40 ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {contact.contact_score}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Score calculado automaticamente (0-100)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Type */}
      <TableCell>
        <Badge variant="outline" className={cn("text-xs", typeConfig.color)}>
          <UserCheck className="w-3 h-3 mr-1" />
          {typeConfig.label}
        </Badge>
      </TableCell>

      {/* Next Action */}
      <TableCell>
        {contact.ai_next_action ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs">
                  {contact.ai_next_action_type && nextActionIcons[contact.ai_next_action_type] && (
                    <span className="text-primary">
                      {nextActionIcons[contact.ai_next_action_type]}
                    </span>
                  )}
                  <span className="text-muted-foreground truncate max-w-[140px]">
                    {contact.ai_next_action_type && nextActionLabels[contact.ai_next_action_type] 
                      ? nextActionLabels[contact.ai_next_action_type] 
                      : contact.ai_next_action}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">
                  <span className="font-medium">O que faz mais sentido agora:</span><br />
                  {contact.ai_next_action}
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
          contact.slaBreach && "text-destructive font-medium"
        )}>
          {contact.slaBreach && <AlertTriangle className="w-3 h-3" />}
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
              {contact.estimated_value > 0 ? formatCurrency(contact.estimated_value) : "—"}
            </span>
          </TableCell>

          {/* Conversion Probability */}
          <TableCell>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${contact.conversion_probability}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {contact.conversion_probability}%
              </span>
            </div>
          </TableCell>

          {/* Automation */}
          <TableCell>
            {contact.automation_active ? (
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
            {contact.ai_insight ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[180px]">
                      <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="truncate">{contact.ai_insight}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[250px]">
                      <span className="font-medium">Resumo rápido para decidir:</span><br />
                      {contact.ai_insight}
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

          <Link to={`/dashboard/contacts/${contact.id}`}>
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

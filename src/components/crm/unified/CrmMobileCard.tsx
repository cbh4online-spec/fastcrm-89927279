import { Contact } from "@/hooks/useContacts";
import { Opportunity } from "@/hooks/useOpportunities";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Phone, Building2, Trash2, Eye, DollarSign, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ContactMobileCard({ contact, isSelected, onSelect, onClick, onDelete }: ContactCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 space-y-2 active:scale-[0.98] transition-transform",
        isSelected && "ring-2 ring-primary/40 bg-primary/5"
      )}
      onClick={() => onClick(contact.id)}
    >
      {/* Top row: checkbox + name + actions */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(contact.id, checked as boolean)}
            aria-label={`Selecionar ${contact.name}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{contact.name}</p>
          {contact.job_title && (
            <p className="text-xs text-muted-foreground truncate">{contact.job_title}</p>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onClick(contact.id)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(contact.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info rows */}
      <div className="space-y-1 pl-7">
        {contact.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate text-foreground/80">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="text-foreground/80">{contact.phone}</span>
          </div>
        )}
        {contact.company && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate text-foreground/80">{contact.company}</span>
          </div>
        )}
      </div>

      {/* Tags + date */}
      <div className="flex items-center justify-between pl-7">
        <div className="flex flex-wrap gap-1">
          {contact.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {(contact.tags?.length ?? 0) > 2 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{(contact.tags?.length ?? 0) - 2}
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {format(new Date(contact.created_at), "dd MMM", { locale: pt })}
        </span>
      </div>
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  stage?: PipelineStage;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: (id: string) => void;
}

export function OpportunityMobileCard({ opportunity, stage, isSelected, onSelect, onClick }: OpportunityCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 space-y-2 active:scale-[0.98] transition-transform",
        isSelected && "ring-2 ring-primary/40 bg-primary/5"
      )}
      onClick={() => onClick(opportunity.id)}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(opportunity.id, checked as boolean)}
            aria-label={`Selecionar ${opportunity.title}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{opportunity.title}</p>
          {opportunity.lead && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <User className="w-3 h-3" />
              <span className="truncate">{opportunity.lead.name}</span>
            </div>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onClick(opportunity.id)}>
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Value + Stage + Status */}
      <div className="flex items-center justify-between pl-7 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-sm font-bold text-primary">
            <DollarSign className="w-3.5 h-3.5" />
            {Number(opportunity.value).toLocaleString("pt-PT", { minimumFractionDigits: 0 })}
          </span>
          {stage && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: stage.color, color: stage.color }}>
              {stage.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={opportunity.status === "won" ? "default" : opportunity.status === "lost" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
            {opportunity.status === "open" ? "Aberta" : opportunity.status === "won" ? "Ganha" : "Perdida"}
          </Badge>
          {opportunity.expected_close_date && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(opportunity.expected_close_date), "dd MMM", { locale: pt })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

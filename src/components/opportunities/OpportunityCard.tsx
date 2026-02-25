import { useState } from "react";
import { Opportunity, PipelineStage, OPPORTUNITY_SOURCES } from "@/types/opportunity";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  User,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { differenceInDays } from "date-fns";
import { DealScore } from "@/hooks/useDealScores";
import type { CompactDealIntelligence } from "@/types/dealIntelligence";
import { useTranslation } from "react-i18next";
import type { WorkspaceMember } from "@/hooks/useWorkspaceMembers";
import { formatCurrency } from "@/lib/formatters";

interface OpportunityCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
  onClick?: () => void;
  onEdit?: (opp: Opportunity) => void;
  onDelete?: (opp: Opportunity) => void;
  dealScore?: DealScore;
  healthIntelligence?: CompactDealIntelligence;
  stages?: PipelineStage[];
  ownerProfile?: WorkspaceMember["profile"];
}

const sourceColors: Record<string, string> = {
  website: "bg-green-100 text-green-700 border-green-200",
  referral: "bg-purple-100 text-purple-700 border-purple-200",
  email: "bg-blue-100 text-blue-700 border-blue-200",
  social: "bg-pink-100 text-pink-700 border-pink-200",
  phone: "bg-amber-100 text-amber-700 border-amber-200",
  event: "bg-indigo-100 text-indigo-700 border-indigo-200",
  advertising: "bg-cyan-100 text-cyan-700 border-cyan-200",
  partner: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  critical: "text-red-500",
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-green-500",
};

const priorityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

export function OpportunityCard({
  opportunity,
  isDragging,
  onClick,
  onEdit,
  onDelete,
}: OpportunityCardProps) {
  const { t } = useTranslation("crm");
  const { t: tCommon } = useTranslation("common");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const contactName = opportunity.contact?.name || opportunity.lead?.name;
  const companyName = opportunity.company?.name || opportunity.contact?.company;
  const daysAge = differenceInDays(new Date(), new Date(opportunity.created_at));

  const sourceLabel = opportunity.source
    ? OPPORTUNITY_SOURCES.find((s) => s.value === opportunity.source)?.label || opportunity.source
    : null;

  return (
    <motion.div
      animate={isDragging ? {
        scale: 1.05,
        rotate: 2,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
        opacity: 0.8,
      } : {
        scale: 1,
        rotate: 0,
        boxShadow: "0 0px 0px 0px rgba(0,0,0,0)",
        opacity: 1,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className={cn(
          "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-colors group/card",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3 space-y-3 relative">
          {/* Actions menu */}
          {(onEdit || onDelete) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/80 hover:bg-muted shadow-sm">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(opportunity); }}>
                      <Pencil className="w-4 h-4 mr-2" />
                      {tCommon("edit")}
                    </DropdownMenuItem>
                  )}
                  {onEdit && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {tCommon("delete")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Title */}
          <h4 className="font-medium text-foreground text-sm leading-tight truncate pr-6">
            {opportunity.title}
          </h4>

          {/* Deal value */}
          <div>
            <span className="text-[11px] text-muted-foreground">Deal value</span>
            <p className="text-sm text-foreground">
              {Number(opportunity.value) > 0
                ? formatCurrency(Number(opportunity.value), opportunity.currency)
                : <span className="text-muted-foreground italic text-xs">Set Deal value...</span>
              }
            </p>
          </div>

          {/* Associated company */}
          <div>
            <span className="text-[11px] text-muted-foreground">Associated company</span>
            <div className="flex items-center gap-1.5 text-sm text-foreground mt-0.5">
              {companyName ? (
                <>
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{companyName}</span>
                </>
              ) : (
                <span className="text-muted-foreground italic text-xs">—</span>
              )}
            </div>
          </div>

          {/* Associated people */}
          <div>
            <span className="text-[11px] text-muted-foreground">Associated people</span>
            <div className="flex items-center gap-1.5 text-sm text-foreground mt-0.5">
              {contactName ? (
                <>
                  <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{contactName}</span>
                </>
              ) : (
                <span className="text-muted-foreground italic text-xs">—</span>
              )}
            </div>
          </div>

          {/* Deal type / Source */}
          <div>
            <span className="text-[11px] text-muted-foreground">Deal type</span>
            <div className="mt-0.5">
              {sourceLabel ? (
                <Badge
                  variant="outline"
                  className={cn("text-[11px] px-2 py-0.5 h-5", sourceColors[opportunity.source!] || sourceColors.other)}
                >
                  {sourceLabel}
                </Badge>
              ) : (
                <span className="text-muted-foreground italic text-xs">—</span>
              )}
            </div>
          </div>

          {/* Priority Level */}
          <div>
            <span className="text-[11px] text-muted-foreground">Priority Level</span>
            <p className={cn(
              "text-sm font-medium mt-0.5",
              opportunity.priority_level
                ? priorityColors[opportunity.priority_level] || "text-foreground"
                : "text-muted-foreground italic text-xs"
            )}>
              {opportunity.priority_level
                ? priorityLabels[opportunity.priority_level] || opportunity.priority_level
                : "—"
              }
            </p>
          </div>

          {/* Activity icons footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex items-center gap-0.5 text-[11px]">
                <FileText className="w-3 h-3" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-0.5 text-[11px]">
                <Mail className="w-3 h-3" />
                <span>0</span>
              </div>
              <div className="flex items-center gap-0.5 text-[11px]">
                <MessageSquare className="w-3 h-3" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{daysAge}d</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon("confirmDeleteDescription")} "{opportunity.title}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(opportunity)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

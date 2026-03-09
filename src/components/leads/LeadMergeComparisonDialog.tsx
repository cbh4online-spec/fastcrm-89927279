import { useState, useMemo } from "react";
import { DuplicateGroup, useMergeLeads } from "@/hooks/useLeadDuplicateEngine";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Merge, AlertTriangle, Loader2, CheckCircle2, User, Mail, Phone,
  Building2, Globe, Hash, MapPin, Tag, FileText, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: DuplicateGroup;
}

interface FieldConfig {
  key: string;
  label: string;
  category: string;
  icon: typeof User;
}

const FIELD_CONFIGS: FieldConfig[] = [
  // Identity
  { key: "name", label: "Nome", category: "Identidade", icon: User },
  { key: "email", label: "Email", category: "Contacto", icon: Mail },
  { key: "phone", label: "Telefone", category: "Contacto", icon: Phone },
  { key: "fax", label: "Fax", category: "Contacto", icon: Phone },
  { key: "external_email", label: "Email externo", category: "Contacto", icon: Mail },
  // Company
  { key: "company_name", label: "Empresa", category: "Empresa", icon: Building2 },
  { key: "company_status", label: "Estado empresa", category: "Empresa", icon: Building2 },
  { key: "tax_id", label: "NIF", category: "Empresa", icon: Hash },
  { key: "website", label: "Website", category: "Empresa", icon: Globe },
  { key: "business_category", label: "Categoria", category: "Empresa", icon: Building2 },
  // Location
  { key: "city", label: "Cidade", category: "Localização", icon: MapPin },
  { key: "address", label: "Morada", category: "Localização", icon: MapPin },
  { key: "postal_code", label: "Código postal", category: "Localização", icon: MapPin },
  { key: "region", label: "Região", category: "Localização", icon: MapPin },
  // Lead info
  { key: "source", label: "Fonte", category: "Lead Info", icon: Zap },
  { key: "status", label: "Estado", category: "Lead Info", icon: Tag },
  { key: "estimated_value", label: "Valor estimado", category: "Lead Info", icon: Hash },
  { key: "conversion_probability", label: "Prob. conversão", category: "Lead Info", icon: Hash },
  { key: "assigned_to", label: "Atribuído a", category: "Lead Info", icon: User },
  // Social
  { key: "linkedin_url", label: "LinkedIn", category: "Social", icon: Globe },
  { key: "facebook_url", label: "Facebook", category: "Social", icon: Globe },
  { key: "instagram_url", label: "Instagram", category: "Social", icon: Globe },
  // AI
  { key: "ai_temperature", label: "Temperatura IA", category: "IA", icon: Zap },
  { key: "lead_score", label: "Score IA", category: "IA", icon: Zap },
  { key: "ai_next_action", label: "Próxima ação IA", category: "IA", icon: Zap },
  { key: "ai_insight", label: "Insight IA", category: "IA", icon: Zap },
];

export function LeadMergeComparisonDialog({ open, onOpenChange, group }: Props) {
  const mergeMutation = useMergeLeads();
  const [showConfirm, setShowConfirm] = useState(false);

  const leads = useMemo(() => group.items.map(i => i.lead).filter(Boolean), [group]);
  const masterItem = group.items.find(i => i.is_master_candidate) || group.items[0];

  // Track which lead's value is selected for each field
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const fc of FIELD_CONFIGS) {
      // Default: prefer master's non-empty value, then first non-empty
      const masterVal = leads.find(l => l.id === masterItem.lead_id)?.[fc.key];
      if (masterVal != null && masterVal !== "") {
        init[fc.key] = masterItem.lead_id;
      } else {
        const other = leads.find(l => l.id !== masterItem.lead_id && l[fc.key] != null && l[fc.key] !== "");
        if (other) init[fc.key] = other.id;
      }
    }
    return init;
  });

  const [selectedMaster, setSelectedMaster] = useState(masterItem.lead_id);

  const selectField = (fieldKey: string, leadId: string) => {
    setSelections(prev => ({ ...prev, [fieldKey]: leadId }));
  };

  // Group fields by category
  const categories = useMemo(() => {
    const cats = new Map<string, FieldConfig[]>();
    for (const fc of FIELD_CONFIGS) {
      // Only show fields that have data in at least one lead
      const hasData = leads.some(l => l[fc.key] != null && l[fc.key] !== "");
      if (!hasData) continue;
      const arr = cats.get(fc.category) || [];
      arr.push(fc);
      cats.set(fc.category, arr);
    }
    return cats;
  }, [leads]);

  // Compute merge summary
  const summary = useMemo(() => {
    const allTags = new Set<string>();
    let notesCount = 0;
    let totalRelations = 0;

    leads.forEach(l => {
      (l.tags || []).forEach((t: string) => allTags.add(t));
      if (l.notes?.trim()) notesCount++;
      totalRelations += (l._relatedCounts?.opportunities || 0) + (l._relatedCounts?.conversations || 0);
    });

    return {
      leadsCount: leads.length,
      tagsCount: allTags.size,
      notesCount,
      totalRelations,
      selectedMasterName: leads.find(l => l.id === selectedMaster)?.name || "—",
    };
  }, [leads, selectedMaster]);

  const handleConfirmMerge = async () => {
    const mergedIds = leads.filter(l => l.id !== selectedMaster).map(l => l.id);
    await mergeMutation.mutateAsync({
      master_lead_id: selectedMaster,
      merged_lead_ids: mergedIds,
      field_selections: selections,
      group_id: group.id,
    });
    setShowConfirm(false);
    onOpenChange(false);
  };

  const getFinalValue = (fieldKey: string) => {
    const sourceId = selections[fieldKey];
    if (!sourceId) return null;
    return leads.find(l => l.id === sourceId)?.[fieldKey];
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Merge Comparison — {leads.length} Leads
            </DialogTitle>
            <DialogDescription>
              Selecione o valor preferido para cada campo. O resultado final é mostrado na coluna "Merged".
            </DialogDescription>
          </DialogHeader>

          {/* Master Selection */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Master:</span>
            {leads.map(l => (
              <Button
                key={l.id}
                variant={selectedMaster === l.id ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedMaster(l.id)}
              >
                {l.name}
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {Array.from(categories).map(([category, fields]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1">
                    {fields.map(fc => {
                      const Icon = fc.icon;
                      return (
                        <div key={fc.key} className="grid grid-cols-[140px_1fr_1fr_1fr] gap-2 items-center text-xs py-1.5 px-2 rounded hover:bg-muted/30">
                          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                            <Icon className="h-3 w-3" />
                            {fc.label}
                          </div>
                          {leads.slice(0, 2).map(lead => {
                            const val = lead[fc.key];
                            const isSelected = selections[fc.key] === lead.id;
                            const displayVal = val != null && val !== "" ? String(val) : "—";
                            return (
                              <button
                                key={lead.id}
                                className={cn(
                                  "text-left p-1.5 rounded border transition-colors truncate",
                                  isSelected
                                    ? "border-primary bg-primary/5 text-foreground"
                                    : "border-transparent hover:border-border text-muted-foreground"
                                )}
                                onClick={() => val != null && val !== "" && selectField(fc.key, lead.id)}
                                disabled={val == null || val === ""}
                              >
                                {displayVal}
                              </button>
                            );
                          })}
                          {/* Final value */}
                          <div className="p-1.5 text-foreground font-medium truncate">
                            {getFinalValue(fc.key) != null ? String(getFinalValue(fc.key)) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Separator className="mt-2" />
                </div>
              ))}

              {/* List fields summary */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Campos combinados (união automática)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg border border-border/50">
                    <span className="text-muted-foreground">Tags preservadas:</span>
                    <span className="font-medium ml-1">{summary.tagsCount}</span>
                  </div>
                  <div className="p-2 rounded-lg border border-border/50">
                    <span className="text-muted-foreground">Notas preservadas:</span>
                    <span className="font-medium ml-1">{summary.notesCount}</span>
                  </div>
                  <div className="p-2 rounded-lg border border-border/50">
                    <span className="text-muted-foreground">Relações migradas:</span>
                    <span className="font-medium ml-1">{summary.totalRelations}</span>
                  </div>
                  <div className="p-2 rounded-lg border border-border/50">
                    <span className="text-muted-foreground">Owner final:</span>
                    <span className="font-medium ml-1">{summary.selectedMasterName}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              Esta ação consolidará os registos preservando toda a informação histórica.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={() => setShowConfirm(true)} className="gap-1.5">
                <Merge className="h-4 w-4" />
                Confirmar Merge
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar Merge de Leads
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vai fundir <strong>{summary.leadsCount - 1}</strong> lead(s) em{" "}
                <strong>{summary.selectedMasterName}</strong>.
              </p>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-sm">
                <p>• <strong>{summary.leadsCount}</strong> leads a fundir</p>
                <p>• <strong>{summary.tagsCount}</strong> tags preservadas</p>
                <p>• <strong>{summary.notesCount}</strong> notas preservadas</p>
                <p>• <strong>{summary.totalRelations}</strong> relações migradas</p>
                <p>• Owner final: <strong>{summary.selectedMasterName}</strong></p>
              </div>
              <p className="text-sm text-warning font-medium">
                Os registos duplicados serão marcados como inativos (soft delete).
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mergeMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMerge} disabled={mergeMutation.isPending}>
              {mergeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

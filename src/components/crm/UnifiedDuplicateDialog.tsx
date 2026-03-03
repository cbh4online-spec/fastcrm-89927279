import { useState } from "react";
import { useContactDuplicateGroups, DuplicateGroup as ContactDuplicateGroup, ContactWithRelations } from "@/hooks/useContactDuplicateGroups";
import { useContactMerge } from "@/hooks/useContactMerge";
import { useLeadDuplicateGroups, LeadDuplicateGroup, LeadWithRelations } from "@/hooks/useLeadDuplicateGroups";
import { useLeadMerge } from "@/hooks/useLeadMerge";
import { useCompanyDuplicateGroups, CompanyDuplicateGroup, CompanyWithRelations } from "@/hooks/useCompanyDuplicateGroups";
import { useCompanyMerge } from "@/hooks/useCompanyMerge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Users, Mail, Phone, Building2, Calendar, FileText, MessageSquare, Target,
  Loader2, CheckCircle2, AlertTriangle, Merge, Globe, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

type EntityType = "contacts" | "leads" | "companies";

interface UnifiedDuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
}

const entityConfig = {
  contacts: {
    icon: Users,
    title: "Gestão de Duplicados — Contactos",
    description: "Analise e funda contactos duplicados para manter a base de dados limpa.",
    entityLabel: "contactos",
    entityLabelSingular: "contacto",
    emptyMessage: "A sua base de contactos está limpa!",
  },
  leads: {
    icon: Target,
    title: "Gestão de Duplicados — Leads",
    description: "Analise e funda leads duplicados para manter a base de dados limpa.",
    entityLabel: "leads",
    entityLabelSingular: "lead",
    emptyMessage: "A sua base de leads está limpa!",
  },
  companies: {
    icon: Building2,
    title: "Gestão de Duplicados — Empresas",
    description: "Analise e funda empresas duplicadas para manter a base de dados limpa.",
    entityLabel: "empresas",
    entityLabelSingular: "empresa",
    emptyMessage: "A sua base de empresas está limpa!",
  },
};

const matchTypeLabels: Record<string, (similarity: number) => string> = {
  email: () => "Email igual",
  phone: () => "Telefone igual",
  name_similarity: (s) => `Nome similar (${Math.round(s * 100)}%)`,
  domain: () => "Domínio igual",
  tax_id: () => "NIF igual",
  email_domain: () => "Domínio de email igual",
};

const matchTypeColors: Record<string, string> = {
  email: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  phone: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  name_similarity: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  domain: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  tax_id: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  email_domain: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

interface GenericGroup {
  id: string;
  matchType: string;
  matchValue: string;
  similarity: number;
  items: GenericItem[];
}

interface GenericItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  tax_id?: string | null;
  created_at: string;
  relatedCounts: Record<string, number>;
}

function normalizeGroups(entityType: EntityType, contactGroups: ContactDuplicateGroup[], leadGroups: LeadDuplicateGroup[], companyGroups: CompanyDuplicateGroup[]): GenericGroup[] {
  if (entityType === "contacts") {
    return contactGroups.map(g => ({
      id: g.id, matchType: g.matchType, matchValue: g.matchValue, similarity: g.similarity,
      items: g.contacts.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company, created_at: c.created_at, relatedCounts: c.relatedCounts as any })),
    }));
  }
  if (entityType === "leads") {
    return leadGroups.map(g => ({
      id: g.id, matchType: g.matchType, matchValue: g.matchValue, similarity: g.similarity,
      items: g.leads.map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, company: (l as any).company_name, created_at: l.created_at, relatedCounts: l.relatedCounts as any })),
    }));
  }
  return companyGroups.map(g => ({
    id: g.id, matchType: g.matchType, matchValue: g.matchValue, similarity: g.similarity,
    items: g.companies.map(c => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, website: c.website, tax_id: c.tax_id, created_at: c.created_at, relatedCounts: c.relatedCounts as any })),
  }));
}

function DuplicateGroupCard({
  group, entityType, onMerge,
}: {
  group: GenericGroup;
  entityType: EntityType;
  onMerge: (primaryId: string, duplicateIds: string[]) => void;
}) {
  const [selectedPrimary, setSelectedPrimary] = useState<string>(group.items[0]?.id || "");
  const [showConfirm, setShowConfirm] = useState(false);
  const config = entityConfig[entityType];

  const handleMerge = () => {
    const duplicateIds = group.items.filter(c => c.id !== selectedPrimary).map(c => c.id);
    onMerge(selectedPrimary, duplicateIds);
    setShowConfirm(false);
  };

  const getTotalRelations = (item: GenericItem) => Object.values(item.relatedCounts).reduce((s, v) => s + v, 0);

  const relationIcons: Record<string, { icon: typeof Target; label: string }> = {
    opportunities: { icon: Target, label: "Oportunidades" },
    proposals: { icon: FileText, label: "Propostas" },
    invoices: { icon: FileText, label: "Faturas" },
    meetings: { icon: Calendar, label: "Reuniões" },
    conversations: { icon: MessageSquare, label: "Conversas" },
    profiles: { icon: Users, label: "Perfis" },
    contacts: { icon: Users, label: "Contactos" },
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <config.icon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{group.items[0]?.name}</span>
            <Badge className={cn("text-xs", matchTypeColors[group.matchType] || matchTypeColors.name_similarity)}>
              {(matchTypeLabels[group.matchType] || (() => group.matchType))(group.similarity)}
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">
            {group.items.length} {config.entityLabel}
          </Badge>
        </div>

        <RadioGroup value={selectedPrimary} onValueChange={setSelectedPrimary} className="space-y-2">
          {group.items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                selectedPrimary === item.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
              )}
            >
              <RadioGroupItem value={item.id} id={item.id} className="mt-1" />
              <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {index === 0 && <Badge variant="secondary" className="text-[10px]">Sugerido</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {item.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{item.email}</span>}
                      {item.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.phone}</span>}
                      {item.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{item.company}</span>}
                      {item.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{item.website}</span>}
                      {item.tax_id && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{item.tax_id}</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Criado: {format(new Date(item.created_at), "d MMM yyyy", { locale: pt })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getTotalRelations(item) > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        {Object.entries(item.relatedCounts).map(([key, count]) => {
                          if (count === 0) return null;
                          const ri = relationIcons[key];
                          if (!ri) return null;
                          const Icon = ri.icon;
                          return (
                            <span key={key} className="flex items-center gap-1" title={ri.label}>
                              <Icon className="w-3 h-3" />{count}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-end gap-2 mt-4">
          <Button size="sm" onClick={() => setShowConfirm(true)} className="gap-2">
            <Merge className="w-4 h-4" />
            Fundir em "{group.items.find(c => c.id === selectedPrimary)?.name}"
          </Button>
        </div>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar fusão de {config.entityLabel}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta acção irá fundir {group.items.length - 1} {config.entityLabelSingular}(s) em{" "}
                <strong>{group.items.find(c => c.id === selectedPrimary)?.name}</strong>.
              </p>
              <p className="text-sm">
                Todas as referências serão migradas para o registo principal.
                Os registos duplicados serão eliminados permanentemente.
              </p>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Esta acção não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge}>Confirmar Fusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function UnifiedDuplicateDialog({ open, onOpenChange, entityType }: UnifiedDuplicateDialogProps) {
  const config = entityConfig[entityType];
  const Icon = config.icon;

  // Hooks — all called unconditionally
  const contactGroups = useContactDuplicateGroups();
  const contactMerge = useContactMerge();
  const leadGroups = useLeadDuplicateGroups();
  const leadMerge = useLeadMerge();
  const companyGroups = useCompanyDuplicateGroups();
  const companyMerge = useCompanyMerge();

  const isLoading = entityType === "contacts" ? contactGroups.isLoading : entityType === "leads" ? leadGroups.isLoading : companyGroups.isLoading;
  const refetch = entityType === "contacts" ? contactGroups.refetch : entityType === "leads" ? leadGroups.refetch : companyGroups.refetch;

  const groups = normalizeGroups(
    entityType,
    contactGroups.data || [],
    leadGroups.data || [],
    companyGroups.data || [],
  );

  const handleMerge = async (primaryId: string, duplicateIds: string[]) => {
    if (entityType === "contacts") {
      await contactMerge.mutateAsync({ primaryContactId: primaryId, duplicateContactIds: duplicateIds });
    } else if (entityType === "leads") {
      await leadMerge.mutateAsync({ primaryLeadId: primaryId, duplicateLeadIds: duplicateIds });
    } else {
      await companyMerge.mutateAsync({ primaryCompanyId: primaryId, duplicateCompanyIds: duplicateIds });
    }
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <h3 className="font-medium text-lg">Nenhum duplicado encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">{config.emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-muted-foreground">
                Encontrados <strong>{groups.length}</strong> grupos de possíveis duplicados
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Atualizar</Button>
            </div>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {groups.map(group => (
                  <DuplicateGroupCard key={group.id} group={group} entityType={entityType} onMerge={handleMerge} />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

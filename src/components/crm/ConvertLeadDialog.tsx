import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, User, Building2, Briefcase, Loader2, CheckCircle2, Database } from "lucide-react";
import { toast } from "sonner";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeleteLead, Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";

type ConversionTarget = "contact" | "company";
type EntityType = "consumidor_final" | "eni" | "empresa";

interface ConvertLeadDialogProps {
  lead: Lead;
  trigger?: React.ReactNode;
}

const TARGET_OPTIONS = [
  {
    value: "contact" as ConversionTarget,
    label: "Contacto",
    description: "Pessoa singular ou ENI",
    icon: User,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    value: "company" as ConversionTarget,
    label: "Empresa",
    description: "Empresa, Lda ou SA",
    icon: Building2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

const ENTITY_TYPE_OPTIONS: Record<ConversionTarget, { value: EntityType; label: string }[]> = {
  contact: [
    { value: "consumidor_final", label: "Consumidor Final" },
    { value: "eni", label: "Empresário em Nome Individual (ENI)" },
  ],
  company: [
    { value: "empresa", label: "Empresa (Lda/SA)" },
  ],
};

export function ConvertLeadDialog({ lead, trigger }: ConvertLeadDialogProps) {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { createContact } = useContacts();
  const { createCompany } = useCompanies();
  const deleteLead = useDeleteLead();

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ConversionTarget>("contact");
  const [entityType, setEntityType] = useState<EntityType>("consumidor_final");
  const [deleteAfterConversion, setDeleteAfterConversion] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  const handleTargetChange = (value: ConversionTarget) => {
    setTarget(value);
    // Set default entity type for new target
    setEntityType(ENTITY_TYPE_OPTIONS[value][0].value);
  };

  const migrateLeadHistory = async (leadId: string, targetId: string, targetType: ConversionTarget) => {
    const contactUpdate = targetType === "contact" ? { contact_id: targetId } : {};
    const companyUpdate = targetType === "company" ? { company_id: targetId } : {};
    const entityUpdate = { ...contactUpdate, ...companyUpdate };

    // Tables that have both contact_id and company_id
    const tablesWithBothIds = [
      "conversations",
      "crm_activities",
      "calendar_events",
      "meetings",
      "opportunities",
      "invoices",
      "form_submissions",
      "client_entitlements",
      "client_requirements",
      "fastcrm_proposals",
    ];

    // Tables that only have contact_id (only migrate for contact conversion)
    const tablesContactOnly = [
      "conversation_followups",
      "conversation_journey",
      "conversation_sessions",
      "conversation_signals",
      "lead_behavior_signals",
      "product_signals",
      "template_usage_events",
      "inbox_action_logs",
      "inbox_smart_alerts",
      "marketing_recipients",
      "marketing_subscriptions",
    ];

    const migrationPromises: Array<Promise<unknown>> = [];

    // Helper to execute supabase query and convert to real Promise
    const migrate = (table: string, updateData: Record<string, string>) => {
      return new Promise<unknown>(async (resolve, reject) => {
        try {
          const { error } = await (supabase.from(table as any) as any)
            .update(updateData)
            .eq("lead_id", leadId);
          if (error) {
            console.warn(`Migration warning for ${table}:`, error.message);
          }
          resolve({ table, error });
        } catch (e) {
          console.warn(`Migration error for ${table}:`, e);
          resolve({ table, error: e }); // resolve anyway to not block
        }
      });
    };

    // Migrate tables with both ids
    for (const table of tablesWithBothIds) {
      migrationPromises.push(migrate(table, entityUpdate));
    }

    // Migrate contact-only tables when converting to contact
    if (targetType === "contact") {
      for (const table of tablesContactOnly) {
        migrationPromises.push(migrate(table, { contact_id: targetId }));
      }
    }

    const results = await Promise.allSettled(migrationPromises);
    const failures = results.filter(r => r.status === "rejected");
    if (failures.length > 0) {
      console.warn(`${failures.length} migration(s) failed:`, failures);
    }
    return { total: results.length, failed: failures.length };
  };

  const handleConvert = async () => {
    setIsConverting(true);
    setMigrationStatus(null);

    try {
      let newEntityId: string | undefined;

      setMigrationStatus("A criar registo...");

      if (target === "contact") {
        const result = await createContact.mutateAsync({
          name: lead.name,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          tags: lead.tags || undefined,
          notes: (lead as any).notes || undefined,
          source: (lead as any).source || undefined,
          linkedin_url: lead.linkedin_url || undefined,
          facebook_url: lead.facebook_url || undefined,
          instagram_url: lead.instagram_url || undefined,
          twitter_url: lead.twitter_url || undefined,
          lifecycle_stage: 'lead',
        } as any);
        newEntityId = result.id;
      } else {
        const result = await createCompany.mutateAsync({
          name: lead.name,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          tags: lead.tags || undefined,
          notes: (lead as any).notes || undefined,
          linkedin_url: lead.linkedin_url || undefined,
          facebook_url: lead.facebook_url || undefined,
          instagram_url: lead.instagram_url || undefined,
          twitter_url: lead.twitter_url || undefined,
          entity_type: "empresa",
        });
        newEntityId = result.id;
      }

      if (!newEntityId) throw new Error("Falha ao criar registo");

      // Migrate all relational history
      setMigrationStatus("A migrar histórico...");
      const migrationResult = await migrateLeadHistory(lead.id, newEntityId, target);

      // Delete lead if requested
      if (deleteAfterConversion) {
        setMigrationStatus("A finalizar...");
        await deleteLead.mutateAsync(lead.id);
      }

      const migrationNote = migrationResult.failed > 0
        ? ` (${migrationResult.failed} tabela(s) com aviso)`
        : "";

      toast.success(
        `Lead convertido em ${target === "contact" ? "contacto" : "empresa"} com sucesso!`,
        {
          description: `Histórico migrado${migrationNote}. ${deleteAfterConversion ? "Lead original removido." : "Lead original mantido."}`,
        }
      );

      // Emit LEAD.CONVERTED kernel event
      if (currentWorkspace?.id && newEntityId) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'LEAD.CONVERTED',
          entity_kind: 'lead',
          entity_id: lead.id,
          source_module: 'crm-leads',
          payload: {
            target_type: target,
            target_id: newEntityId,
            delete_after: deleteAfterConversion,
          },
        });
        console.log('[LEADS] Lead converted:', lead.id, '→', target, newEntityId);
      }

      setOpen(false);

      if (newEntityId) {
        const path = target === "contact" 
          ? `/dashboard/contacts/${newEntityId}`
          : `/dashboard/companies/${newEntityId}`;
        navigate(path);
      }
    } catch (error) {
      console.error("Error converting lead:", error);
      toast.error("Erro ao converter lead. Tente novamente.");
    } finally {
      setIsConverting(false);
      setMigrationStatus(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="default" className="gap-2">
            <ArrowRight className="w-4 h-4" />
            Converter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            Converter Lead
          </DialogTitle>
          <DialogDescription>
            Transforme este lead em contacto ou empresa, preservando todos os dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lead Preview */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{lead.name}</p>
                <p className="text-sm text-muted-foreground">
                  {lead.email || lead.phone || "Sem contacto"}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">Lead</Badge>
            </div>
          </div>

          {/* Target Selection */}
          <div className="space-y-3">
            <Label>Converter para</Label>
            <div className="grid grid-cols-2 gap-3">
              {TARGET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTargetChange(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                    target === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn("p-3 rounded-full", option.bgColor)}>
                    <option.icon className={cn("w-6 h-6", option.color)} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {target === option.value && (
                    <CheckCircle2 className="w-5 h-5 text-primary absolute top-2 right-2" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Entity Type Selection */}
          <div className="space-y-3">
            <Label>Tipo de entidade</Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPE_OPTIONS[target].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.value === "eni" && <Briefcase className="w-4 h-4 text-amber-500" />}
                      {option.value === "consumidor_final" && <User className="w-4 h-4 text-emerald-500" />}
                      {option.value === "empresa" && <Building2 className="w-4 h-4 text-blue-500" />}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delete Lead Option */}
          <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
            <Checkbox
              id="delete-lead"
              checked={deleteAfterConversion}
              onCheckedChange={(checked) => setDeleteAfterConversion(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="delete-lead" className="cursor-pointer font-medium">
                Eliminar lead após conversão
              </Label>
              <p className="text-xs text-muted-foreground">
                O lead original será removido após a conversão bem sucedida.
              </p>
            </div>
          </div>

          {/* Data Transfer Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Dados a transferir:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Nome: {lead.name}</li>
              {lead.email && <li>Email: {lead.email}</li>}
              {lead.phone && <li>Telefone: {lead.phone}</li>}
              {lead.tags?.length ? <li>Tags: {lead.tags.join(", ")}</li> : null}
              {lead.source && <li>Fonte: {lead.source}</li>}
              {(lead as any).notes && <li>Notas</li>}
            </ul>
            <div className="mt-2 flex items-center gap-1.5 text-primary">
              <Database className="w-3.5 h-3.5" />
              <span className="font-medium">Todo o histórico será preservado</span>
            </div>
            <p className="text-muted-foreground/70">
              Conversas, atividades, reuniões, oportunidades, faturas e outros dados serão automaticamente migrados.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isConverting}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={isConverting} className="gap-2">
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {migrationStatus || "A converter..."}
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Converter para {target === "contact" ? "Contacto" : "Empresa"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

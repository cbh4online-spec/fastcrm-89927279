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
import { ArrowRight, User, Building2, Briefcase, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeleteLead, Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

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
  const { createContact } = useContacts();
  const { createCompany } = useCompanies();
  const deleteLead = useDeleteLead();

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ConversionTarget>("contact");
  const [entityType, setEntityType] = useState<EntityType>("consumidor_final");
  const [deleteAfterConversion, setDeleteAfterConversion] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  const handleTargetChange = (value: ConversionTarget) => {
    setTarget(value);
    // Set default entity type for new target
    setEntityType(ENTITY_TYPE_OPTIONS[value][0].value);
  };

  const handleConvert = async () => {
    setIsConverting(true);

    try {
      let newEntityId: string | undefined;

      if (target === "contact") {
        // Create contact with lead data
        const result = await createContact.mutateAsync({
          name: lead.name,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          tags: lead.tags || undefined,
          linkedin_url: lead.linkedin_url || undefined,
          facebook_url: lead.facebook_url || undefined,
          instagram_url: lead.instagram_url || undefined,
          twitter_url: lead.twitter_url || undefined,
          lifecycle_stage: 'lead',
        } as any);
        newEntityId = result.id;
      } else {
        // Create company with lead data
        const result = await createCompany.mutateAsync({
          name: lead.name,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          tags: lead.tags || undefined,
          linkedin_url: lead.linkedin_url || undefined,
          facebook_url: lead.facebook_url || undefined,
          instagram_url: lead.instagram_url || undefined,
          twitter_url: lead.twitter_url || undefined,
          entity_type: "empresa",
        });
        newEntityId = result.id;
      }

      // Delete lead if requested
      if (deleteAfterConversion) {
        await deleteLead.mutateAsync(lead.id);
      }

      toast.success(
        `Lead convertido em ${target === "contact" ? "contacto" : "empresa"} com sucesso!`,
        {
          description: deleteAfterConversion 
            ? "O lead original foi removido." 
            : "O lead original foi mantido.",
        }
      );

      setOpen(false);

      // Navigate to the new entity
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
            </ul>
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
                A converter...
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

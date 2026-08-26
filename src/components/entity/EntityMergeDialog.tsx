import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Merge } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContactMerge } from "@/hooks/useContactMerge";
import { useCompanyMerge } from "@/hooks/useCompanyMerge";
import { useLeadMerge } from "@/hooks/useLeadMerge";

export type MergeEntityType = "contact" | "company" | "lead";

export interface MergeRecord {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  is_blocked?: boolean | null;
  archived_at?: string | null;
  [key: string]: unknown;
}

const FIELDS: Record<MergeEntityType, { key: string; label: string }[]> = {
  contact: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "company", label: "Empresa" },
    { key: "job_title", label: "Cargo" },
    { key: "tax_id", label: "NIF" },
    { key: "notes", label: "Notas" },
  ],
  company: [
    { key: "tax_id", label: "NIF" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "website", label: "Website" },
    { key: "industry", label: "Setor" },
    { key: "address", label: "Morada" },
  ],
  lead: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "company_name", label: "Empresa" },
    { key: "source", label: "Origem" },
    { key: "city", label: "Cidade" },
  ],
};

const LABELS: Record<MergeEntityType, { singular: string; plural: string }> = {
  contact: { singular: "contacto", plural: "contactos" },
  company: { singular: "empresa", plural: "empresas" },
  lead: { singular: "lead", plural: "leads" },
};

function completeness(record: MergeRecord, entity: MergeEntityType) {
  return FIELDS[entity].filter((f) => {
    const v = record[f.key];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
}

function display(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  const str = String(value);
  return str.length > 60 ? `${str.slice(0, 60)}…` : str;
}

interface EntityMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: MergeEntityType;
  records: MergeRecord[];
  onMerged?: () => void;
}

export function EntityMergeDialog({ open, onOpenChange, entity, records, onMerged }: EntityMergeDialogProps) {
  const contactMerge = useContactMerge();
  const companyMerge = useCompanyMerge();
  const leadMerge = useLeadMerge();

  const labels = LABELS[entity];
  const fields = FIELDS[entity];

  const defaultPrimary = useMemo(() => {
    if (records.length === 0) return "";
    const sorted = [...records].sort((a, b) => {
      const diff = completeness(b, entity) - completeness(a, entity);
      if (diff !== 0) return diff;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
    return sorted[0].id;
  }, [records, entity]);

  const [primaryId, setPrimaryId] = useState(defaultPrimary);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) {
      setPrimaryId(defaultPrimary);
      setConfirming(false);
    }
  }, [open, defaultPrimary]);

  const primary = records.find((r) => r.id === primaryId);
  const secondaries = records.filter((r) => r.id !== primaryId);

  const inherited = useMemo(() => {
    if (!primary) return [] as { label: string; value: string; from: string }[];
    const out: { label: string; value: string; from: string }[] = [];
    for (const f of fields) {
      const current = primary[f.key];
      if (current !== null && current !== undefined && String(current).trim() !== "") continue;
      for (const s of secondaries) {
        const v = s[f.key];
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          out.push({ label: f.label, value: display(v), from: s.name || s.id });
          break;
        }
      }
    }
    return out;
  }, [primary, secondaries, fields]);

  const anyBlocked = records.some((r) => !!r.is_blocked);
  const isPending = contactMerge.isPending || companyMerge.isPending || leadMerge.isPending;

  const handleMerge = async () => {
    if (!primary || secondaries.length === 0) return;
    const duplicateIds = secondaries.map((s) => s.id);
    try {
      if (entity === "contact") {
        await contactMerge.mutateAsync({ primaryContactId: primary.id, duplicateContactIds: duplicateIds });
      } else if (entity === "company") {
        await companyMerge.mutateAsync({ primaryCompanyId: primary.id, duplicateCompanyIds: duplicateIds });
      } else {
        await leadMerge.mutateAsync({ primaryLeadId: primary.id, duplicateLeadIds: duplicateIds });
      }
      onMerged?.();
      onOpenChange(false);
    } catch {
      // erros já reportados pelos hooks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Fundir {labels.plural}
          </DialogTitle>
          <DialogDescription>
            Escolha o registo principal. Os restantes são eliminados e os seus dados e relações passam para o principal.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="space-y-4">
            <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="space-y-2">
              {records.map((r) => (
                <label
                  key={r.id}
                  htmlFor={`merge-primary-${r.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    r.id === primaryId ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40",
                  )}
                >
                  <RadioGroupItem value={r.id} id={`merge-primary-${r.id}`} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{r.name || "(sem nome)"}</span>
                      {r.id === primaryId && <Badge variant="default">Principal</Badge>}
                      {r.is_blocked && <Badge variant="destructive">Bloqueado</Badge>}
                      {r.archived_at && <Badge variant="secondary">Arquivado</Badge>}
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
                      {fields.map((f) => (
                        <span key={f.key} className="truncate">
                          {f.label}: {display(r[f.key])}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>

            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-medium">Dados herdados pelo principal</p>
              {inherited.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  O registo principal já tem todos os campos preenchidos — nenhum valor será herdado.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {inherited.map((i) => (
                    <li key={i.label}>
                      <span className="font-medium text-foreground">{i.label}:</span> {i.value}{" "}
                      <span className="opacity-70">(de {i.from})</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                As tags são unidas e as notas dos registos secundários são anexadas às notas do principal.
                Oportunidades, propostas, faturas e conversas passam para o principal.
              </p>
            </div>

            {anyBlocked && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Existem registos bloqueados na seleção. Confirme o estado de bloqueio do registo principal após a fusão.
                </AlertDescription>
              </Alert>
            )}

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {secondaries.length} {secondaries.length === 1 ? labels.singular : labels.plural} será(ão) eliminado(s)
                definitivamente. Esta ação é irreversível.
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          {!confirming ? (
            <Button onClick={() => setConfirming(true)} disabled={records.length < 2 || !primary}>
              <Merge className="mr-2 h-4 w-4" />
              Fundir {records.length} registos
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleMerge} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar fusão
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Trash2, Pencil, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// TYPES
// ============================================================================

interface ExtractionTemplate {
  id: string;
  workspace_id: string;
  template_name: string;
  document_type: string;
  extraction_schema: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SchemaField {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "array";
  description: string;
  required: boolean;
}

const DOCUMENT_TYPES = [
  { value: "invoice", label: "Factura" },
  { value: "contract", label: "Contrato" },
  { value: "proposal", label: "Proposta" },
  { value: "receipt", label: "Recibo" },
  { value: "report", label: "Relatório" },
  { value: "form", label: "Formulário" },
  { value: "letter", label: "Carta" },
  { value: "id_document", label: "Documento ID" },
  { value: "certificate", label: "Certificado" },
  { value: "other", label: "Outro" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((t) => [t.value, t.label])
);

// ============================================================================
// HOOK
// ============================================================================

function useExtractionTemplates() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const QK = ["extraction-templates", currentWorkspace?.id];

  const query = useQuery({
    queryKey: QK,
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase
        .from("document_extraction_templates" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as ExtractionTemplate[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (template: {
      template_name: string;
      document_type: string;
      extraction_schema: Record<string, unknown>;
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { error } = await (supabase
        .from("document_extraction_templates" as any)
        .insert({
          workspace_id: currentWorkspace.id,
          ...template,
          is_active: true,
        } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      toast.success("Template criado");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("document_extraction_templates" as any)
        .delete()
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      toast.success("Template eliminado");
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    createTemplate: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteTemplate: deleteMutation.mutate,
  };
}

// ============================================================================
// CREATE DIALOG
// ============================================================================

function CreateTemplateDialog({
  open,
  onClose,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (t: {
    template_name: string;
    document_type: string;
    extraction_schema: Record<string, unknown>;
  }) => Promise<unknown>;
  isCreating: boolean;
}) {
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("invoice");
  const [fields, setFields] = useState<SchemaField[]>([
    { name: "", type: "string", description: "", required: true },
  ]);

  const addField = () =>
    setFields([...fields, { name: "", type: "string", description: "", required: false }]);

  const removeField = (i: number) => setFields(fields.filter((_, idx) => idx !== i));

  const updateField = (i: number, patch: Partial<SchemaField>) =>
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Nome obrigatório");
    const validFields = fields.filter((f) => f.name.trim());
    if (validFields.length === 0) return toast.error("Adicione pelo menos um campo");

    const schema: Record<string, unknown> = {
      fields: validFields.map((f) => ({
        name: f.name,
        type: f.type,
        description: f.description,
        required: f.required,
      })),
    };

    await onCreate({ template_name: name, document_type: docType, extraction_schema: schema });
    onClose();
    setName("");
    setDocType("invoice");
    setFields([{ name: "", type: "string", description: "", required: true }]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Criar Template de Extracção</DialogTitle>
          <DialogDescription>
            Defina os campos que pretende extrair automaticamente de um tipo de documento.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Template</Label>
                <Input
                  placeholder="ex: Factura Fornecedor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Documento</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Campos a Extrair</Label>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addField}>
                  <Plus className="h-3 w-3 mr-1" /> Campo
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Nome do campo"
                        value={field.name}
                        onChange={(e) => updateField(i, { name: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(v) => updateField(i, { type: v as SchemaField["type"] })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">Texto</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                          <SelectItem value="boolean">Sim/Não</SelectItem>
                          <SelectItem value="array">Lista</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Descrição (opcional)"
                        value={field.description}
                        onChange={(e) => updateField(i, { description: e.target.value })}
                        className="h-8 text-xs col-span-2"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeField(i)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isCreating}>
            {isCreating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Criar Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExtractionTemplatesTab() {
  const { templates, isLoading, createTemplate, isCreating, deleteTemplate } =
    useExtractionTemplates();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Templates definem quais campos são extraídos automaticamente por tipo de documento.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Sem templates</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie um template para definir campos de extracção por tipo de documento
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence>
            {templates.map((tmpl) => {
              const schema = tmpl.extraction_schema as { fields?: SchemaField[] } | null;
              const fieldCount = schema?.fields?.length ?? 0;

              return (
                <motion.div
                  key={tmpl.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="group hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold truncate">{tmpl.template_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {TYPE_LABELS[tmpl.document_type] || tmpl.document_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {fieldCount} {fieldCount === 1 ? "campo" : "campos"}
                            </span>
                          </div>
                          {schema?.fields && schema.fields.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {schema.fields.slice(0, 5).map((f, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {f.name}
                                  <span className="text-muted-foreground ml-1">{f.type}</span>
                                </Badge>
                              ))}
                              {schema.fields.length > 5 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  +{schema.fields.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTemplate(tmpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <CreateTemplateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createTemplate}
        isCreating={isCreating}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Sparkles, Save, FileText, Loader2, GripVertical,
  ChevronDown, ChevronRight, Settings2, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Spec {
  id?: string;
  spec_key: string;
  spec_value: string;
  unit: string;
  spec_group: string;
  display_order: number;
  isNew?: boolean;
}

const DEFAULT_GROUPS = [
  "Técnico", "Dimensional", "Elétrico", "Óptico", "Rede",
  "Ambiental", "Certificações", "Performance", "Geral",
];

interface ProductSpecsTabProps {
  product: any;
}

export function ProductSpecsTab({ product }: ProductSpecsTabProps) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [extractText, setExtractText] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Fetch specs
  const { data: savedSpecs, isLoading } = useQuery({
    queryKey: ["product-specs", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_spec_attributes" as any)
        .select("*")
        .eq("product_id", product.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!product.id,
  });

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["spec-templates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spec_attribute_templates" as any)
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (savedSpecs) {
      setSpecs(savedSpecs.map((s: any) => ({
        id: s.id,
        spec_key: s.spec_key,
        spec_value: s.spec_value,
        unit: s.unit || "",
        spec_group: s.spec_group || "Geral",
        display_order: s.display_order || 0,
      })));
      // Open all groups by default
      const groups = new Set(savedSpecs.map((s: any) => s.spec_group || "Geral"));
      setOpenGroups(Object.fromEntries([...groups].map(g => [g, true])));
      setHasChanges(false);
    }
  }, [savedSpecs]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");

      // Delete all existing specs for this product
      await supabase
        .from("product_spec_attributes" as any)
        .delete()
        .eq("product_id", product.id);

      // Insert all current specs
      if (specs.length > 0) {
        const rows = specs.map((s, i) => ({
          workspace_id: workspaceId,
          product_id: product.id,
          spec_key: s.spec_key,
          spec_value: s.spec_value,
          unit: s.unit || null,
          spec_group: s.spec_group || "Geral",
          display_order: i,
        }));

        const { error } = await supabase
          .from("product_spec_attributes" as any)
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-specs", product.id] });
      setHasChanges(false);
      toast.success("Especificações guardadas");
    },
    onError: () => toast.error("Erro ao guardar"),
  });

  // AI extract mutation
  const extractMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-extract-specs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            product_id: product.id,
            mode: "extract-from-text",
            text,
            product_name: product.name,
            category: product.category,
          }),
        }
      );
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Erro IA");
      }
      return res.json() as any;
    },
    onSuccess: (data) => {
      const extracted = Array.isArray(data.data) ? data.data : [];
      if (extracted.length === 0) {
        toast.info("Nenhuma especificação encontrada no texto");
        return;
      }
      const newSpecs: Spec[] = extracted.map((s: any, i: number) => ({
        spec_key: s.spec_key || "",
        spec_value: s.spec_value || "",
        unit: s.unit || "",
        spec_group: s.spec_group || "Geral",
        display_order: specs.length + i,
        isNew: true,
      }));
      setSpecs(prev => [...prev, ...newSpecs]);
      setHasChanges(true);
      setExtractDialogOpen(false);
      setExtractText("");
      // Open new groups
      const newGroups = new Set(newSpecs.map(s => s.spec_group));
      setOpenGroups(prev => {
        const updated = { ...prev };
        newGroups.forEach(g => { updated[g] = true; });
        return updated;
      });
      toast.success(`${extracted.length} especificações extraídas`);
    },
    onError: (e: any) => {
      if (e.message?.includes("429")) toast.error("Limite IA excedido, tente mais tarde");
      else if (e.message?.includes("402")) toast.error("Créditos IA insuficientes");
      else toast.error(e.message || "Erro ao extrair especificações");
    },
  });

  // AI suggest mutation
  const suggestMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-extract-specs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
            mode: "suggest-specs",
            product_name: product.name,
            product_description: product.short_description || product.commercial_description,
            category: product.category,
            existing_specs: specs.map(s => s.spec_key),
          }),
        }
      );
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Erro IA");
      }
      return res.json() as any;
    },
    onSuccess: (data) => {
      const suggested = Array.isArray(data.data) ? data.data : [];
      if (suggested.length === 0) {
        toast.info("Sem sugestões adicionais");
        return;
      }
      const newSpecs: Spec[] = suggested.map((s: any, i: number) => ({
        spec_key: s.spec_key || "",
        spec_value: s.spec_value || "",
        unit: s.unit || "",
        spec_group: s.spec_group || "Geral",
        display_order: specs.length + i,
        isNew: true,
      }));
      setSpecs(prev => [...prev, ...newSpecs]);
      setHasChanges(true);
      const newGroups = new Set(newSpecs.map(s => s.spec_group));
      setOpenGroups(prev => {
        const updated = { ...prev };
        newGroups.forEach(g => { updated[g] = true; });
        return updated;
      });
      toast.success(`${suggested.length} specs sugeridas`);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao sugerir"),
  });

  // Apply template
  const applyTemplate = (template: any) => {
    const keys = template.spec_keys || [];
    const newSpecs: Spec[] = keys.map((k: any, i: number) => ({
      spec_key: k.key || k,
      spec_value: "",
      unit: k.unit || "",
      spec_group: k.group || "Geral",
      display_order: specs.length + i,
      isNew: true,
    }));
    setSpecs(prev => [...prev, ...newSpecs]);
    setHasChanges(true);
    setTemplateDialogOpen(false);
    toast.success(`Template "${template.template_name}" aplicado`);
  };

  // Helpers
  const addSpec = (group = "Geral") => {
    setSpecs(prev => [...prev, {
      spec_key: "",
      spec_value: "",
      unit: "",
      spec_group: group,
      display_order: prev.length,
      isNew: true,
    }]);
    setHasChanges(true);
    setOpenGroups(prev => ({ ...prev, [group]: true }));
  };

  const removeSpec = (index: number) => {
    setSpecs(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateSpec = (index: number, field: keyof Spec, value: string) => {
    setSpecs(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setHasChanges(true);
  };

  // Group specs
  const grouped = specs.reduce<Record<string, { spec: Spec; globalIndex: number }[]>>((acc, spec, index) => {
    const group = spec.spec_group || "Geral";
    if (!acc[group]) acc[group] = [];
    acc[group].push({ spec, globalIndex: index });
    return acc;
  }, {});

  const groupNames = Object.keys(grouped).sort((a, b) => {
    const ai = DEFAULT_GROUPS.indexOf(a);
    const bi = DEFAULT_GROUPS.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => addSpec()}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Spec
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExtractDialogOpen(true)}
        >
          <FileText className="h-4 w-4 mr-1" />
          Extrair de Texto
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => suggestMutation.mutate()}
          disabled={suggestMutation.isPending}
        >
          {suggestMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-1" />
          )}
          Sugerir IA
        </Button>
        {templates && templates.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTemplateDialogOpen(true)}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Templates
          </Button>
        )}

        <div className="flex-1" />

        {hasChanges && (
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Guardar
          </Button>
        )}
      </div>

      {/* Empty state */}
      {specs.length === 0 && (
        <Card className="p-8 text-center">
          <Settings2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-1">
            Sem especificações técnicas
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Adicione manualmente, extraia de uma ficha técnica ou use a IA para sugerir.
          </p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" onClick={() => addSpec()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => suggestMutation.mutate()}
              disabled={suggestMutation.isPending}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Sugerir IA
            </Button>
          </div>
        </Card>
      )}

      {/* Grouped specs */}
      {groupNames.map((groupName) => (
        <Collapsible
          key={groupName}
          open={openGroups[groupName] !== false}
          onOpenChange={(open) =>
            setOpenGroups((prev) => ({ ...prev, [groupName]: open }))
          }
        >
          <Card className="overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2">
                  {openGroups[groupName] !== false ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{groupName}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {grouped[groupName].length}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    addSpec(groupName);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="divide-y">
                {grouped[groupName].map(({ spec, globalIndex }) => (
                  <div
                    key={globalIndex}
                    className="flex items-center gap-2 px-4 py-2"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                    <Input
                      placeholder="Nome"
                      value={spec.spec_key}
                      onChange={(e) => updateSpec(globalIndex, "spec_key", e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      placeholder="Valor"
                      value={spec.spec_value}
                      onChange={(e) => updateSpec(globalIndex, "spec_value", e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      placeholder="Un."
                      value={spec.unit}
                      onChange={(e) => updateSpec(globalIndex, "unit", e.target.value)}
                      className="w-16 h-8 text-sm"
                    />
                    <Select
                      value={spec.spec_group}
                      onValueChange={(v) => updateSpec(globalIndex, "spec_group", v)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_GROUPS.map((g) => (
                          <SelectItem key={g} value={g} className="text-xs">
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => removeSpec(globalIndex)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      {/* Extract from text dialog */}
      <Dialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Extrair Especificações de Ficha Técnica
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cole o texto da ficha técnica (datasheet) e a IA irá extrair automaticamente as especificações.
            </p>
            <Textarea
              placeholder="Cole aqui o texto da ficha técnica..."
              value={extractText}
              onChange={(e) => setExtractText(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtractDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => extractMutation.mutate(extractText)}
              disabled={!extractText.trim() || extractMutation.isPending}
            >
              {extractMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Extrair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Templates de Especificações</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {templates?.map((t: any) => (
              <Card
                key={t.id}
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => applyTemplate(t)}
              >
                <p className="text-sm font-medium">{t.template_name}</p>
                {t.category && (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {t.category}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {(t.spec_keys || []).length} campos
                </p>
              </Card>
            ))}
            {(!templates || templates.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sem templates. Crie templates nas definições da categoria.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

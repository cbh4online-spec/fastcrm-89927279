import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Globe, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useCompanyEnrichment, EnrichmentResult, EnrichmentField } from "@/hooks/useCompanyEnrichment";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
}

interface EnrichCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  onEnrichmentApplied: (fields: Record<string, unknown>) => void;
}

interface FieldSuggestion {
  fieldKey: string;
  fieldLabel: string;
  currentValue: string | null | undefined;
  suggestedValue: string;
  confidence: "high" | "medium" | "low";
  source: string;
  isCritical: boolean;
  selected: boolean;
}

const FIELD_MAPPING: Record<string, { label: string; dbKey: string; isCritical: boolean }> = {
  industry: { label: "Setor", dbKey: "industry", isCritical: false },
  size: { label: "Dimensão", dbKey: "size", isCritical: false },
  phone: { label: "Telefone", dbKey: "phone", isCritical: false },
  email: { label: "Email", dbKey: "email", isCritical: false },
  address: { label: "Morada", dbKey: "address", isCritical: false },
  description: { label: "Descrição", dbKey: "notes", isCritical: false },
  website: { label: "Website", dbKey: "website", isCritical: false },
};

const SOCIAL_MAPPING: Record<string, { label: string; dbKey: string }> = {
  linkedin: { label: "LinkedIn", dbKey: "linkedin_url" },
  instagram: { label: "Instagram", dbKey: "instagram_url" },
  facebook: { label: "Facebook", dbKey: "facebook_url" },
  twitter: { label: "Twitter/X", dbKey: "twitter_url" },
};

function getConfidenceColor(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "low":
      return "bg-red-500/10 text-red-600 border-red-500/20";
  }
}

function getConfidenceLabel(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "Alta confiança";
    case "medium":
      return "Média confiança";
    case "low":
      return "Baixa confiança";
  }
}

export function EnrichCompanyDialog({
  open,
  onOpenChange,
  company,
  onEnrichmentApplied,
}: EnrichCompanyDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const enrichMutation = useCompanyEnrichment();
  
  const [step, setStep] = useState<"idle" | "loading" | "review" | "applying">("idle");
  const [progress, setProgress] = useState(0);
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null);

  useEffect(() => {
    if (open) {
      setStep("idle");
      setProgress(0);
      setSuggestions([]);
      setEnrichmentResult(null);
    }
  }, [open]);

  const startEnrichment = async () => {
    // Now we can enrich with just the company name
    if (!company.name) {
      toast.error("A empresa precisa ter um nome para enriquecer dados");
      return;
    }

    setStep("loading");
    setProgress(10);

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const result = await enrichMutation.mutateAsync({
        website: company.website || undefined,
        email: company.email || undefined,
        companyName: company.name,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!result) {
        toast.error("Não foi possível obter dados de enriquecimento");
        setStep("idle");
        return;
      }

      setEnrichmentResult(result);

      // Build suggestions list
      const newSuggestions: FieldSuggestion[] = [];

      // Process regular fields
      Object.entries(FIELD_MAPPING).forEach(([key, mapping]) => {
        const enrichedField = result[key as keyof EnrichmentResult] as EnrichmentField | undefined;
        if (enrichedField?.value) {
          const currentValue = company[mapping.dbKey as keyof Company] as string | null | undefined;
          const hasCurrentValue = currentValue && currentValue.trim() !== "";
          
          newSuggestions.push({
            fieldKey: mapping.dbKey,
            fieldLabel: mapping.label,
            currentValue,
            suggestedValue: enrichedField.value,
            confidence: enrichedField.confidence,
            source: enrichedField.source,
            isCritical: mapping.isCritical,
            // Pre-select if empty and not critical
            selected: !hasCurrentValue && !mapping.isCritical,
          });
        }
      });

      // Process social links
      if (result.socialLinks) {
        Object.entries(SOCIAL_MAPPING).forEach(([key, mapping]) => {
          const socialUrl = result.socialLinks?.[key as keyof typeof result.socialLinks];
          if (socialUrl) {
            const currentValue = company[mapping.dbKey as keyof Company] as string | null | undefined;
            const hasCurrentValue = currentValue && currentValue.trim() !== "";
            
            newSuggestions.push({
              fieldKey: mapping.dbKey,
              fieldLabel: mapping.label,
              currentValue,
              suggestedValue: socialUrl,
              confidence: "medium",
              source: "website links",
              isCritical: false,
              selected: !hasCurrentValue,
            });
          }
        });
      }

      setSuggestions(newSuggestions);
      setStep("review");

      if (newSuggestions.length === 0) {
        toast.info("Não foram encontrados novos dados para esta empresa");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Enrichment error:", error);
      toast.error("Erro ao enriquecer dados");
      setStep("idle");
    }
  };

  const toggleSuggestion = (index: number) => {
    setSuggestions((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, selected: !s.selected } : s
      )
    );
  };

  const selectAll = () => {
    setSuggestions((prev) =>
      prev.map((s) => ({ ...s, selected: !s.isCritical }))
    );
  };

  const deselectAll = () => {
    setSuggestions((prev) =>
      prev.map((s) => ({ ...s, selected: false }))
    );
  };

  const applySelectedFields = async () => {
    const selectedSuggestions = suggestions.filter((s) => s.selected);
    
    if (selectedSuggestions.length === 0) {
      toast.warning("Selecione pelo menos um campo para aplicar");
      return;
    }

    setStep("applying");

    try {
      // Build the update object
      const fieldsToApply: Record<string, string> = {};
      selectedSuggestions.forEach((s) => {
        fieldsToApply[s.fieldKey] = s.suggestedValue;
      });

      // Update the company
      const { error: updateError } = await supabase
        .from("companies")
        .update(fieldsToApply)
        .eq("id", company.id);

      if (updateError) throw updateError;

      // Log the enrichment
      if (currentWorkspace) {
        const { data: userData } = await supabase.auth.getUser();
        
        const fieldsSuggested: Record<string, { value: string; confidence: string }> = {};
        suggestions.forEach((s) => {
          fieldsSuggested[s.fieldKey] = {
            value: s.suggestedValue,
            confidence: s.confidence,
          };
        });
        
        await supabase.from("company_enrichment_logs").insert([{
          company_id: company.id,
          workspace_id: currentWorkspace.id,
          enriched_by: userData.user?.id || "",
          source: company.website || company.email || "unknown",
          fields_suggested: fieldsSuggested as unknown as Record<string, never>,
          fields_applied: fieldsToApply as unknown as Record<string, never>,
        }]);
      }

      toast.success(`${selectedSuggestions.length} campo(s) atualizado(s) com sucesso`);
      onEnrichmentApplied(fieldsToApply);
      onOpenChange(false);
    } catch (error) {
      console.error("Error applying enrichment:", error);
      toast.error("Erro ao aplicar alterações");
      setStep("review");
    }
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enriquecer Dados da Empresa
          </DialogTitle>
          <DialogDescription>
            {company.website || company.email 
              ? "Analise o website da empresa para obter informações adicionais"
              : "Use IA para pesquisar informações sobre a empresa"
            }
          </DialogDescription>
        </DialogHeader>

        {step === "idle" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Globe className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{company.name}</p>
                <p className="text-sm text-muted-foreground">
                  {company.website || company.email || "Pesquisa por nome da empresa"}
                </p>
              </div>
            </div>

            {company.website || company.email ? (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-600 rounded-lg">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm">
                  Vamos analisar o website para encontrar informações como setor, telefone, redes sociais e mais
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-600 rounded-lg">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm">
                  Sem website disponível. Vamos usar IA para pesquisar informações públicas sobre "{company.name}"
                </p>
              </div>
            )}

            <Button
              onClick={startEnrichment}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Iniciar Análise
            </Button>
          </div>
        )}

        {step === "loading" && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                A analisar {company.website || company.email}...
              </p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {suggestions.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <XCircle className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Não foram encontrados novos dados para esta empresa
                </p>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {suggestions.length} campo(s) encontrado(s)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Limpar seleção
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.fieldKey}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          suggestion.selected
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/30 border-transparent"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={suggestion.selected}
                            onCheckedChange={() => toggleSuggestion(index)}
                            disabled={suggestion.isCritical}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">
                                {suggestion.fieldLabel}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  getConfidenceColor(suggestion.confidence)
                                )}
                              >
                                {getConfidenceLabel(suggestion.confidence)}
                              </Badge>
                            </div>

                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground w-16">Atual:</span>
                                <span className={cn(
                                  suggestion.currentValue 
                                    ? "text-foreground" 
                                    : "text-muted-foreground italic"
                                )}>
                                  {suggestion.currentValue || "(vazio)"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground w-16">Sugerido:</span>
                                <ArrowRight className="h-3 w-3 text-primary" />
                                <span className="text-primary font-medium truncate">
                                  {suggestion.suggestedValue}
                                </span>
                              </div>
                            </div>

                            {suggestion.currentValue && !suggestion.isCritical && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
                                <AlertTriangle className="h-3 w-3" />
                                Já tem valor - validação recomendada
                              </div>
                            )}

                            {suggestion.isCritical && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                                <XCircle className="h-3 w-3" />
                                Campo crítico - não pode ser alterado automaticamente
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="font-medium">{selectedCount}</span> de{" "}
                    <span className="font-medium">{suggestions.length}</span> campos
                    selecionados
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={applySelectedFields}
                      disabled={selectedCount === 0}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aplicar Selecionados
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === "applying" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              A aplicar alterações...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

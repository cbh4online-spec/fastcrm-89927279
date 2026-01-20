import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Wrench,
  Sparkles,
  Loader2,
  Calculator,
  Info,
  Euro,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface LaborRate {
  id: string;
  name: string;
  hourly_rate: number;
  is_default: boolean;
}

interface LaborConfigEditorProps {
  laborHours: number;
  laborHourlyRate: number | null;
  laborIncludedInPrice: boolean;
  laborNotes: string;
  onChange: (config: {
    laborHours: number;
    laborHourlyRate: number | null;
    laborIncludedInPrice: boolean;
    laborNotes: string;
  }) => void;
  productName?: string;
  productCategory?: string;
  productType?: string;
}

export function LaborConfigEditor({
  laborHours,
  laborHourlyRate,
  laborIncludedInPrice,
  laborNotes,
  onChange,
  productName,
  productCategory,
  productType,
}: LaborConfigEditorProps) {
  const [isOpen, setIsOpen] = useState(laborHours > 0 || !!laborHourlyRate);
  const [laborRates, setLaborRates] = useState<LaborRate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    hours: number;
    rate: number;
    rationale: string;
  } | null>(null);
  const { currentWorkspace } = useWorkspace();

  // Load workspace labor rates
  useEffect(() => {
    const loadLaborRates = async () => {
      if (!currentWorkspace?.id) return;
      setIsLoadingRates(true);
      try {
        const { data, error } = await supabase
          .from("workspace_labor_rates")
          .select("*")
          .eq("workspace_id", currentWorkspace.id)
          .eq("is_active", true)
          .order("is_default", { ascending: false });

        if (error) throw error;
        setLaborRates(data || []);

        // Set default rate if no rate is set
        if (!laborHourlyRate && data && data.length > 0) {
          const defaultRate = data.find((r) => r.is_default) || data[0];
          onChange({
            laborHours,
            laborHourlyRate: defaultRate.hourly_rate,
            laborIncludedInPrice,
            laborNotes,
          });
        }
      } catch (error) {
        console.error("Error loading labor rates:", error);
      } finally {
        setIsLoadingRates(false);
      }
    };

    if (isOpen) {
      loadLaborRates();
    }
  }, [currentWorkspace?.id, isOpen]);

  // Open if there's labor config
  useEffect(() => {
    if (laborHours > 0 || laborHourlyRate) {
      setIsOpen(true);
    }
  }, [laborHours, laborHourlyRate]);

  const handleSelectRate = (rateId: string) => {
    const rate = laborRates.find((r) => r.id === rateId);
    if (rate) {
      onChange({
        laborHours,
        laborHourlyRate: rate.hourly_rate,
        laborIncludedInPrice,
        laborNotes,
      });
    }
  };

  const handleAiSuggest = async () => {
    if (!productName) {
      toast.error("Insira o nome do produto/serviço primeiro");
      return;
    }

    setIsAiSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "suggest-labor-estimate",
        {
          body: {
            productName,
            productCategory,
            productType,
            existingRates: laborRates,
          },
        }
      );

      if (error) throw error;

      if (data?.suggestion) {
        setAiSuggestion(data.suggestion);
        // Auto-apply suggestion
        onChange({
          laborHours: data.suggestion.hours,
          laborHourlyRate: data.suggestion.rate,
          laborIncludedInPrice,
          laborNotes: laborNotes || data.suggestion.rationale,
        });
        toast.success("Sugestão de IA aplicada!");
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast.error("Erro ao obter sugestão de IA");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const laborTotal = (laborHours || 0) * (laborHourlyRate || 0);
  const hasLaborConfig = laborHours > 0 && laborHourlyRate;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            Mão de Obra
            {hasLaborConfig && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {laborHours}h × €{laborHourlyRate}/h = €{laborTotal.toFixed(2)}
              </Badge>
            )}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        {/* AI Suggestion Button */}
        <Card className="p-3 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sugestão de IA</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleAiSuggest}
              disabled={isAiSuggesting || !productName}
            >
              {isAiSuggesting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Sugerir Tempo e Valor
                </>
              )}
            </Button>
          </div>
          {aiSuggestion && (
            <div className="mt-2 p-2 bg-background rounded text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Sugestão: {aiSuggestion.hours}h × €{aiSuggestion.rate}/h
              </p>
              <p>{aiSuggestion.rationale}</p>
            </div>
          )}
        </Card>

        {/* Labor Hours Input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Tempo de Trabalho (horas)
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={laborHours || ""}
              onChange={(e) =>
                onChange({
                  laborHours: parseFloat(e.target.value) || 0,
                  laborHourlyRate,
                  laborIncludedInPrice,
                  laborNotes,
                })
              }
              placeholder="0"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Euro className="h-3 w-3" />
              Valor/Hora (€)
            </Label>
            <div className="flex gap-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={laborHourlyRate || ""}
                onChange={(e) =>
                  onChange({
                    laborHours,
                    laborHourlyRate: parseFloat(e.target.value) || null,
                    laborIncludedInPrice,
                    laborNotes,
                  })
                }
                placeholder="0.00"
                className="h-9 flex-1"
              />
              {laborRates.length > 0 && (
                <Select onValueChange={handleSelectRate}>
                  <SelectTrigger className="h-9 w-auto">
                    <TrendingUp className="h-3 w-3" />
                  </SelectTrigger>
                  <SelectContent>
                    {laborRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.name} - €{rate.hourly_rate}/h
                        {rate.is_default && " (padrão)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Total Calculation */}
        {hasLaborConfig && (
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Mão de Obra</span>
              </div>
              <span className="text-lg font-bold text-primary">
                €{laborTotal.toFixed(2)}
              </span>
            </div>
          </Card>
        )}

        {/* Include in Price Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm cursor-pointer">
                      Incluir no preço do produto
                    </Label>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    <strong>Ativo:</strong> O valor da mão de obra será incluído
                    no preço total do produto na proposta.
                  </p>
                  <p className="mt-1">
                    <strong>Desativo:</strong> A mão de obra aparecerá como
                    linha separada na proposta.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            checked={laborIncludedInPrice}
            onCheckedChange={(checked) =>
              onChange({
                laborHours,
                laborHourlyRate,
                laborIncludedInPrice: checked,
                laborNotes,
              })
            }
          />
        </div>

        {/* Display mode preview */}
        {hasLaborConfig && (
          <Card className="p-3 border-dashed">
            <p className="text-xs text-muted-foreground mb-2">
              Apresentação na proposta:
            </p>
            {laborIncludedInPrice ? (
              <div className="text-sm">
                <span className="font-medium">Preço único</span> - O custo de
                mão de obra (€{laborTotal.toFixed(2)}) está incluído no preço
                final
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Produto/Serviço</span>
                  <span>€XX,XX</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>
                    Mão de Obra ({laborHours}h × €{laborHourlyRate}/h)
                  </span>
                  <span>€{laborTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total</span>
                  <span>€XX,XX + €{laborTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs">Notas sobre mão de obra</Label>
          <Textarea
            value={laborNotes}
            onChange={(e) =>
              onChange({
                laborHours,
                laborHourlyRate,
                laborIncludedInPrice,
                laborNotes: e.target.value,
              })
            }
            placeholder="Detalhes sobre instalação, configuração, deslocação..."
            rows={2}
            className="text-sm"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

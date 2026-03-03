import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, TrendingUp, Shield, TrendingDown, Settings, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface AISuggestion {
  type: "upsell" | "risk_mitigation" | "downgrade" | "optimization";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  cta_label: string;
  cta_action: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof TrendingUp; label: string; color: string }> = {
  upsell: { icon: TrendingUp, label: "Upsell", color: "text-green-600" },
  risk_mitigation: { icon: Shield, label: "Risco", color: "text-red-600" },
  downgrade: { icon: TrendingDown, label: "Downgrade", color: "text-orange-600" },
  optimization: { icon: Settings, label: "Otimização", color: "text-blue-600" },
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

interface RenewalAISuggestionsProps {
  contractId: string;
  riskLevel?: string | null;
  reasonsJson?: { reasons?: string[]; suggested_action?: string } | null;
  healthScore: number;
}

export function RenewalAISuggestions({ contractId, riskLevel, reasonsJson, healthScore }: RenewalAISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  const generateSuggestions = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("renewals-ai-suggestions", {
        body: { contract_id: contractId },
      });
      if (error) throw error;
      return data?.suggestions || [];
    },
    onSuccess: (data) => {
      setSuggestions(data);
      if (data.length === 0) toast.info("Sem sugestões para este contrato");
    },
    onError: (e: any) => {
      console.error(e);
      toast.error("Erro ao gerar sugestões IA");
    },
  });

  const RISK_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    low: { label: "Baixo", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
    medium: { label: "Médio", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
    high: { label: "Alto", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  };

  const risk = RISK_CONFIG[riskLevel || "low"] || RISK_CONFIG.low;
  const reasons = reasonsJson?.reasons || [];
  const suggestedAction = reasonsJson?.suggested_action;

  return (
    <div className="space-y-4">
      {/* Risk & Reasons Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${risk.color}`} />
            Nível de Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={`${risk.bgColor} ${risk.color} border-0`}>
              {risk.label}
            </Badge>
            <span className="text-sm text-muted-foreground">Score: {healthScore}/100</span>
          </div>
          {reasons.length > 0 && (
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {r}
                </li>
              ))}
            </ul>
          )}
          {suggestedAction && (
            <p className="text-sm font-medium text-primary">
              Ação sugerida: {suggestedAction}
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Sugestões IA
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateSuggestions.mutate()}
              disabled={generateSuggestions.isPending}
            >
              {generateSuggestions.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              Gerar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Clica em "Gerar" para obter sugestões IA baseadas nos dados do contrato
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s, i) => {
                const config = TYPE_CONFIG[s.type] || TYPE_CONFIG.optimization;
                const Icon = config.icon;
                return (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                        <span className="text-sm font-medium">{s.title}</span>
                      </div>
                      <Badge className={`text-[10px] border-0 shrink-0 ${PRIORITY_BADGE[s.priority] || ""}`}>
                        {s.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      {s.cta_label}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

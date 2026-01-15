import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  CalendarPlus,
  FileText,
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useCompanyInsights } from "@/hooks/useCompanyEnrichment";
import { Company } from "@/hooks/useCompanies";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface CompanyInsightsPanelProps {
  company: Company;
  onCreateOpportunity?: () => void;
  onCreateTask?: () => void;
  onSendTemplate?: () => void;
  onGenerateProposal?: () => void;
}

interface CompanyInsight {
  summary: string[];
  fitScore: number;
  fitExplanation: string;
  suggestedActions: Array<{
    type: "opportunity" | "task" | "template" | "proposal";
    label: string;
    priority: "high" | "medium" | "low";
  }>;
  warnings: Array<{
    type: "missing_contact" | "no_website" | "duplicate" | "stale_data";
    message: string;
  }>;
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/20"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className={getScoreColor(score)}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-2xl font-bold", getScoreColor(score))}>{score}</span>
      </div>
    </div>
  );
}

export function CompanyInsightsPanel({
  company,
  onCreateOpportunity,
  onCreateTask,
  onSendTemplate,
  onGenerateProposal,
}: CompanyInsightsPanelProps) {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<CompanyInsight | null>(null);
  const generateInsights = useCompanyInsights();

  useEffect(() => {
    // Auto-generate insights on mount
    generateInsights.mutate(company.id, {
      onSuccess: (data) => setInsights(data),
    });
  }, [company.id]);

  const handleRefresh = () => {
    generateInsights.mutate(company.id, {
      onSuccess: (data) => setInsights(data),
    });
  };

  const handleAction = (type: string) => {
    switch (type) {
      case "opportunity":
        onCreateOpportunity?.();
        break;
      case "task":
        onCreateTask?.();
        break;
      case "template":
        onSendTemplate?.();
        break;
      case "proposal":
        onGenerateProposal?.();
        break;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "opportunity":
        return <Target className="w-4 h-4" />;
      case "task":
        return <CalendarPlus className="w-4 h-4" />;
      case "template":
        return <Mail className="w-4 h-4" />;
      case "proposal":
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-600 border-red-200";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      case "low":
        return "bg-green-500/10 text-green-600 border-green-200";
      default:
        return "";
    }
  };

  if (generateInsights.isPending && !insights) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Insights IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Insights IA
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={generateInsights.isPending}
            className="h-8"
          >
            <RefreshCw className={cn("w-4 h-4", generateInsights.isPending && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score and Summary */}
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={insights.fitScore} />
            <span className="text-xs text-muted-foreground text-center">Fit Score</span>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">{insights.fitExplanation}</p>
            <ul className="space-y-1">
              {insights.summary.map((point, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Warnings */}
        {insights.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-4 h-4" />
              Atenção
            </h4>
            <div className="flex flex-wrap gap-2">
              {insights.warnings.map((warning, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-yellow-500/10 text-yellow-700 border-yellow-300"
                >
                  {warning.message}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Actions */}
        {insights.suggestedActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Próximos passos sugeridos
            </h4>
            <div className="flex flex-wrap gap-2">
              {insights.suggestedActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(action.type)}
                  className={cn("gap-2", getPriorityColor(action.priority))}
                >
                  {getActionIcon(action.type)}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

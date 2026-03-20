import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Sparkles, ChevronDown, ExternalLink, FlaskConical,
  History, Check, X, AlertTriangle, Lightbulb, Target
} from "lucide-react";
import {
  type SourceData, type DeviceData, type SectionData, type StatsEvent,
  type ImprovementCard, type ABTestSuggestion, type FunnelHealthScore,
  computeFunnelHealthScore, generateImprovementCards, generateABTests,
} from "./statsHelpers";

interface OptimizationDrawerProps {
  templateSlug: string;
  conversionRate: number;
  bounceRate: number;
  sources: SourceData[];
  devices: DeviceData[];
  sections: SectionData[];
  events: StatsEvent[];
}

interface HistoryItem {
  cardId: string;
  status: "implemented" | "dismissed";
  date: string;
}

function getStorageKey(slug: string) {
  return `funnel-optimization-${slug}`;
}

function loadHistory(slug: string): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(slug)) || "[]");
  } catch { return []; }
}

function saveHistory(slug: string, items: HistoryItem[]) {
  localStorage.setItem(getStorageKey(slug), JSON.stringify(items));
}

// ── Health Score Circle ──

function HealthScoreCircle({ health }: { health: FunnelHealthScore }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health.score / 100) * circumference;
  const color = health.score >= 71 ? "hsl(160, 70%, 40%)" : health.score >= 41 ? "hsl(40, 90%, 55%)" : "hsl(0, 70%, 55%)";
  const colorClass = health.score >= 71 ? "text-emerald-400" : health.score >= 41 ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" opacity="0.2" />
          <circle
            cx="64" cy="64" r={radius} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold tabular-nums ${colorClass}`}>{health.score}</span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="text-xs font-medium text-muted-foreground">Saúde do Funil</p>
      <div className="flex gap-3 text-[11px]">
        {health.criticals > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Críticos {health.criticals}
          </span>
        )}
        {health.improvements > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> A Melhorar {health.improvements}
          </span>
        )}
        {health.good > 0 && (
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Bom {health.good}
          </span>
        )}
      </div>
      {/* Breakdown bars */}
      <div className="w-full space-y-2 mt-2">
        {health.breakdown.map(b => (
          <div key={b.label} className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{b.label} ({b.weight}%)</span>
              <span className="tabular-nums">{b.score}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${b.score}%`,
                  backgroundColor: b.score >= 70 ? "hsl(160, 70%, 40%)" : b.score >= 40 ? "hsl(40, 90%, 55%)" : "hsl(0, 70%, 55%)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Improvement Card ──

function ImprovementCardUI({ card }: { card: ImprovementCard }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const priorityConfig = {
    critical: { label: "CRÍTICO", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    important: { label: "IMPORTANTE", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    suggested: { label: "SUGERIDO", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  };

  const effortConfig = {
    low: { label: "Baixo", className: "text-emerald-400" },
    medium: { label: "Médio", className: "text-amber-400" },
    high: { label: "Alto", className: "text-red-400" },
  };

  const pc = priorityConfig[card.priority];
  const ec = effortConfig[card.effort];

  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${pc.className}`}>{pc.label}</Badge>
          <span className="text-[10px] text-muted-foreground">Esforço: <span className={ec.className}>{ec.label}</span></span>
        </div>

        <h4 className="text-sm font-semibold leading-tight">{card.title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{card.explanation}</p>

        {card.impactTo > card.impactFrom && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">
              Potencial: {card.impactFrom.toFixed(1)}% → {card.impactTo.toFixed(1)}% conversão
            </p>
            <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden flex">
              <div className="h-full bg-muted/40 rounded-l-full" style={{ width: `${(card.impactFrom / Math.max(card.impactTo, 5)) * 100}%` }} />
              <div className="h-full bg-emerald-500/60 rounded-r-full" style={{ width: `${((card.impactTo - card.impactFrom) / Math.max(card.impactTo, 5)) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="space-y-2 pt-1">
          {card.actions.map((action, i) => (
            <label key={i} className="flex items-start gap-2 cursor-pointer group">
              <Checkbox
                checked={!!checked[i]}
                onCheckedChange={(v) => setChecked(prev => ({ ...prev, [i]: !!v }))}
                className="mt-0.5"
              />
              <span className={`text-xs leading-relaxed ${checked[i] ? "line-through text-muted-foreground/50" : "text-muted-foreground"}`}>
                {action}
              </span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── A/B Test Card ──

function ABTestCard({ test }: { test: ABTestSuggestion }) {
  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-[10px] font-medium text-purple-400">TESTE A/B</span>
        </div>
        <p className="text-xs font-medium">{test.hypothesis}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-muted/10 border border-white/[0.05]">
            <p className="text-[10px] text-muted-foreground mb-1">Variante A (atual)</p>
            <p className="text-[11px]">{test.variantA}</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] text-amber-400 mb-1">Variante B (sugerido)</p>
            <p className="text-[11px]">{test.variantB}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Métrica: {test.metric}</span>
          <span className="text-emerald-400">{test.estimatedImpact}</span>
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1.5" disabled>
          <FlaskConical className="h-3 w-3" /> Criar Teste
          <Badge variant="secondary" className="text-[9px] ml-1">Em breve</Badge>
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Drawer ──

export function OptimizationDrawer({
  templateSlug, conversionRate, bounceRate, sources, devices, sections, events,
}: OptimizationDrawerProps) {
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory(templateSlug));
  const [historyOpen, setHistoryOpen] = useState(false);

  const health = useMemo(
    () => computeFunnelHealthScore(conversionRate, bounceRate, sources, devices),
    [conversionRate, bounceRate, sources, devices]
  );

  const allCards = useMemo(
    () => generateImprovementCards(conversionRate, bounceRate, sources, devices, sections, events),
    [conversionRate, bounceRate, sources, devices, sections, events]
  );

  const abTests = useMemo(
    () => generateABTests(conversionRate, bounceRate, sources),
    [conversionRate, bounceRate, sources]
  );

  const activeCards = allCards.filter(c => !history.some(h => h.cardId === c.id));
  const hasCritical = activeCards.some(c => c.priority === "critical");

  const markCard = (cardId: string, status: "implemented" | "dismissed") => {
    const updated = [...history, { cardId, status, date: new Date().toISOString() }];
    setHistory(updated);
    saveHistory(templateSlug, updated);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 relative"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Propor Melhorias
          {hasCritical && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[420px] max-w-full overflow-y-auto bg-background border-l border-white/[0.08] p-0">
        <SheetHeader className="p-5 pb-3 border-b border-white/[0.06]">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-amber-400" />
            Plano de Otimização
          </SheetTitle>
        </SheetHeader>

        <div className="p-5 space-y-6">
          {/* 1. Health Score */}
          <HealthScoreCircle health={health} />

          {/* 2. Improvement Cards */}
          {activeCards.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                Propostas de Melhoria ({activeCards.length})
              </h3>
              {activeCards.map(card => (
                <div key={card.id} className="space-y-1.5">
                  <ImprovementCardUI card={card} />
                  <div className="flex gap-1.5 px-1">
                    <button
                      onClick={() => markCard(card.id, "implemented")}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> Implementado
                    </button>
                    <button
                      onClick={() => markCard(card.id, "dismissed")}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeCards.length === 0 && (
            <Card className="border-emerald-500/20 rounded-xl">
              <CardContent className="py-8 flex flex-col items-center text-center gap-2">
                <Check className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-medium">Tudo otimizado!</p>
                <p className="text-xs text-muted-foreground">Não há sugestões de melhoria de momento.</p>
              </CardContent>
            </Card>
          )}

          {/* 3. A/B Tests */}
          {abTests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-purple-400" />
                Testes Recomendados
              </h3>
              {abTests.map(test => (
                <ABTestCard key={test.id} test={test} />
              ))}
            </div>
          )}

          {/* 4. History */}
          {history.length > 0 && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full">
                <History className="h-3.5 w-3.5" />
                Histórico ({history.length})
                <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1.5">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded bg-muted/10">
                    <span className="text-muted-foreground truncate flex-1">{h.cardId.replace(/-/g, " ")}</span>
                    <Badge variant="outline" className={`text-[9px] ml-2 ${h.status === "implemented" ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground border-border"}`}>
                      {h.status === "implemented" ? "✓ Implementado" : "Ignorado"}
                    </Badge>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, MousePointerClick } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StatsEvent } from "./statsHelpers";

interface Props {
  events: StatsEvent[];
}

interface FieldStat {
  fieldName: string;
  focuses: number;
  blurs: number;
  abandons: number;
  avgTimeMs: number | null;
  dropOffPct: number;
  order: number;
}

export function StatsFormsTab({ events }: Props) {
  const { fieldStats, formStarts, formSubmits, formAbandons, abandonRate } = useMemo(() => {
    const formStartEvents = events.filter(e => e.event_type === "form_started");
    const formSubmitEvents = events.filter(e => e.event_type === "form_submit");
    const fieldFocusEvents = events.filter(e => e.event_type === "field_focus" && e.page_section);
    const fieldBlurEvents = events.filter(e => e.event_type === "field_blur" && e.page_section);
    const formAbandonEvents = events.filter(e => e.event_type === "form_abandon");

    // Use page_section to store field_name in tracker events (reusing existing field)
    // Actually we use field_name column
    const focusByField: Record<string, { focuses: number; blurs: number; times: number[]; order: number }> = {};

    for (const e of fieldFocusEvents) {
      const fn = (e as any).field_name || e.page_section || "unknown";
      if (!focusByField[fn]) focusByField[fn] = { focuses: 0, blurs: 0, times: [], order: (e as any).field_order ?? 99 };
      focusByField[fn].focuses++;
    }

    for (const e of fieldBlurEvents) {
      const fn = (e as any).field_name || e.page_section || "unknown";
      if (!focusByField[fn]) focusByField[fn] = { focuses: 0, blurs: 0, times: [], order: (e as any).field_order ?? 99 };
      focusByField[fn].blurs++;
      if ((e as any).time_on_section_ms && (e as any).time_on_section_ms > 0) {
        focusByField[fn].times.push((e as any).time_on_section_ms);
      }
    }

    // Count abandons per field (last field touched)
    const abandonsByField: Record<string, number> = {};
    for (const e of formAbandonEvents) {
      const fn = (e as any).field_name || e.page_section || "unknown";
      abandonsByField[fn] = (abandonsByField[fn] || 0) + 1;
    }

    const totalFocuses = Object.values(focusByField).reduce((s, f) => s + f.focuses, 0);

    const stats: FieldStat[] = Object.entries(focusByField)
      .map(([name, data]) => ({
        fieldName: name,
        focuses: data.focuses,
        blurs: data.blurs,
        abandons: abandonsByField[name] || 0,
        avgTimeMs: data.times.length > 0
          ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length)
          : null,
        dropOffPct: totalFocuses > 0 ? ((abandonsByField[name] || 0) / totalFocuses) * 100 : 0,
        order: data.order,
      }))
      .sort((a, b) => a.order - b.order);

    return {
      fieldStats: stats,
      formStarts: formStartEvents.length,
      formSubmits: formSubmitEvents.length,
      formAbandons: formAbandonEvents.length,
      abandonRate: formStartEvents.length > 0
        ? ((formStartEvents.length - formSubmitEvents.length) / formStartEvents.length) * 100
        : 0,
    };
  }, [events]);

  if (fieldStats.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <MousePointerClick className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">
            Sem dados de formulários ainda. Os dados aparecem quando visitantes interagem com campos do formulário.
          </p>
        </CardContent>
      </Card>
    );
  }

  const worstField = fieldStats.reduce((a, b) => a.abandons > b.abandons ? a : b, fieldStats[0]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Formulários Iniciados</p>
            <p className="text-2xl font-bold">{formStarts}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Submetidos</p>
            <p className="text-2xl font-bold text-emerald-400">{formSubmits}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Abandonos</p>
            <p className="text-2xl font-bold text-red-400">{formAbandons}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Taxa de Abandono</p>
            <p className="text-2xl font-bold">{abandonRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Worst field insight */}
      {worstField.abandons > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Campo problemático: <span className="text-amber-400">{worstField.fieldName}</span></p>
              <p className="text-xs text-muted-foreground mt-1">
                {worstField.abandons} abandonos neste campo ({worstField.dropOffPct.toFixed(1)}% do total). 
                Considera simplificar ou tornar opcional.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field-by-field table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Análise por Campo</CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="space-y-3">
              {fieldStats.map((f) => (
                <div key={f.fieldName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{f.fieldName}</span>
                      {f.abandons > 2 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {f.abandons} abandonos
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {f.avgTimeMs !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(f.avgTimeMs / 1000).toFixed(1)}s
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Tempo médio neste campo</TooltipContent>
                        </Tooltip>
                      )}
                      <span>{f.focuses} interações</span>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, (f.focuses / Math.max(1, fieldStats[0]?.focuses || 1)) * 100)}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}

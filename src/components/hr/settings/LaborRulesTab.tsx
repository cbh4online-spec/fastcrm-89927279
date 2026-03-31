import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Scale, Clock, Palmtree, Coins, Coffee, Save, Flag } from "lucide-react";
import {
  useAllLaborRules,
  useUpsertLaborRules,
  PORTUGAL_DEFAULT_RULES,
  type LaborRules,
} from "@/hooks/hr/useHRLaborRules";

export function LaborRulesTab() {
  const { data: allRules, isLoading } = useAllLaborRules();
  const upsert = useUpsertLaborRules();
  const [rules, setRules] = useState<LaborRules>(PORTUGAL_DEFAULT_RULES);
  const [initialized, setInitialized] = useState(false);

  // Load existing PT rules or use defaults
  useEffect(() => {
    if (isLoading || initialized) return;
    const pt = allRules?.find((r) => r.country_code === "PT");
    if (pt) {
      setRules(pt.rules);
    }
    setInitialized(true);
  }, [allRules, isLoading, initialized]);

  const handleSave = () => {
    upsert.mutate({
      country_code: "PT",
      country_name: "Portugal",
      rules,
      is_active: true,
    });
  };

  const update = (key: keyof LaborRules, value: number | string) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">A carregar regras laborais...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Legislação Laboral</h3>
            <p className="text-muted-foreground text-sm">Regras legais aplicáveis ao workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            🇵🇹 Portugal
          </Badge>
          <Button onClick={handleSave} disabled={upsert.isPending} size="sm" className="gap-1.5">
            <Save className="h-4 w-4" />
            {upsert.isPending ? "A guardar..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Horário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Horário de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Horas semanais legais" value={rules.weekly_hours_limit} onChange={(v) => update("weekly_hours_limit", v)} suffix="h" />
          <Field label="Horas diárias máximas" value={rules.max_daily_hours} onChange={(v) => update("max_daily_hours", v)} suffix="h" />
          <Field label="Intervalo mínimo entre turnos" value={rules.min_rest_between_shifts_hours} onChange={(v) => update("min_rest_between_shifts_hours", v)} suffix="h" />
          <Field label="Pausa obrigatória após" value={rules.mandatory_break_after_hours} onChange={(v) => update("mandatory_break_after_hours", v)} suffix="h consecutivas" />
          <Field label="Dias de descanso semanal" value={rules.weekly_rest_days} onChange={(v) => update("weekly_rest_days", v)} />
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Dia de descanso</Label>
            <Input value={rules.weekly_rest_day_name} onChange={(e) => update("weekly_rest_day_name", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Horas Extra */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" /> Horas Extra
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Máx. horas extra/ano (trabalhador)" value={rules.max_overtime_hours_employee} onChange={(v) => update("max_overtime_hours_employee", v)} suffix="h" />
          <Field label="Máx. horas extra/ano (empresa)" value={rules.max_overtime_hours_company} onChange={(v) => update("max_overtime_hours_company", v)} suffix="h" />
          <Field label="Multiplicador 1ª hora (dia útil)" value={rules.overtime_multiplier_weekday_first} onChange={(v) => update("overtime_multiplier_weekday_first", v)} suffix="×" step={0.01} />
          <Field label="Multiplicador seguintes (dia útil)" value={rules.overtime_multiplier_weekday_next} onChange={(v) => update("overtime_multiplier_weekday_next", v)} suffix="×" step={0.01} />
          <Field label="Multiplicador feriado/descanso" value={rules.overtime_multiplier_holiday} onChange={(v) => update("overtime_multiplier_holiday", v)} suffix="×" step={0.01} />
        </CardContent>
      </Card>

      {/* Férias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palmtree className="h-4 w-4 text-primary" /> Férias e Feriados
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Dias de férias anuais" value={rules.annual_vacation_days} onChange={(v) => update("annual_vacation_days", v)} suffix="dias" />
          <Field label="Feriados obrigatórios" value={rules.mandatory_public_holidays} onChange={(v) => update("mandatory_public_holidays", v)} />
        </CardContent>
      </Card>

      {/* Remuneração */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" /> Remuneração
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Salário mínimo nacional" value={rules.minimum_wage} onChange={(v) => update("minimum_wage", v)} suffix="€" step={0.01} />
          <Field label="Subsídio alimentação isento (cartão)" value={rules.meal_allowance_exempt} onChange={(v) => update("meal_allowance_exempt", v)} suffix="€/dia" step={0.01} />
        </CardContent>
      </Card>

      {/* Período Experimental */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" /> Período Experimental
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Geral" value={rules.probation_days_general} onChange={(v) => update("probation_days_general", v)} suffix="dias" />
          <Field label="Cargos complexos" value={rules.probation_days_complex} onChange={(v) => update("probation_days_complex", v)} suffix="dias" />
          <Field label="Dirigentes / cargos superiores" value={rules.probation_days_executive} onChange={(v) => update("probation_days_executive", v)} suffix="dias" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Field helper ────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          className="max-w-[140px]"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

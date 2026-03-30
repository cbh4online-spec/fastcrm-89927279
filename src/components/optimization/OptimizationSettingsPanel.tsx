import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import { useOptimizationSettings } from '@/hooks/useOptimizationEngine';

export function OptimizationSettingsPanel() {
  const { settings, isLoading, upsert } = useOptimizationSettings();

  const [form, setForm] = useState({
    is_enabled: false,
    auto_optimize_enabled: false,
    min_samples_threshold: 50,
    min_score_delta: 0.1,
    min_revenue_delta: 50,
    optimization_window_days: 30,
    allow_auto_pause: false,
    allow_auto_promote: false,
    allow_auto_switch_variant: false,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        is_enabled: settings.is_enabled,
        auto_optimize_enabled: settings.auto_optimize_enabled,
        min_samples_threshold: settings.min_samples_threshold,
        min_score_delta: settings.min_score_delta,
        min_revenue_delta: settings.min_revenue_delta,
        optimization_window_days: settings.optimization_window_days,
        allow_auto_pause: settings.allow_auto_pause,
        allow_auto_promote: settings.allow_auto_promote,
        allow_auto_switch_variant: settings.allow_auto_switch_variant,
      });
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate(form);
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Definições de Otimização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="opt-enabled">Motor de otimização ativo</Label>
            <Switch id="opt-enabled" checked={form.is_enabled} onCheckedChange={(v) => setForm(f => ({ ...f, is_enabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-opt">Auto-aplicar decisões seguras</Label>
            <Switch id="auto-opt" checked={form.auto_optimize_enabled} onCheckedChange={(v) => setForm(f => ({ ...f, auto_optimize_enabled: v }))} disabled={!form.is_enabled} />
          </div>
        </div>

        {/* Auto-apply permissions */}
        {form.auto_optimize_enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <p className="text-xs text-muted-foreground font-medium">Ações auto-aplicáveis</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-pause" className="text-sm">Pausar variantes fracas</Label>
              <Switch id="auto-pause" checked={form.allow_auto_pause} onCheckedChange={(v) => setForm(f => ({ ...f, allow_auto_pause: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-promote" className="text-sm">Promover variantes vencedoras</Label>
              <Switch id="auto-promote" checked={form.allow_auto_promote} onCheckedChange={(v) => setForm(f => ({ ...f, allow_auto_promote: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-switch" className="text-sm">Mudar variante default</Label>
              <Switch id="auto-switch" checked={form.allow_auto_switch_variant} onCheckedChange={(v) => setForm(f => ({ ...f, allow_auto_switch_variant: v }))} />
            </div>
          </div>
        )}

        {/* Thresholds */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="min-samples" className="text-xs">Amostras mínimas</Label>
            <Input id="min-samples" type="number" value={form.min_samples_threshold} onChange={(e) => setForm(f => ({ ...f, min_samples_threshold: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="score-delta" className="text-xs">Delta mínimo de score</Label>
            <Input id="score-delta" type="number" step="0.01" value={form.min_score_delta} onChange={(e) => setForm(f => ({ ...f, min_score_delta: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rev-delta" className="text-xs">Delta mínimo de receita (€)</Label>
            <Input id="rev-delta" type="number" value={form.min_revenue_delta} onChange={(e) => setForm(f => ({ ...f, min_revenue_delta: Number(e.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="window" className="text-xs">Janela de otimização (dias)</Label>
            <Input id="window" type="number" value={form.optimization_window_days} onChange={(e) => setForm(f => ({ ...f, optimization_window_days: Number(e.target.value) }))} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Guardar Definições
        </Button>
      </CardContent>
    </Card>
  );
}

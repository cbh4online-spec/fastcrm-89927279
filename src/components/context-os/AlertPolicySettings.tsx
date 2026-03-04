import { useState, useEffect } from 'react';
import { useAlertPolicy } from '@/hooks/useAlertPolicy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield } from 'lucide-react';

export function AlertPolicySettings() {
  const { policy, isLoading, updatePolicy } = useAlertPolicy();
  const [maxWarn, setMaxWarn] = useState(5);
  const [maxRisk, setMaxRisk] = useState(3);
  const [cooldown, setCooldown] = useState(24);

  useEffect(() => {
    if (policy) {
      setMaxWarn(policy.max_warn_per_day);
      setMaxRisk(policy.max_risk_per_day);
      setCooldown(policy.cooldown_hours);
    }
  }, [policy]);

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />;

  const handleSave = () => {
    updatePolicy.mutate({
      max_warn_per_day: maxWarn,
      max_risk_per_day: maxRisk,
      cooldown_hours: cooldown,
    });
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Política de Alertas</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Max WARN / dia</Label>
          <Input type="number" min={1} max={50} value={maxWarn} onChange={e => setMaxWarn(Number(e.target.value))} className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Max RISK / dia</Label>
          <Input type="number" min={1} max={50} value={maxRisk} onChange={e => setMaxRisk(Number(e.target.value))} className="h-8 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cooldown (horas)</Label>
          <Input type="number" min={1} max={168} value={cooldown} onChange={e => setCooldown(Number(e.target.value))} className="h-8 text-xs" />
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={updatePolicy.isPending} className="text-xs">
        {updatePolicy.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Guardar política
      </Button>
    </div>
  );
}

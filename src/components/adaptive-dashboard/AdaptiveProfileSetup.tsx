import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SalesFunction } from "@/data/adaptiveDashboardMock";

const functionOptions: { value: SalesFunction; label: string; description: string }[] = [
  { value: 'vendedor', label: 'Vendedor', description: 'Foco individual em vendas e quota' },
  { value: 'gestor', label: 'Gestor de Vendas', description: 'Gestão de equipa e pipeline' },
  { value: 'diretor', label: 'Diretor Comercial', description: 'Visão estratégica e forecast' },
  { value: 'ceo', label: 'CEO / Administrador', description: 'Visão executiva de alto nível' },
];

interface AdaptiveProfileSetupProps {
  open: boolean;
  onComplete: () => void;
}

export function AdaptiveProfileSetup({ open, onComplete }: AdaptiveProfileSetupProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [birthDate, setBirthDate] = useState('');
  const [salesFunction, setSalesFunction] = useState<SalesFunction | ''>('');
  const [saving, setSaving] = useState(false);

  const canSubmit = birthDate && salesFunction;

  const handleSave = async () => {
    if (!user?.id || !canSubmit) return;
    setSaving(true);
    try {
      const { error } = await (supabase
        .from('profiles')
        .update({ birth_date: birthDate, sales_function: salesFunction })
        .eq('user_id', user.id) as any);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['adaptive-profile'] });
      toast.success('Perfil atualizado com sucesso');
      onComplete();
    } catch (e: any) {
      toast.error('Erro ao guardar perfil: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Configure o seu dashboard</DialogTitle>
          <DialogDescription>
            Para personalizar a sua experiência, precisamos de algumas informações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="birth-date">Data de Nascimento</Label>
            <Input
              id="birth-date"
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              Usada para adaptar a interface à sua preferência visual.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Função Comercial</Label>
            <Select value={salesFunction} onValueChange={v => setSalesFunction(v as SalesFunction)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a sua função" />
              </SelectTrigger>
              <SelectContent>
                {functionOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!canSubmit || saving} className="w-full">
            {saving ? 'A guardar...' : 'Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

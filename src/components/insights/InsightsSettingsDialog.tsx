import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InsightsSettings, InsightCategory, INSIGHT_CATEGORY_CONFIG } from '@/types/aiInsights';

interface InsightsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: InsightsSettings;
  onSettingsChange: (settings: Partial<InsightsSettings>) => void;
}

export function InsightsSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: InsightsSettingsDialogProps) {
  const categories: InsightCategory[] = ['priority', 'risk', 'opportunity', 'efficiency'];

  const toggleCategory = (category: InsightCategory) => {
    const current = settings.enabledCategories;
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    onSettingsChange({ enabledCategories: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Insights IA</DialogTitle>
          <DialogDescription>
            Personalize como a IA gera e apresenta insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Proactivity Level */}
          <div className="space-y-3">
            <Label>Nível de proatividade</Label>
            <RadioGroup
              value={settings.proactivityLevel}
              onValueChange={(value) =>
                onSettingsChange({ proactivityLevel: value as InsightsSettings['proactivityLevel'] })
              }
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem value="low" id="low" className="peer sr-only" />
                <Label
                  htmlFor="low"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Baixo</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-1">
                    Só críticos
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="medium" id="medium" className="peer sr-only" />
                <Label
                  htmlFor="medium"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Médio</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-1">
                    Equilibrado
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="high" id="high" className="peer sr-only" />
                <Label
                  htmlFor="high"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">Alto</span>
                  <span className="text-[10px] text-muted-foreground text-center mt-1">
                    Tudo possível
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Enabled Categories */}
          <div className="space-y-3">
            <Label>Tipos de insights ativos</Label>
            <div className="space-y-2">
              {categories.map((category) => {
                const config = INSIGHT_CATEGORY_CONFIG[category];
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                      <span className="text-sm">{config.label}</span>
                    </div>
                    <Switch
                      checked={settings.enabledCategories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Auto Refresh */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Atualização automática</Label>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => onSettingsChange({ autoRefresh: checked })}
              />
            </div>
            {settings.autoRefresh && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Intervalo</span>
                  <span className="font-medium">{settings.refreshInterval} min</span>
                </div>
                <Slider
                  value={[settings.refreshInterval]}
                  onValueChange={([value]) => onSettingsChange({ refreshInterval: value })}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Plus,
  Target,
  Zap,
  TrendingUp,
  Trophy,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  Users,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useProductivityCoach, GoalPeriod, GoalStatus, ProductivityGoal } from '@/hooks/useProductivityCoach';

const PERIOD_CONFIG: Record<GoalPeriod, { label: string; icon: React.ElementType }> = {
  daily: { label: 'Diária', icon: Zap },
  weekly: { label: 'Semanal', icon: TrendingUp },
  monthly: { label: 'Mensal', icon: Target },
  annual: { label: 'Anual', icon: Trophy },
};

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string }> = {
  not_started: { label: 'Não Iniciada', color: 'bg-gray-500' },
  in_progress: { label: 'Em Progresso', color: 'bg-blue-500' },
  completed: { label: 'Concluída', color: 'bg-green-500' },
  failed: { label: 'Falhada', color: 'bg-red-500' },
};

function CreateGoalModal({ defaultPeriod }: { defaultPeriod?: GoalPeriod }) {
  const { createGoal } = useProductivityCoach();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<GoalPeriod>(defaultPeriod || 'daily');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [isTeamGoal, setIsTeamGoal] = useState(false);

  const getPeriodDates = (p: GoalPeriod) => {
    const now = new Date();
    switch (p) {
      case 'daily':
        return { start: now, end: now };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'annual':
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  const handleSubmit = async () => {
    const dates = getPeriodDates(period);
    
    await createGoal.mutateAsync({
      period,
      period_start: format(dates.start, 'yyyy-MM-dd'),
      period_end: format(dates.end, 'yyyy-MM-dd'),
      title,
      description: description || null,
      target_value: targetValue ? parseFloat(targetValue) : null,
      unit: unit || null,
      status: 'not_started',
    });

    setOpen(false);
    setTitle('');
    setDescription('');
    setTargetValue('');
    setUnit('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova Meta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
              <SelectTrigger>
                <SelectValue>
                  {period && (
                    <span className="flex items-center gap-2">
                      {(() => {
                        const Icon = PERIOD_CONFIG[period].icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      {PERIOD_CONFIG[period].label}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {Object.entries(PERIOD_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key} className="cursor-pointer">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Fechar 5 vendas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Detalhes da meta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Alvo</Label>
              <Input
                type="number"
                placeholder="5"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input
                placeholder="vendas, reuniões, €..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!title || createGoal.isPending}>
              {createGoal.isPending ? 'A criar...' : 'Criar Meta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({ goal, onUpdate, onDelete }: { 
  goal: ProductivityGoal; 
  onUpdate: (updates: Partial<ProductivityGoal>) => void;
  onDelete: () => void;
}) {
  const config = PERIOD_CONFIG[goal.period];
  const statusConfig = STATUS_CONFIG[goal.status];
  const Icon = config.icon;

  const progress = goal.target_value && goal.current_value
    ? Math.min((goal.current_value / goal.target_value) * 100, 100)
    : 0;

  const handleIncrement = () => {
    const newValue = (goal.current_value || 0) + 1;
    const updates: Partial<ProductivityGoal> = {
      current_value: newValue,
      status: goal.target_value && newValue >= goal.target_value ? 'completed' : 'in_progress',
    };
    if (updates.status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    onUpdate(updates);
  };

  return (
    <Card className={cn(
      'transition-all',
      goal.status === 'completed' && 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
    )}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              goal.status === 'completed' ? 'bg-green-500 text-white' : 'bg-primary/10'
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium">{goal.title}</h4>
              {goal.description && (
                <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">
            {config.label}
          </Badge>
        </div>

        {goal.target_value && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">
                {goal.current_value || 0}/{goal.target_value} {goal.unit || ''}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', statusConfig.color)} />
            <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {goal.target_value && goal.status !== 'completed' && (
              <Button variant="outline" size="sm" onClick={handleIncrement}>
                <Plus className="h-3 w-3 mr-1" />
                +1
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GoalsManager() {
  const { goals, goalsLoading, updateGoal, deleteGoal } = useProductivityCoach();
  const [activeTab, setActiveTab] = useState<GoalPeriod>('daily');

  const filteredGoals = goals.filter((g) => g.period === activeTab);
  const completedCount = filteredGoals.filter((g) => g.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Metas</h2>
          <p className="text-muted-foreground">
            Defina e acompanhe suas metas de produtividade
          </p>
        </div>
        <CreateGoalModal defaultPeriod={activeTab} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GoalPeriod)}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          {Object.entries(PERIOD_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = goals.filter((g) => g.period === key).length;
            return (
              <TabsTrigger key={key} value={key} className="gap-1">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(PERIOD_CONFIG).map((period) => (
          <TabsContent key={period} value={period} className="mt-6">
            {goalsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-40 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredGoals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    Sem metas {PERIOD_CONFIG[period as GoalPeriod].label.toLowerCase()}s definidas
                  </p>
                  <CreateGoalModal defaultPeriod={period as GoalPeriod} />
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {completedCount} de {filteredGoals.length} metas concluídas
                    </p>
                    <Progress
                      value={filteredGoals.length > 0 ? (completedCount / filteredGoals.length) * 100 : 0}
                      className="h-2 mt-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onUpdate={(updates) => updateGoal.mutate({ id: goal.id, ...updates })}
                      onDelete={() => deleteGoal.mutate(goal.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
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
  ShoppingCart,
  Briefcase,
  FileSignature,
  Calendar,
  Phone,
  Mail,
  Euro,
  Receipt,
  Wallet,
  CheckSquare,
  FileText,
  Presentation,
  Percent,
  Hash,
  LucideIcon,
  Building2,
  Lock,
  CalendarRange,
  CalendarDays,
  UserPlus,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useProductivityCoach, GoalPeriod, GoalStatus, GoalScope, ProductivityGoal } from '@/hooks/useProductivityCoach';
import { useGoalsProgress, isAutoCalculatedUnit, getUnitDataSource } from '@/hooks/useGoalProgressCalculation';
import { PeriodSummary } from './PeriodSummary';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useWorkspaceMembers, WorkspaceMember } from '@/hooks/useWorkspaceMembers';

// Configuração de unidades pré-definidas
interface UnitOption {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface UnitCategory {
  label: string;
  options: UnitOption[];
}

const UNIT_CATEGORIES: UnitCategory[] = [
  {
    label: 'Vendas',
    options: [
      { value: 'vendas', label: 'Vendas', icon: ShoppingCart, color: 'text-green-500' },
      { value: 'negocios', label: 'Negócios', icon: Briefcase, color: 'text-green-600' },
      { value: 'contratos', label: 'Contratos', icon: FileSignature, color: 'text-green-700' },
    ],
  },
  {
    label: 'Relacionamento',
    options: [
      { value: 'reunioes', label: 'Reuniões', icon: Calendar, color: 'text-blue-500' },
      { value: 'chamadas', label: 'Chamadas', icon: Phone, color: 'text-blue-600' },
      { value: 'emails', label: 'Emails', icon: Mail, color: 'text-blue-700' },
      { value: 'contactos', label: 'Contactos', icon: Users, color: 'text-blue-800' },
    ],
  },
  {
    label: 'Financeiro',
    options: [
      { value: 'euros', label: '€ (Euro)', icon: Euro, color: 'text-yellow-500' },
      { value: 'faturacao', label: 'Faturação', icon: Receipt, color: 'text-yellow-600' },
      { value: 'comissoes', label: 'Comissões', icon: Wallet, color: 'text-yellow-700' },
    ],
  },
  {
    label: 'Tarefas',
    options: [
      { value: 'tarefas', label: 'Tarefas', icon: CheckSquare, color: 'text-purple-500' },
      { value: 'propostas', label: 'Propostas', icon: FileText, color: 'text-purple-600' },
      { value: 'apresentacoes', label: 'Apresentações', icon: Presentation, color: 'text-purple-700' },
    ],
  },
  {
    label: 'Especial',
    options: [
      { value: 'percentagem', label: '% (Percentagem)', icon: Percent, color: 'text-orange-500' },
      { value: 'unidades', label: 'Unidades', icon: Hash, color: 'text-orange-600' },
      { value: 'custom', label: 'Personalizada', icon: Edit2, color: 'text-muted-foreground' },
    ],
  },
];

// Função auxiliar para encontrar a opção de unidade pelo valor
const findUnitOption = (value: string): UnitOption | undefined => {
  for (const category of UNIT_CATEGORIES) {
    const option = category.options.find((opt) => opt.value === value);
    if (option) return option;
  }
  return undefined;
};

const PERIOD_CONFIG: Record<GoalPeriod, { label: string; icon: React.ElementType }> = {
  daily: { label: 'Diária', icon: Zap },
  weekly: { label: 'Semanal', icon: TrendingUp },
  monthly: { label: 'Mensal', icon: Target },
  quarterly: { label: 'Trimestral', icon: CalendarRange },
  semiannual: { label: 'Semestral', icon: CalendarDays },
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
  const { currentWorkspace } = useWorkspace();
  const { isSuperAdmin } = useUserRole();
  const { data: members = [] } = useWorkspaceMembers();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<GoalPeriod>(defaultPeriod || 'daily');
  const [goalScope, setGoalScope] = useState<GoalScope>('organizational'); // Default to organizational for owners/admins
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unitSelection, setUnitSelection] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string>('');

  // Only workspace owners or super admins can create goals
  const isOwner = currentWorkspace?.role === 'owner';
  const canCreateGoals = isOwner || isSuperAdmin;

  const selectedUnitOption = findUnitOption(unitSelection);
  const isCustomUnit = unitSelection === 'custom';
  const finalUnit = isCustomUnit ? customUnit : (selectedUnitOption?.label || '');

  const getPeriodDates = (p: GoalPeriod) => {
    const now = new Date();
    switch (p) {
      case 'daily':
        return { start: now, end: now };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarterly':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'semiannual': {
        const semesterStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
        const semesterEnd = new Date(semesterStart.getFullYear(), semesterStart.getMonth() + 6, 0);
        return { start: semesterStart, end: semesterEnd };
      }
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
      unit: finalUnit || null,
      status: 'not_started',
      goal_scope: goalScope,
      assigned_user_id: goalScope === 'individual' && assignedUserId ? assignedUserId : null,
    });

    setOpen(false);
    setTitle('');
    setDescription('');
    setTargetValue('');
    setUnitSelection('');
    setCustomUnit('');
    setGoalScope('organizational');
    setAssignedUserId('');
  };

  // If user cannot create goals, don't render the modal trigger
  if (!canCreateGoals) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Nova Meta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Goal Scope Selector */}
          <div className="space-y-2">
            <Label>Tipo de Meta</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setGoalScope('individual');
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  goalScope === 'individual'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <UserPlus className="h-6 w-6" />
                <span className="font-medium text-sm">Individual</span>
                <span className="text-xs text-muted-foreground text-center">Atribuída a alguém</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalScope('organizational');
                  setAssignedUserId('');
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all relative',
                  goalScope === 'organizational'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                    : 'border-border hover:border-emerald-500/50'
                )}
              >
                <Building2 className="h-6 w-6" />
                <span className="font-medium text-sm">Organização</span>
                <span className="text-xs text-muted-foreground text-center">Toda a equipa</span>
              </button>
            </div>
          </div>

          {/* User Assignment (only for individual goals) */}
          {goalScope === 'individual' && (
            <div className="space-y-2">
              <Label>Atribuir a</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro...">
                    {assignedUserId && (() => {
                      const member = members.find(m => m.user_id === assignedUserId);
                      if (!member) return null;
                      return (
                        <span className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {(member.profile?.full_name || member.profile?.email || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.profile?.full_name || member.profile?.email}
                        </span>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="pointer-events-auto">
                  {members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id} className="cursor-pointer">
                      <span className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(member.profile?.full_name || member.profile?.email || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.profile?.full_name || member.profile?.email}</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {member.role}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione o membro da equipa que receberá esta meta
              </p>
            </div>
          )}

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
              <Select value={unitSelection} onValueChange={setUnitSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">
                    {selectedUnitOption && (
                      <span className="flex items-center gap-2">
                        {(() => {
                          const Icon = selectedUnitOption.icon;
                          return <Icon className={cn("h-4 w-4", selectedUnitOption.color)} />;
                        })()}
                        {selectedUnitOption.label}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="pointer-events-auto max-h-80">
                  {UNIT_CATEGORIES.map((category) => (
                    <SelectGroup key={category.label}>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                        {category.label}
                      </SelectLabel>
                      {category.options.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", option.color)} />
                              {option.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCustomUnit && (
            <div className="space-y-2">
              <Label>Unidade Personalizada</Label>
              <Input
                placeholder="Digite a unidade personalizada..."
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
              />
            </div>
          )}

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

interface EditGoalModalProps {
  goal: ProductivityGoal;
  onUpdate: (updates: Partial<ProductivityGoal>) => void;
  members: WorkspaceMember[];
}

function EditGoalModal({ goal, onUpdate, members }: EditGoalModalProps) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<GoalPeriod>(goal.period);
  const [goalScope, setGoalScope] = useState<GoalScope>(goal.goal_scope);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || '');
  const [targetValue, setTargetValue] = useState(goal.target_value?.toString() || '');
  const [currentValue, setCurrentValue] = useState(goal.current_value?.toString() || '0');
  const [status, setStatus] = useState<GoalStatus>(goal.status);
  const [assignedUserId, setAssignedUserId] = useState<string>(goal.user_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the unit in our categories or set as custom
  const existingUnitOption = findUnitOption(
    UNIT_CATEGORIES.flatMap(c => c.options).find(o => o.label === goal.unit)?.value || ''
  );
  const [unitSelection, setUnitSelection] = useState(existingUnitOption?.value || (goal.unit ? 'custom' : ''));
  const [customUnit, setCustomUnit] = useState(existingUnitOption ? '' : (goal.unit || ''));

  const selectedUnitOption = findUnitOption(unitSelection);
  const isCustomUnit = unitSelection === 'custom';
  const finalUnit = isCustomUnit ? customUnit : (selectedUnitOption?.label || goal.unit || '');

  const getPeriodDates = (p: GoalPeriod) => {
    const now = new Date();
    switch (p) {
      case 'daily':
        return { start: now, end: now };
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarterly':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'semiannual': {
        const semesterStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
        const semesterEnd = new Date(semesterStart.getFullYear(), semesterStart.getMonth() + 6, 0);
        return { start: semesterStart, end: semesterEnd };
      }
      case 'annual':
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dates = period !== goal.period ? getPeriodDates(period) : null;
      
      const updates: Partial<ProductivityGoal> = {
        title,
        description: description || null,
        target_value: targetValue ? parseFloat(targetValue) : null,
        current_value: currentValue ? parseFloat(currentValue) : 0,
        unit: finalUnit || null,
        status,
        period,
        goal_scope: goalScope,
        ...(dates && {
          period_start: format(dates.start, 'yyyy-MM-dd'),
          period_end: format(dates.end, 'yyyy-MM-dd'),
        }),
      };

      // Handle user assignment for individual goals
      if (goalScope === 'individual' && assignedUserId) {
        updates.user_id = assignedUserId;
      } else if (goalScope === 'organizational') {
        updates.user_id = null;
      }

      // Auto-set completed_at if status changes to completed
      if (status === 'completed' && goal.status !== 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (status !== 'completed' && goal.status === 'completed') {
        updates.completed_at = null;
      }

      onUpdate(updates);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Meta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Goal Scope Selector */}
          <div className="space-y-2">
            <Label>Tipo de Meta</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGoalScope('individual')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  goalScope === 'individual'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <UserPlus className="h-6 w-6" />
                <span className="font-medium text-sm">Individual</span>
                <span className="text-xs text-muted-foreground text-center">Atribuída a alguém</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalScope('organizational');
                  setAssignedUserId('');
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  goalScope === 'organizational'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                    : 'border-border hover:border-emerald-500/50'
                )}
              >
                <Building2 className="h-6 w-6" />
                <span className="font-medium text-sm">Organização</span>
                <span className="text-xs text-muted-foreground text-center">Toda a equipa</span>
              </button>
            </div>
          </div>

          {/* User Assignment (only for individual goals) */}
          {goalScope === 'individual' && (
            <div className="space-y-2">
              <Label>Atribuir a</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro...">
                    {assignedUserId && (() => {
                      const member = members.find(m => m.user_id === assignedUserId);
                      if (!member) return null;
                      return (
                        <span className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {(member.profile?.full_name || member.profile?.email || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.profile?.full_name || member.profile?.email}
                        </span>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="pointer-events-auto">
                  {members.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id} className="cursor-pointer">
                      <span className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(member.profile?.full_name || member.profile?.email || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.profile?.full_name || member.profile?.email}</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {member.role}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              <Label>Valor Atual</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={unitSelection} onValueChange={setUnitSelection}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione...">
                  {selectedUnitOption && (
                    <span className="flex items-center gap-2">
                      {(() => {
                        const Icon = selectedUnitOption.icon;
                        return <Icon className={cn("h-4 w-4", selectedUnitOption.color)} />;
                      })()}
                      {selectedUnitOption.label}
                    </span>
                  )}
                  {isCustomUnit && customUnit && (
                    <span className="flex items-center gap-2">
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                      {customUnit}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="pointer-events-auto max-h-80">
                {UNIT_CATEGORIES.map((category) => (
                  <SelectGroup key={category.label}>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                      {category.label}
                    </SelectLabel>
                    {category.options.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", option.color)} />
                            {option.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCustomUnit && (
            <div className="space-y-2">
              <Label>Unidade Personalizada</Label>
              <Input
                placeholder="Digite a unidade personalizada..."
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GoalStatus)}>
              <SelectTrigger>
                <SelectValue>
                  {status && (
                    <span className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[status].color)} />
                      {STATUS_CONFIG[status].label}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="pointer-events-auto">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', config.color)} />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!title || isSubmitting}>
              {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface GoalCardProps {
  goal: ProductivityGoal; 
  onUpdate: (updates: Partial<ProductivityGoal>) => void;
  onDelete: () => void;
  canManage: boolean;
  assignedMember?: WorkspaceMember | null;
  autoProgress?: { calculatedValue: number; isAutomatic: boolean; source: string } | null;
  members: WorkspaceMember[];
}

function GoalCard({ goal, onUpdate, onDelete, canManage, assignedMember, autoProgress, members }: GoalCardProps) {
  const config = PERIOD_CONFIG[goal.period];
  const statusConfig = STATUS_CONFIG[goal.status];
  const Icon = config.icon;
  const isOrganizational = goal.goal_scope === 'organizational';
  const isAutomatic = autoProgress?.isAutomatic || false;

  // Use automatic progress if available, otherwise use stored current_value
  const currentValue = isAutomatic ? autoProgress.calculatedValue : (goal.current_value || 0);
  const progress = goal.target_value && currentValue
    ? Math.min((currentValue / goal.target_value) * 100, 100)
    : 0;

  const handleIncrement = () => {
    // Only allow manual increment if not automatic
    if (isAutomatic) return;
    
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
      goal.status === 'completed' && 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
      isOrganizational && goal.status !== 'completed' && 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10'
    )}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              goal.status === 'completed' 
                ? 'bg-green-500 text-white' 
                : isOrganizational 
                  ? 'bg-emerald-500/20 text-emerald-600' 
                  : 'bg-primary/10'
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium">{goal.title}</h4>
                {isOrganizational ? (
                  <Badge variant="outline" className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <Building2 className="h-3 w-3 mr-1" />
                    Equipa
                  </Badge>
                ) : assignedMember ? (
                  <Badge variant="outline" className="h-5 text-[10px] bg-primary/10 text-primary border-primary/30 flex items-center gap-1">
                    <Avatar className="h-3.5 w-3.5">
                      <AvatarImage src={assignedMember.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(assignedMember.profile?.full_name || assignedMember.profile?.email || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {assignedMember.profile?.full_name?.split(' ')[0] || assignedMember.profile?.email?.split('@')[0]}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-5 text-[10px] bg-primary/10 text-primary border-primary/30">
                    <User className="h-3 w-3 mr-1" />
                    Individual
                  </Badge>
                )}
              </div>
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
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>Progresso</span>
                {isAutomatic && (
                  <Badge variant="outline" className="h-4 text-[9px] px-1 bg-blue-50 text-blue-600 border-blue-200">
                    <Zap className="h-2.5 w-2.5 mr-0.5" />
                    Auto
                  </Badge>
                )}
              </div>
              <span className="font-medium">
                {currentValue}/{goal.target_value} {goal.unit || ''}
              </span>
            </div>
            <Progress 
              value={progress} 
              className={cn(
                "h-2",
                isOrganizational && "[&>div]:bg-emerald-500",
                isAutomatic && "[&>div]:bg-blue-500"
              )} 
            />
            {isAutomatic && autoProgress?.source && (
              <p className="text-[10px] text-muted-foreground">
                Calculado automaticamente a partir de {autoProgress.source}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-full', statusConfig.color)} />
              <span className="text-xs text-muted-foreground">{statusConfig.label}</span>
            </div>
            {isOrganizational && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Partilhada
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {goal.target_value && goal.status !== 'completed' && canManage && !isAutomatic && (
              <Button variant="outline" size="sm" onClick={handleIncrement}>
                <Plus className="h-3 w-3 mr-1" />
                +1
              </Button>
            )}
            {canManage && (
              <>
                <EditGoalModal goal={goal} onUpdate={onUpdate} members={members} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ScopeFilter = 'all' | 'mine' | 'team';

export function GoalsManager() {
  const { goals, goalsLoading, updateGoal, deleteGoal } = useProductivityCoach();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { isSuperAdmin } = useUserRole();
  const { data: members = [] } = useWorkspaceMembers();
  const [activeTab, setActiveTab] = useState<GoalPeriod>('daily');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  
  // Fetch automatic progress for all goals
  const { data: autoProgressMap = {} } = useGoalsProgress(goals);

  // Only workspace owners or super admins can manage (edit/delete) goals
  const isOwner = currentWorkspace?.role === 'owner';
  const canManageGoals = isOwner || isSuperAdmin;

  // Create a map of user_id to member for quick lookup
  const memberMap = new Map(members.map(m => [m.user_id, m]));

  // Filter by period first
  const periodFilteredGoals = goals.filter((g) => g.period === activeTab);
  
  // Then filter by scope
  const filteredGoals = periodFilteredGoals.filter((g) => {
    if (scopeFilter === 'all') return true;
    if (scopeFilter === 'mine') return g.goal_scope === 'individual' && g.user_id === user?.id;
    if (scopeFilter === 'team') return g.goal_scope === 'organizational';
    return true;
  });
  
  const completedCount = filteredGoals.filter((g) => g.status === 'completed').length;
  
  // Count for scope tabs
  const myGoalsCount = periodFilteredGoals.filter((g) => g.goal_scope === 'individual' && g.user_id === user?.id).length;
  const teamGoalsCount = periodFilteredGoals.filter((g) => g.goal_scope === 'organizational').length;

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

      {/* Scope Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          onClick={() => setScopeFilter('all')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
            scopeFilter === 'all' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Target className="h-4 w-4" />
          Todas
          {periodFilteredGoals.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 ml-1">
              {periodFilteredGoals.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setScopeFilter('mine')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
            scopeFilter === 'mine' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="h-4 w-4" />
          Minhas
          {myGoalsCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 ml-1">
              {myGoalsCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setScopeFilter('team')}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
            scopeFilter === 'team' 
              ? 'bg-emerald-500/10 shadow-sm text-emerald-600 border border-emerald-500/30' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Building2 className="h-4 w-4" />
          Equipa
          {teamGoalsCount > 0 && (
            <Badge className="h-5 px-1.5 ml-1 bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20">
              {teamGoalsCount}
            </Badge>
          )}
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GoalPeriod)}>
        <TabsList className="h-auto flex-wrap sm:flex-nowrap w-full max-w-2xl gap-1 p-1">
          {Object.entries(PERIOD_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = goals.filter((g) => g.period === key).length;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5 flex-1 min-w-[100px] data-[state=active]:bg-background data-[state=active]:shadow-sm">
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
                  {scopeFilter === 'team' ? (
                    <>
                      <Building2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                      <p className="text-muted-foreground">
                        A equipa ainda não definiu metas organizacionais para este período
                      </p>
                    </>
                  ) : scopeFilter === 'mine' ? (
                    <>
                      <User className="h-12 w-12 mx-auto mb-3 text-primary opacity-50" />
                      <p className="text-muted-foreground">
                        Não tens metas pessoais {PERIOD_CONFIG[period as GoalPeriod].label.toLowerCase()}s
                      </p>
                    </>
                  ) : (
                    <>
                      <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        Sem metas {PERIOD_CONFIG[period as GoalPeriod].label.toLowerCase()}s definidas
                      </p>
                    </>
                  )}
                  <CreateGoalModal defaultPeriod={period as GoalPeriod} />
                </CardContent>
              </Card>
            ) : (
              <>
                <PeriodSummary 
                  goals={filteredGoals} 
                  autoProgressMap={autoProgressMap} 
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onUpdate={(updates) => updateGoal.mutate({ id: goal.id, ...updates })}
                      onDelete={() => deleteGoal.mutate(goal.id)}
                      canManage={canManageGoals}
                      assignedMember={goal.user_id ? memberMap.get(goal.user_id) : null}
                      autoProgress={autoProgressMap[goal.id] || null}
                      members={members}
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

import { useState } from 'react';
import { Plus, Workflow, MoreVertical, Play, Pause, Trash2, Edit, ChevronRight } from 'lucide-react';
import { ConversationalFlow, FlowStatus, GOAL_TYPE_CONFIG, GoalType } from '@/types/conversational-flows';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FlowListProps {
  flows: ConversationalFlow[];
  selectedFlowId: string | null;
  onSelect: (flowId: string) => void;
  onCreate: () => void;
  onEdit: (flow: ConversationalFlow) => void;
  onDelete: (flowId: string) => void;
  onToggleStatus: (flowId: string, status: FlowStatus) => void;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<FlowStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  active: { label: 'Ativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  paused: { label: 'Pausado', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  archived: { label: 'Arquivado', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' }
};

export function FlowList({
  flows,
  selectedFlowId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
  isLoading
}: FlowListProps) {
  const [search, setSearch] = useState('');

  const filteredFlows = flows.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Fluxos Conversacionais</h3>
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
        <Input
          placeholder="Pesquisar fluxos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Workflow className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {search ? 'Nenhum fluxo encontrado' : 'Nenhum fluxo criado'}
            </p>
            {!search && (
              <Button variant="link" size="sm" onClick={onCreate} className="mt-2">
                Criar primeiro fluxo
              </Button>
            )}
          </div>
        ) : (
          filteredFlows.map(flow => {
            const goalConfig = flow.goalType ? GOAL_TYPE_CONFIG[flow.goalType as GoalType] : null;
            const statusConfig = STATUS_CONFIG[flow.status];
            
            return (
              <Card
                key={flow.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedFlowId === flow.id && "ring-2 ring-primary"
                )}
                onClick={() => onSelect(flow.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{flow.name}</span>
                      </div>
                      {flow.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {flow.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className={cn("text-[10px]", statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                        {goalConfig && (
                          <span className="text-[10px] text-muted-foreground">
                            🎯 {goalConfig.label}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(flow); }}>
                          <Edit className="h-3 w-3 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {flow.status === 'active' ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(flow.id, 'paused'); }}>
                            <Pause className="h-3 w-3 mr-2" />
                            Pausar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(flow.id, 'active'); }}>
                            <Play className="h-3 w-3 mr-2" />
                            Ativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDelete(flow.id); }}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

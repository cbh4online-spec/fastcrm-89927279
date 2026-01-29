import { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  MessageSquare, 
  HelpCircle, 
  GitBranch, 
  Zap, 
  Target, 
  UserCheck,
  GripVertical,
  Trash2,
  Settings2
} from 'lucide-react';
import { FlowStep, STEP_TYPE_CONFIG, FlowStepType } from '@/types/conversational-flows';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICONS: Record<FlowStepType, typeof MessageSquare> = {
  message: MessageSquare,
  question: HelpCircle,
  condition: GitBranch,
  action: Zap,
  goal: Target,
  handoff: UserCheck
};

export interface FlowStepNodeData {
  step: FlowStep;
  onEdit: (step: FlowStep) => void;
  onDelete: (stepId: string) => void;
  isSelected: boolean;
}

interface FlowStepNodeProps {
  data: FlowStepNodeData;
  selected?: boolean;
}

function FlowStepNodeComponent({ data, selected }: FlowStepNodeProps) {
  const { step, onEdit, onDelete, isSelected } = data;
  const config = STEP_TYPE_CONFIG[step.stepType];
  const Icon = ICONS[step.stepType];

  const handleEdit = useCallback(() => {
    onEdit(step);
  }, [onEdit, step]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(step.id);
  }, [onDelete, step.id]);

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[280px] rounded-lg border-2 shadow-md transition-all",
        config.bgColor,
        selected || isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
        step.isEntryPoint && "ring-2 ring-green-500/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <div className={cn("p-1.5 rounded", config.bgColor)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{step.name}</p>
          <p className="text-xs text-muted-foreground">{config.label}</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleEdit}
          >
            <Settings2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="px-3 py-2 text-xs">
        {step.stepType === 'message' && step.messageContent && (
          <p className="text-muted-foreground line-clamp-2">
            "{step.messageContent}"
          </p>
        )}
        {step.stepType === 'question' && step.messageContent && (
          <p className="text-muted-foreground line-clamp-2">
            {step.messageContent}
          </p>
        )}
        {step.stepType === 'condition' && step.conditionField && (
          <p className="text-muted-foreground">
            Se <span className="font-medium">{step.conditionField}</span> {step.conditionOperator}
          </p>
        )}
        {step.stepType === 'action' && step.actionType && (
          <p className="text-muted-foreground">
            Ação: {step.actionType}
          </p>
        )}
        {step.stepType === 'goal' && step.goalName && (
          <p className="text-muted-foreground">
            🎯 {step.goalName}
          </p>
        )}
        {step.stepType === 'handoff' && (
          <p className="text-muted-foreground">
            Transferir para agente humano
          </p>
        )}
        {step.isEntryPoint && (
          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
            ▶ Ponto de Entrada
          </span>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />
      
      {step.stepType === 'condition' ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-3 h-3 !bg-green-500 border-2 border-background !left-[30%]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-3 h-3 !bg-red-500 border-2 border-background !left-[70%]"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 !bg-primary border-2 border-background"
        />
      )}
    </div>
  );
}

export const FlowStepNode = memo(FlowStepNodeComponent);

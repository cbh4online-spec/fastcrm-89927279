import { useState } from 'react';
import { 
  MessageSquare, 
  HelpCircle, 
  GitBranch, 
  Zap, 
  Target, 
  UserCheck,
  Brain,
  Search,
  TrendingUp,
  PenTool,
  FileText,
  ListChecks,
  Plus
} from 'lucide-react';
import { FlowStepType, STEP_TYPE_CONFIG } from '@/types/conversational-flows';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const ICONS: Record<FlowStepType, typeof MessageSquare> = {
  message: MessageSquare,
  question: HelpCircle,
  condition: GitBranch,
  action: Zap,
  goal: Target,
  handoff: UserCheck,
  ai_analyze: Brain,
  ai_research: Search,
  ai_predict: TrendingUp,
  ai_generate_message: PenTool,
  ai_summarize: FileText,
  ai_extract_tasks: ListChecks
};

interface FlowBuilderSidebarProps {
  onAddStep: (stepType: FlowStepType) => void;
}

export function FlowBuilderSidebar({ onAddStep }: FlowBuilderSidebarProps) {
  const [draggedType, setDraggedType] = useState<FlowStepType | null>(null);

  const handleDragStart = (stepType: FlowStepType) => (e: React.DragEvent) => {
    setDraggedType(stepType);
    e.dataTransfer.setData('application/flow-step-type', stepType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedType(null);
  };

  const allSteps = Object.entries(STEP_TYPE_CONFIG) as [FlowStepType, typeof STEP_TYPE_CONFIG[FlowStepType]][];
  const standardSteps = allSteps.filter(([, config]) => config.category !== 'ai');
  const aiSteps = allSteps.filter(([, config]) => config.category === 'ai');

  const renderStepCard = ([type, config]: [FlowStepType, typeof STEP_TYPE_CONFIG[FlowStepType]]) => {
    const Icon = ICONS[type];
    return (
      <div
        key={type}
        draggable
        onDragStart={handleDragStart(type)}
        onDragEnd={handleDragEnd}
        className={cn(
          "group relative flex items-center gap-3 p-3 rounded-lg border cursor-grab transition-all",
          "hover:border-primary hover:shadow-sm",
          config.bgColor,
          draggedType === type && "opacity-50 scale-95"
        )}
      >
        <div className={cn("p-2 rounded-md", config.bgColor)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {config.description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onAddStep(type)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Elementos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arrasta ou clica para adicionar
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {standardSteps.map(renderStepCard)}
          
          <Separator className="my-3" />
          
          <div className="flex items-center gap-2 px-1 mb-2">
            <Brain className="h-4 w-4 text-cyan-600" />
            <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">
              AI Nodes
            </span>
          </div>
          
          {aiSteps.map(renderStepCard)}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Dica:</strong></p>
          <p>• Arrasta elementos para o canvas</p>
          <p>• Liga os passos com as conexões</p>
          <p>• Clica num passo para editar</p>
        </div>
      </div>
    </div>
  );
}

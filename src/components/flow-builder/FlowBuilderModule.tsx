import { useState } from 'react';
import { useConversationalFlows } from '@/hooks/useConversationalFlows';
import { FlowList } from './FlowList';
import { FlowBuilderCanvas } from './FlowBuilderCanvas';
import { FlowAnalyticsPanel } from './FlowAnalyticsPanel';
import { CreateFlowDialog } from './CreateFlowDialog';
import { ConversationalFlow, FlowStatus } from '@/types/conversational-flows';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, PenTool } from 'lucide-react';
import { toast } from 'sonner';
import { FlowTemplate } from './FlowTemplates';

interface FlowBuilderModuleProps {
  personas: Array<{ id: string; name: string; isActive: boolean }>;
  knowledgeBases: Array<{ id: string; name: string }>;
}

export function FlowBuilderModule({ personas, knowledgeBases }: FlowBuilderModuleProps) {
  const {
    flows,
    currentFlow,
    steps,
    variables,
    isLoading,
    isSaving,
    loadFlowDetails,
    createFlow,
    createFlowFromTemplate,
    updateFlow,
    deleteFlow,
    setFlowStatus,
    createStep,
    updateStep,
    deleteStep,
    updateStepPositions,
    createVariable,
    setCurrentFlow
  } = useConversationalFlows();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ConversationalFlow | null>(null);
  const [activeView, setActiveView] = useState<'canvas' | 'analytics'>('canvas');

  const handleSelectFlow = async (flowId: string) => {
    await loadFlowDetails(flowId);
  };

  const handleCreateFlow = async (data: {
    name: string;
    description?: string;
    goalType?: string;
    personaId?: string;
    knowledgeBaseIds?: string[];
    triggerChannels?: string[];
  }) => {
    const flow = await createFlow(data);
    if (flow) {
      setShowCreateDialog(false);
      await loadFlowDetails(flow.id);
    }
  };

  const handleCreateFromTemplate = async (template: FlowTemplate) => {
    const flow = await createFlowFromTemplate(template);
    if (flow) {
      setShowCreateDialog(false);
      await loadFlowDetails(flow.id);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (confirm('Tens a certeza que queres eliminar este fluxo?')) {
      await deleteFlow(flowId);
    }
  };

  const handleToggleStatus = async (flowId: string, status: FlowStatus) => {
    await setFlowStatus(flowId, status);
  };

  const handleActivate = async () => {
    if (currentFlow) {
      // Check if there's at least one entry point
      const hasEntryPoint = steps.some(s => s.isEntryPoint);
      if (!hasEntryPoint) {
        toast.error('Define um ponto de entrada antes de ativar o fluxo');
        return;
      }
      await setFlowStatus(currentFlow.id, 'active');
    }
  };

  const handleDeactivate = async () => {
    if (currentFlow) {
      await setFlowStatus(currentFlow.id, 'paused');
    }
  };

  const handleSave = () => {
    toast.success('Fluxo guardado');
  };

  const handleCreateStep = async (data: Parameters<typeof createStep>[0]) => {
    if (!currentFlow) return null;
    return createStep({ ...data, flowId: currentFlow.id });
  };

  const handleBack = () => {
    setCurrentFlow(null);
    setActiveView('canvas');
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex">
      {/* Flow list - hidden when editing */}
      {!currentFlow ? (
        <div className="w-full md:w-80 border-r">
          <FlowList
            flows={flows}
            selectedFlowId={currentFlow?.id || null}
            onSelect={handleSelectFlow}
            onCreate={() => setShowCreateDialog(true)}
            onEdit={(flow) => {
              setEditingFlow(flow);
              setShowCreateDialog(true);
            }}
            onDelete={handleDeleteFlow}
            onToggleStatus={handleToggleStatus}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Header with back button */}
          <div className="flex items-center gap-3 p-3 border-b">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold">{currentFlow.name}</h2>
              {currentFlow.description && (
                <p className="text-xs text-muted-foreground">{currentFlow.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant={activeView === 'canvas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('canvas')}
              >
                <PenTool className="h-3.5 w-3.5 mr-1" />
                Canvas
              </Button>
              <Button
                variant={activeView === 'analytics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('analytics')}
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1" />
                Analytics
              </Button>
            </div>
          </div>

          {/* Canvas or Analytics */}
          <div className="flex-1">
            {activeView === 'canvas' ? (
              <FlowBuilderCanvas
                steps={steps}
                variables={variables}
                flowStatus={currentFlow.status}
                onCreateStep={handleCreateStep}
                onUpdateStep={updateStep}
                onDeleteStep={deleteStep}
                onUpdatePositions={updateStepPositions}
                onSave={handleSave}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                isSaving={isSaving}
              />
            ) : (
              <FlowAnalyticsPanel flowId={currentFlow.id} />
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreateFlowDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setEditingFlow(null);
        }}
        onSubmit={handleCreateFlow}
        onSubmitTemplate={handleCreateFromTemplate}
        personas={personas}
        knowledgeBases={knowledgeBases}
        editingFlow={editingFlow}
      />
    </div>
  );
}

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FlowStep, FlowVariable, FlowStepType } from '@/types/conversational-flows';
import { FlowStepNode, FlowStepNodeData } from './FlowStepNode';
import { FlowBuilderSidebar } from './FlowBuilderSidebar';
import { StepPropertiesPanel } from './StepPropertiesPanel';
import { Button } from '@/components/ui/button';
import { Save, Play, Pause, RotateCcw } from 'lucide-react';

interface FlowBuilderCanvasProps {
  steps: FlowStep[];
  variables: FlowVariable[];
  flowStatus: 'draft' | 'active' | 'paused' | 'archived';
  onCreateStep: (data: Partial<FlowStep>) => Promise<FlowStep | null>;
  onUpdateStep: (stepId: string, data: Partial<FlowStep>) => Promise<FlowStep | null>;
  onDeleteStep: (stepId: string) => Promise<boolean>;
  onUpdatePositions: (updates: Array<{ id: string; positionX: number; positionY: number }>) => Promise<void>;
  onSave: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  isSaving: boolean;
}

export function FlowBuilderCanvas({
  steps,
  variables,
  flowStatus,
  onCreateStep,
  onUpdateStep,
  onDeleteStep,
  onUpdatePositions,
  onSave,
  onActivate,
  onDeactivate,
  isSaving
}: FlowBuilderCanvasProps) {
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Handlers for nodes
  const handleEditStep = useCallback((step: FlowStep) => {
    setSelectedStep(step);
  }, []);

  const handleDeleteStep = useCallback(async (stepId: string) => {
    await onDeleteStep(stepId);
    if (selectedStep?.id === stepId) {
      setSelectedStep(null);
    }
  }, [onDeleteStep, selectedStep?.id]);

  // Convert steps to nodes - use type assertion for React Flow compatibility
  const buildNodes = useCallback(() => {
    return steps.map(step => ({
      id: step.id,
      type: 'flowStep',
      position: { x: step.positionX, y: step.positionY },
      data: {
        step,
        onEdit: handleEditStep,
        onDelete: handleDeleteStep,
        isSelected: step.id === selectedStep?.id
      }
    })) as Node[];
  }, [steps, handleEditStep, handleDeleteStep, selectedStep?.id]);

  // Convert steps to edges
  const buildEdges = useCallback(() => {
    const edges: Edge[] = [];
    
    steps.forEach(step => {
      if (step.stepType === 'condition') {
        if (step.conditionTrueStepId) {
          edges.push({
            id: `${step.id}-true-${step.conditionTrueStepId}`,
            source: step.id,
            sourceHandle: 'true',
            target: step.conditionTrueStepId,
            label: 'Sim',
            style: { stroke: '#22c55e' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' }
          });
        }
        if (step.conditionFalseStepId) {
          edges.push({
            id: `${step.id}-false-${step.conditionFalseStepId}`,
            source: step.id,
            sourceHandle: 'false',
            target: step.conditionFalseStepId,
            label: 'Não',
            style: { stroke: '#ef4444' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }
          });
        }
      } else if (step.nextStepId) {
        edges.push({
          id: `${step.id}-${step.nextStepId}`,
          source: step.id,
          target: step.nextStepId,
          markerEnd: { type: MarkerType.ArrowClosed }
        });
      }
    });
    
    return edges;
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges());

  // Update nodes when steps change
  useEffect(() => {
    setNodes(buildNodes());
    setEdges(buildEdges());
  }, [steps, selectedStep?.id, buildNodes, buildEdges, setNodes, setEdges]);

  // Node types
  const nodeTypes = useMemo(() => ({
    flowStep: FlowStepNode
  }), []);

  // Handle new connection
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const sourceStep = steps.find(s => s.id === connection.source);
    if (!sourceStep) return;

    if (sourceStep.stepType === 'condition') {
      if (connection.sourceHandle === 'true') {
        await onUpdateStep(sourceStep.id, { conditionTrueStepId: connection.target });
      } else if (connection.sourceHandle === 'false') {
        await onUpdateStep(sourceStep.id, { conditionFalseStepId: connection.target });
      }
    } else {
      await onUpdateStep(sourceStep.id, { nextStepId: connection.target });
    }

    setEdges((eds) => addEdge(connection, eds));
  }, [steps, onUpdateStep, setEdges]);

  // Handle node drag end - save positions
  const onNodeDragStop = useCallback(async (_: React.MouseEvent, node: Node) => {
    await onUpdatePositions([{
      id: node.id,
      positionX: Math.round(node.position.x),
      positionY: Math.round(node.position.y)
    }]);
  }, [onUpdatePositions]);

  // Handle adding new step from sidebar
  const handleAddStep = useCallback(async (stepType: FlowStepType) => {
    const centerX = 250;
    const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
    const positionY = lastStep ? lastStep.positionY + 150 : 100;

    await onCreateStep({
      stepType,
      name: `Novo ${stepType}`,
      positionX: centerX,
      positionY,
      isEntryPoint: steps.length === 0
    });
  }, [steps, onCreateStep]);

  // Handle drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();

    const stepType = event.dataTransfer.getData('application/flow-step-type') as FlowStepType;
    if (!stepType || !reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left - 100,
      y: event.clientY - bounds.top - 50
    };

    await onCreateStep({
      stepType,
      name: `Novo ${stepType}`,
      positionX: Math.round(position.x),
      positionY: Math.round(position.y),
      isEntryPoint: steps.length === 0
    });
  }, [steps.length, onCreateStep]);

  // Handle update from properties panel
  const handleUpdateFromPanel = useCallback(async (stepId: string, data: Partial<FlowStep>) => {
    const updated = await onUpdateStep(stepId, data);
    if (updated) {
      setSelectedStep(updated);
    }
  }, [onUpdateStep]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <FlowBuilderSidebar onAddStep={handleAddStep} />

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true
          }}
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              const data = node.data as unknown as FlowStepNodeData;
              if (data?.step?.isEntryPoint) return '#22c55e';
              return '#6366f1';
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
          
          {/* Top panel with actions */}
          <Panel position="top-right" className="flex gap-2">
            {flowStatus === 'active' ? (
              <Button variant="outline" size="sm" onClick={onDeactivate}>
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
            ) : (
              <Button variant="default" size="sm" onClick={onActivate}>
                <Play className="h-4 w-4 mr-1" />
                Ativar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'A guardar...' : 'Guardar'}
            </Button>
          </Panel>

          {/* Empty state */}
          {steps.length === 0 && (
            <Panel position="top-center" className="mt-20">
              <div className="text-center p-8 bg-background/80 backdrop-blur rounded-lg border">
                <RotateCcw className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold">Começa o teu fluxo</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Arrasta um elemento da barra lateral para começar
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      {selectedStep && (
        <StepPropertiesPanel
          step={selectedStep}
          variables={variables}
          onUpdate={handleUpdateFromPanel}
          onClose={() => setSelectedStep(null)}
        />
      )}
    </div>
  );
}

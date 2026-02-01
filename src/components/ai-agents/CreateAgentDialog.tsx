import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AIAgentForm } from './AIAgentForm';
import type { AIChannelAgent, CreateAIAgentData } from '@/types/aiChannelAgents';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AIChannelAgent | null;
  personas: Array<{ id: string; name: string; toneOfVoice: string }>;
  knowledgeBases: Array<{ id: string; name: string }>;
  flows: Array<{ id: string; name: string }>;
  onSubmit: (data: CreateAIAgentData) => Promise<void>;
  onDelete?: (agent: AIChannelAgent) => Promise<void>;
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  agent,
  personas,
  knowledgeBases,
  flows,
  onSubmit,
  onDelete,
}: CreateAgentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!agent;

  const handleSubmit = async (data: CreateAIAgentData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!agent || !onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete(agent);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Agente' : 'Novo Agente IA'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize a configuração do agente para este canal.'
                : 'Configure um agente IA com persona e bases de conhecimento específicas para um canal.'
              }
            </DialogDescription>
          </DialogHeader>

          <AIAgentForm
            agent={agent}
            personas={personas}
            knowledgeBases={knowledgeBases}
            flows={flows}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente "{agent?.name}" será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'A eliminar...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

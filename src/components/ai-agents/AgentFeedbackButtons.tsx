import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThumbsUp, ThumbsDown, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentFeedback } from "@/hooks/useAgentFeedback";
import type { FeedbackType } from "@/types/aiAgents";

interface AgentFeedbackButtonsProps {
  executionId: string;
  className?: string;
  compact?: boolean;
}

export function AgentFeedbackButtons({ 
  executionId, 
  className,
  compact = false 
}: AgentFeedbackButtonsProps) {
  const { 
    markAsUseful, 
    markAsNotUseful, 
    markActionTaken,
    markActionIgnored,
    isSubmitting 
  } = useAgentFeedback();
  
  const [submitted, setSubmitted] = useState<FeedbackType | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [pendingAction, setPendingAction] = useState<FeedbackType | null>(null);

  const handleSubmit = async (type: FeedbackType, withNotes = false) => {
    if (withNotes) {
      setPendingAction(type);
      setShowNotes(true);
      return;
    }
    
    try {
      switch (type) {
        case 'useful':
          await markAsUseful(executionId, notes || undefined);
          break;
        case 'not_useful':
          await markAsNotUseful(executionId, notes || undefined);
          break;
        case 'action_taken':
          await markActionTaken(executionId, notes || undefined);
          break;
        case 'action_ignored':
          await markActionIgnored(executionId, notes || undefined);
          break;
      }
      setSubmitted(type);
      setShowNotes(false);
      setNotes("");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleNotesSubmit = () => {
    if (pendingAction) {
      handleSubmit(pendingAction);
    }
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
        <span>Obrigado pelo feedback!</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => handleSubmit('useful')}
          disabled={isSubmitting}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => handleSubmit('not_useful', true)}
          disabled={isSubmitting}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">Esta recomendação foi útil?</p>
      
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => handleSubmit('useful')}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ThumbsUp className="h-3 w-3" />
          )}
          Útil
        </Button>
        
        <Popover open={showNotes && pendingAction === 'not_useful'} onOpenChange={(open) => !open && setShowNotes(false)}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => handleSubmit('not_useful', true)}
              disabled={isSubmitting}
            >
              <ThumbsDown className="h-3 w-3" />
              Não útil
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium">Porquê não foi útil?</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajude-nos a melhorar..."
                className="h-20 text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setShowNotes(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleNotesSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enviar"}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => handleSubmit('action_taken')}
          disabled={isSubmitting}
        >
          <CheckCircle className="h-3 w-3" />
          Executei
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => handleSubmit('action_ignored', true)}
          disabled={isSubmitting}
        >
          <XCircle className="h-3 w-3" />
          Ignorei
        </Button>
      </div>
    </div>
  );
}

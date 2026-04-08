import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PenLine } from "lucide-react";
import { VariableContext } from "@/lib/templateVariables";
import { SimpleEmailComposer } from "./SimpleEmailComposer";

export interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    email: string;
    name: string;
    entityType: 'contact' | 'company' | 'lead';
    entityId: string;
  };
  defaultSubject?: string;
  defaultBody?: string;
  templateContext?: VariableContext;
  onSent?: () => void;
  autoCreateContact?: boolean;
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  recipient,
  defaultSubject = "",
  defaultBody = "",
  templateContext,
  onSent,
  autoCreateContact = false,
}: ComposeEmailDialogProps) {
  // Reset key to force remount when dialog reopens
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (open) setResetKey(k => k + 1);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <PenLine className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Novo Email</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Envia um email em 3 passos simples
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-5">
          <SimpleEmailComposer
            key={resetKey}
            recipient={recipient}
            defaultSubject={defaultSubject}
            defaultBody={defaultBody}
            templateContext={templateContext}
            onSent={onSent}
            onCancel={() => onOpenChange(false)}
            autoCreateContact={autoCreateContact}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

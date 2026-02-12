import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConnectionUnlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  opportunityId?: string | null;
}

export function ConnectionUnlockedDialog({ open, onOpenChange, companyName, opportunityId }: ConnectionUnlockedDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 w-fit">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <DialogTitle>Conexão Desbloqueada</DialogTitle>
          <DialogDescription>
            A conexão com <strong>{companyName}</strong> foi desbloqueada com sucesso.
            Uma oportunidade foi criada automaticamente no seu pipeline FastMatch.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {opportunityId && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                navigate(`/dashboard/opportunities/${opportunityId}`);
              }}
              className="gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              Ver no CRM
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} className="gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Continuar a Explorar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

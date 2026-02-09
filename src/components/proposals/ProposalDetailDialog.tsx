import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ProposalDetailContent } from "./ProposalDetailContent";

interface ProposalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
}

export function ProposalDetailDialog({
  open,
  onOpenChange,
  proposalId,
}: ProposalDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        <ProposalDetailContent
          proposalId={proposalId}
          renderMode="dialog"
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

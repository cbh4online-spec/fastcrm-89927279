import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemberAnswers } from "@/hooks/useMembershipQuestions";
import { Loader2, FileText } from "lucide-react";

interface MemberAnswersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string | undefined;
  memberName: string;
}

export function MemberAnswersDialog({ open, onOpenChange, memberId, memberName }: MemberAnswersDialogProps) {
  const { data: answers = [], isLoading } = useMemberAnswers(open ? memberId : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Respostas de {memberName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : answers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Este membro não respondeu a nenhuma pergunta de adesão.
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {answers.map((a: any) => (
              <div key={a.id} className="space-y-1">
                <p className="text-sm font-medium">{a.community_membership_questions?.question_text || "Pergunta removida"}</p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{a.answer_text || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

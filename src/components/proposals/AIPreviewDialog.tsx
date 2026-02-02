import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Sparkles, Brain, Edit3 } from "lucide-react";
import { ConfidenceScore } from "@/components/ai/AIConfidenceDisplay";
import { cn } from "@/lib/utils";

interface AIPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confidence?: number;
  reasoning?: string;
  children: React.ReactNode;
  onAccept: () => void;
  onEdit?: () => void;
  acceptLabel?: string;
  editLabel?: string;
}

export function AIPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  confidence,
  reasoning,
  children,
  onAccept,
  onEdit,
  acceptLabel = "Aplicar",
  editLabel = "Editar",
}: AIPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                {title}
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  Gerado por IA
                </Badge>
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            {confidence !== undefined && (
              <ConfidenceScore confidence={confidence} size="md" />
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {/* AI Reasoning */}
            {reasoning && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Raciocínio da IA
                    </p>
                    <p className="text-sm">{reasoning}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Content */}
            <div className="border rounded-lg p-4 bg-card">{children}</div>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit} className="gap-1">
              <Edit3 className="h-4 w-4" />
              {editLabel}
            </Button>
          )}
          <Button
            onClick={() => {
              onAccept();
              onOpenChange(false);
            }}
            className="gap-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            {acceptLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewListProps {
  items: string[];
  icon?: React.ReactNode;
  emptyMessage?: string;
}

export function PreviewList({ items, icon, emptyMessage = "Nenhum item" }: PreviewListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex items-start gap-2 text-sm"
        >
          {icon || <span className="text-primary">•</span>}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

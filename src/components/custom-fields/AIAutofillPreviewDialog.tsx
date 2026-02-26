import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Pencil } from "lucide-react";

export interface AIAutofillResult {
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  generatedValue: string;
  isUnique?: boolean;
}

interface AIAutofillPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: AIAutofillResult[];
  onConfirm: (selectedResults: AIAutofillResult[]) => void;
  isApplying?: boolean;
}

export function AIAutofillPreviewDialog({
  open,
  onOpenChange,
  results,
  onConfirm,
  isApplying = false,
}: AIAutofillPreviewDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(results.map((r) => r.fieldId)));
  const [editedValues, setEditedValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(results.map((r) => [r.fieldId, r.generatedValue]))
  );

  useEffect(() => {
    setSelected(new Set(results.map((r) => r.fieldId)));
    setEditedValues(Object.fromEntries(results.map((r) => [r.fieldId, r.generatedValue])));
  }, [results]);

  const toggleField = (fieldId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedResults = results
      .filter((r) => selected.has(r.fieldId))
      .map((r) => ({ ...r, generatedValue: editedValues[r.fieldId] ?? r.generatedValue }));
    onConfirm(selectedResults);
  };

  if (results.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Preview AI Autofill
          </DialogTitle>
          <DialogDescription>
            Reveja e edite os valores gerados pela IA antes de guardar. Desmarque os que não pretende aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
          {results.map((result) => (
            <div
              key={result.fieldId}
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors"
            >
              <Checkbox
                checked={selected.has(result.fieldId)}
                onCheckedChange={() => toggleField(result.fieldId)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{result.fieldLabel || result.fieldName}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Sugerido por IA
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Pencil className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Input
                    value={editedValues[result.fieldId] ?? result.generatedValue}
                    onChange={(e) =>
                      setEditedValues((prev) => ({ ...prev, [result.fieldId]: e.target.value }))
                    }
                    className="h-7 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Descartar Todos
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0 || isApplying}>
            {isApplying ? "A aplicar..." : `Aplicar ${selected.size} campo(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

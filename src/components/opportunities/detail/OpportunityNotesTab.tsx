import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Save, X } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { useTranslation } from "react-i18next";
import { Opportunity } from "@/types/opportunity";
import { toast } from "sonner";

interface OpportunityNotesTabProps {
  opportunity: Opportunity;
  onUpdate: (updates: { id: string } & Record<string, unknown>) => Promise<void>;
}

export function OpportunityNotesTab({ opportunity, onUpdate }: OpportunityNotesTabProps) {
  const { t } = useTranslation("crm");
  const [isAdding, setIsAdding] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Parse notes - we store as a simple text for now, each note separated by a delimiter
  const notesRaw = opportunity.notes || "";
  const noteEntries = notesRaw
    ? notesRaw.split("\n---\n").filter(Boolean).map((text, i) => ({
        id: i,
        text: text.trim(),
      }))
    : [];

  const handleSave = async () => {
    if (!noteText.trim()) return;
    setIsSaving(true);
    try {
      const timestamp = `[${new Date().toISOString()}] `;
      const newNote = timestamp + noteText.trim();
      const updatedNotes = notesRaw
        ? newNote + "\n---\n" + notesRaw
        : newNote;
      await onUpdate({ id: opportunity.id, notes: updatedNotes });
      setNoteText("");
      setIsAdding(false);
      toast.success(t("oppDetail_noteSaved"));
    } catch {
      toast.error(t("errorUpdatingOpportunity"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isAdding && (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsAdding(true)}>
          <Plus className="w-3.5 h-3.5" />
          {t("oppDetail_addNote")}
        </Button>
      )}

      {isAdding && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t("notesPlaceholder")}
              className="min-h-[100px]"
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNoteText(""); }}>
                <X className="w-3.5 h-3.5 mr-1" />
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!noteText.trim() || isSaving}>
                <Save className="w-3.5 h-3.5 mr-1" />
                {isSaving ? "..." : t("oppDetail_saveNote")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {noteEntries.length === 0 && !isAdding ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("oppDetail_noNotes")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {noteEntries.map((note) => {
            // Extract timestamp if present
            const timestampMatch = note.text.match(/^\[(\d{4}-\d{2}-\d{2}T[^\]]+)\]\s*/);
            const timestamp = timestampMatch ? timestampMatch[1] : null;
            const content = timestampMatch ? note.text.replace(timestampMatch[0], "") : note.text;

            return (
              <Card key={note.id} className="border-border/50">
                <CardContent className="py-3 px-4">
                  {timestamp && (
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      {formatDate(timestamp, "dd MMM yyyy HH:mm")}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

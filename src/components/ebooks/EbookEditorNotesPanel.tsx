import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, StickyNote, Filter, Highlighter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EbookNote } from "@/hooks/useEbookNotes";
import type { UseMutationResult } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface EbookEditorNotesPanelProps {
  notes: EbookNote[];
  isLoading: boolean;
  addNote: UseMutationResult<void, Error, { pageNumber: number; noteText: string; noteType?: string }>;
  deleteNote: UseMutationResult<void, Error, string>;
  activeChapterIndex: number;
  chapterNames: string[];
  onNavigateToChapter: (chapterIndex: number) => void;
}

export function EbookEditorNotesPanel({
  notes,
  isLoading,
  addNote,
  deleteNote,
  activeChapterIndex,
  chapterNames,
  onNavigateToChapter,
}: EbookEditorNotesPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredNotes = showAll
    ? notes
    : notes.filter((n) => n.page_number === activeChapterIndex);

  const handleAdd = () => {
    const text = newNote.trim();
    if (!text) return;
    addNote.mutate(
      { pageNumber: activeChapterIndex, noteText: text, noteType: "note" },
      { onSuccess: () => setNewNote("") }
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter toggle */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <Button
          variant={showAll ? "outline" : "default"}
          size="sm"
          className="text-xs h-7 flex-1"
          onClick={() => setShowAll(false)}
        >
          Capítulo actual
        </Button>
        <Button
          variant={showAll ? "default" : "outline"}
          size="sm"
          className="text-xs h-7 flex-1"
          onClick={() => setShowAll(true)}
        >
          <Filter className="h-3 w-3 mr-1" />
          Todas
        </Button>
      </div>

      {/* Add note form */}
      <div className="px-3 pb-2 space-y-1.5">
        <Textarea
          placeholder="Adicionar nota ao capítulo…"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="text-xs min-h-[60px] resize-none bg-background"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          disabled={!newNote.trim() || addNote.isPending}
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar nota
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-2">
          {isLoading && (
            <p className="text-xs text-muted-foreground text-center py-4">A carregar…</p>
          )}
          {!isLoading && filteredNotes.length === 0 && (
            <div className="text-center py-6">
              <StickyNote className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {showAll ? "Sem notas neste eBook" : "Sem notas neste capítulo"}
              </p>
            </div>
          )}
          {filteredNotes.map((note) => {
            const isOtherChapter = note.page_number !== activeChapterIndex;
            const isHighlight = note.note_type === "highlight" && note.highlight_text;
            return (
              <div
                key={note.id}
                className={cn(
                  "rounded-md border p-2 text-xs space-y-1 bg-background",
                  isOtherChapter && "cursor-pointer hover:border-primary/40 opacity-80"
                )}
                onClick={() => {
                  if (isOtherChapter) onNavigateToChapter(note.page_number);
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {isHighlight && <Highlighter className="h-3 w-3 text-amber-500" />}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {chapterNames[note.page_number] || `Cap. ${note.page_number + 1}`}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote.mutate(note.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {isHighlight && (
                  <div
                    className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded italic line-clamp-2"
                    style={{ backgroundColor: `${note.highlight_color || "#fde68a"}33` }}
                  >
                    "{note.highlight_text}"
                  </div>
                )}
                <p className="text-foreground/90 leading-relaxed">{note.note_text}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(note.created_at), "d MMM, HH:mm", { locale: pt })}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

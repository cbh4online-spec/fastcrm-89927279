import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, StickyNote, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EbookNote } from "@/hooks/useEbookNotes";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface EbookNotesPanelProps {
  notes: EbookNote[];
  currentPage: number;
  totalPages: number;
  onAddNote: (params: { pageNumber: number; noteText: string; noteType?: string }) => void;
  onDeleteNote: (noteId: string) => void;
  onGoToPage: (page: number) => void;
  onClose: () => void;
  isAdding?: boolean;
}

export function EbookNotesPanel({
  notes, currentPage, totalPages, onAddNote, onDeleteNote, onGoToPage, onClose, isAdding,
}: EbookNotesPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showForm && textareaRef.current) textareaRef.current.focus();
  }, [showForm]);

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    onAddNote({ pageNumber: currentPage, noteText: newNote.trim() });
    setNewNote("");
    setShowForm(false);
  };

  // Group notes by page
  const grouped = notes.reduce<Record<number, EbookNote[]>>((acc, n) => {
    (acc[n.page_number] ??= []).push(n);
    return acc;
  }, {});

  const sortedPages = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="w-72 bg-slate-900/95 backdrop-blur-md border-l border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-white">Notas</span>
          <span className="text-xs text-white/40 tabular-nums">({notes.length})</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Add note button */}
      <div className="px-3 py-2 border-b border-white/5">
        {showForm ? (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={`Nota para a página ${currentPage + 1}...`}
              className="min-h-[80px] bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                if (e.key === "Escape") { setShowForm(false); setNewNote(""); }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30">⌘+Enter para guardar</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setNewNote(""); }} className="h-7 text-xs text-white/50 hover:text-white">
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={!newNote.trim() || isAdding} className="h-7 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20">
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowForm(true)}
            className="w-full justify-start gap-2 h-8 text-xs text-white/50 hover:text-white hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar nota na página {currentPage + 1}
          </Button>
        )}
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {sortedPages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Sem notas ainda</p>
              <p className="text-[10px] mt-1">Clique em "+" para adicionar</p>
            </div>
          )}
          {sortedPages.map((pageNum) => (
            <div key={pageNum}>
              <button
                onClick={() => onGoToPage(pageNum)}
                className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1 px-1 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Página {pageNum + 1}
              </button>
              <div className="space-y-1">
                {grouped[pageNum].map((note) => (
                  <div
                    key={note.id}
                    className={`group rounded-lg p-2.5 text-sm transition-colors cursor-pointer ${
                      note.page_number === currentPage
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-white/5 border border-transparent hover:bg-white/8 hover:border-white/10"
                    }`}
                    onClick={() => onGoToPage(note.page_number)}
                  >
                    <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">{note.note_text}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-white/25">
                        {format(new Date(note.created_at), "d MMM, HH:mm", { locale: pt })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

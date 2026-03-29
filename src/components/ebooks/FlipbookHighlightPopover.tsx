import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Highlighter, X } from "lucide-react";

const HIGHLIGHT_COLORS = [
  { label: "Amarelo", value: "#fde68a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Azul", value: "#bfdbfe" },
  { label: "Rosa", value: "#fbcfe8" },
];

interface FlipbookHighlightPopoverProps {
  selectedText: string;
  position: { x: number; y: number };
  onHighlight: (params: { highlightText: string; highlightColor: string; noteText: string }) => void;
  onClose: () => void;
}

export function FlipbookHighlightPopover({
  selectedText,
  position,
  onHighlight,
  onClose,
}: FlipbookHighlightPopoverProps) {
  const [color, setColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [noteText, setNoteText] = useState("");
  const [showNote, setShowNote] = useState(false);

  const handleSave = () => {
    onHighlight({ highlightText: selectedText, highlightColor: color, noteText: noteText.trim() });
    onClose();
  };

  return (
    <div
      className="absolute z-50 bg-slate-800 border border-white/20 rounded-lg shadow-2xl p-3 min-w-[240px] max-w-[320px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, 8px)",
        pointerEvents: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-white/80">
          <Highlighter className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Sublinhar</span>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40 hover:text-white" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Selected text preview */}
      <div className="text-[11px] text-white/50 bg-white/5 rounded px-2 py-1.5 mb-2 line-clamp-2 italic">
        "{selectedText}"
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] text-white/40 mr-1">Cor:</span>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.value}
            className={`w-5 h-5 rounded-full border-2 transition-all ${color === c.value ? "border-white scale-110" : "border-transparent hover:border-white/40"}`}
            style={{ backgroundColor: c.value }}
            onClick={() => setColor(c.value)}
            title={c.label}
          />
        ))}
      </div>

      {/* Optional note */}
      {showNote ? (
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Adicionar nota (opcional)…"
          className="min-h-[60px] text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none mb-2"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
          }}
        />
      ) : (
        <button
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors mb-2"
          onClick={() => setShowNote(true)}
        >
          + Adicionar nota
        </button>
      )}

      {/* Save */}
      <Button
        size="sm"
        className="w-full h-7 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20"
        onClick={handleSave}
      >
        Sublinhar
      </Button>
    </div>
  );
}

import type { EbookTemplate } from "@/types/ebook-templates";
import { LAYOUT_LABELS, CATEGORY_LABELS } from "@/types/ebook-templates";
import { BlockRenderer } from "@/components/ebooks/blocks/BlockRenderer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  template: EbookTemplate | null;
  open: boolean;
  onClose: () => void;
  onUse: (t: EbookTemplate) => void;
  onDuplicate?: (t: EbookTemplate) => void;
}

export function TemplatePreviewModal({ template, open, onClose, onUse, onDuplicate }: Props) {
  const [currentPage, setCurrentPage] = useState(0);

  if (!template) return null;

  const layouts = template.page_layouts;
  const total = layouts.length;
  const currentLayout = layouts[currentPage];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div>
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[template.category]}</Badge>
              <span className="text-xs text-muted-foreground">{total} páginas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDuplicate && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { onDuplicate(template); onClose(); }}>
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </Button>
            )}
            <Button size="sm" className="gap-1" onClick={() => { onUse(template); onClose(); }}>
              <Check className="h-3.5 w-3.5" /> Usar Template
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Page list sidebar */}
          <ScrollArea className="w-56 border-r border-border/40 bg-muted/20">
            <div className="p-3 space-y-2">
              {layouts.map((lk, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                    i === currentPage
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="font-medium">{i + 1}.</span> {LAYOUT_LABELS[lk] || lk}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 p-8 overflow-auto">
            <div className="bg-white shadow-2xl rounded-lg overflow-hidden w-full max-w-2xl" style={{ aspectRatio: "1/1.414" }}>
              <ScrollArea className="h-full">
                <BlockRenderer
                  layoutKey={currentLayout}
                  content={template.default_content as Record<string, unknown>}
                  styleTokens={template.style_tokens}
                />
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-border/40">
          <Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">{currentPage + 1} / {total}</span>
          <Button variant="ghost" size="sm" disabled={currentPage >= total - 1} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, BookOpen, Globe, Upload, Wand2, Coins, Loader2,
  Play, Settings, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Ebook } from "@/hooks/useEbooks";

interface EbookEditorHeaderProps {
  ebook: Ebook;
  onBack: () => void;
  onUpdateTitle: (title: string) => void;
  onGenerateCoverAI: () => void;
  onUploadCover: () => void;
  onPreview: () => void;
  onPublish: () => void;
  generatingCoverAI: boolean;
  uploadingCover: boolean;
  getCost: (key: string) => number;
}

export function EbookEditorHeader({
  ebook, onBack, onUpdateTitle, onGenerateCoverAI, onUploadCover,
  onPreview, onPublish, generatingCoverAI, uploadingCover, getCost,
}: EbookEditorHeaderProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-card/80 backdrop-blur shrink-0 h-12">
      <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent">
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <Input
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={() => { onUpdateTitle(tempTitle); setEditingTitle(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onUpdateTitle(tempTitle); setEditingTitle(false); } }}
            autoFocus
            className="text-sm font-semibold h-auto py-0 border-none shadow-none focus-visible:ring-0 px-0 bg-transparent"
          />
        ) : (
          <h1
            className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors truncate"
            onClick={() => { setTempTitle(ebook.title); setEditingTitle(true); }}
          >
            {ebook.title}
          </h1>
        )}
      </div>

      <Badge className={cn("text-xs shrink-0",
        ebook.status === "published" ? "bg-emerald-500/90 text-white border-0" : "bg-amber-500/90 text-white border-0"
      )}>
        {ebook.status === "published" ? "Publicado" : ebook.status === "archived" ? "Arquivado" : "Rascunho"}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/40">
            <Settings className="h-3.5 w-3.5" />
            Definições
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onGenerateCoverAI} disabled={generatingCoverAI}>
            {generatingCoverAI ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-2" />}
            Gerar Capa IA
            <span className="ml-auto text-[10px] opacity-60 flex items-center gap-0.5"><Coins className="h-2.5 w-2.5" />{getCost("ebook_generate_cover")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUploadCover} disabled={uploadingCover}>
            {uploadingCover ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
            Upload de Capa
          </DropdownMenuItem>
          {ebook.slug && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.open(`/ebook/${ebook.slug}`, "_blank")}>
                <Globe className="h-3.5 w-3.5 mr-2" /> Ver publicação
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/40" onClick={onPreview}>
        <Play className="h-3.5 w-3.5" /> Pré-visualizar
      </Button>

      {ebook.status !== "published" && (
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-gradient-to-r from-primary to-primary/80" onClick={onPublish}>
          <BookOpen className="h-3.5 w-3.5" /> Publicar
        </Button>
      )}
    </div>
  );
}

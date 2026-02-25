import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/icons';
import { LIBRARY_CATEGORIES, LIBRARY_TEMPLATES, type LibraryTemplate, type LibraryCategory } from './templateLibraryData';
import { TemplateLibraryCard } from './TemplateLibraryCard';

interface TemplateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: LibraryTemplate) => void;
}

export function TemplateLibraryDialog({ open, onOpenChange, onSelectTemplate }: TemplateLibraryDialogProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<LibraryTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const filtered = useMemo(() => {
    let result = LIBRARY_TEMPLATES;
    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.fields.some((f) => f.name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [search, activeCategory]);

  const handleUse = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
      setShowPreview(false);
      setSearch('');
      setActiveCategory('all');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Biblioteca de Templates</h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left sidebar */}
          <div className="w-[200px] border-r flex flex-col py-4 shrink-0">
            <div className="px-4 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Casos de Uso
              </span>
            </div>
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                activeCategory === 'all'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              Todos
            </button>
            {LIBRARY_CATEGORIES.map((cat) => {
              const Icon = getIconByName(cat.icon);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    activeCategory === cat.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search bar */}
            <div className="px-6 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar templates, tópicos, objetivos..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Template list or preview */}
            {showPreview && selectedTemplate ? (
              <div className="flex-1 flex flex-col p-6 overflow-auto">
                <Button variant="ghost" size="sm" className="self-start mb-4" onClick={() => setShowPreview(false)}>
                  ← Voltar à lista
                </Button>
                <h3 className="text-lg font-semibold mb-1">{selectedTemplate.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{selectedTemplate.description}</p>
                {selectedTemplate.subject && (
                  <div className="mb-3">
                    <span className="text-xs text-muted-foreground">Assunto:</span>
                    <p className="text-sm font-medium">{selectedTemplate.subject}</p>
                  </div>
                )}
                <div className="rounded-lg border p-4 bg-muted/30">
                  <span className="text-xs text-muted-foreground block mb-2">Corpo:</span>
                  <pre className="whitespace-pre-wrap text-sm font-sans">{selectedTemplate.body}</pre>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Search className="h-8 w-8 mb-3 opacity-40" />
                      <p className="text-sm">Nenhum template encontrado</p>
                    </div>
                  ) : (
                    filtered.map((t) => (
                      <TemplateLibraryCard
                        key={t.id}
                        template={t}
                        isSelected={selectedTemplate?.id === t.id}
                        onClick={() => setSelectedTemplate(t)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
            <span className="text-sm text-muted-foreground">
              Selecionado: <strong>{selectedTemplate.name}</strong>
            </span>
            <div className="flex gap-2">
              {!showPreview && (
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  Pré-visualizar
                </Button>
              )}
              <Button size="sm" onClick={handleUse}>
                Usar template
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Edit, 
  Save,
  CheckCircle2,
  Archive,
  Trash2,
  Loader2,
  BarChart3,
  Clock,
  User,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { 
  KnowledgeEntry,
  EntryType, 
  KnowledgeContext,
  ContentVisibility,
  ENTRY_TYPE_CONFIG, 
  ENTRY_STATUS_CONFIG,
  CONTEXT_CONFIG
} from '@/types/knowledge-base';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface EntryDetailSheetProps {
  entry: KnowledgeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (entryId: string, data: Partial<KnowledgeEntry>) => Promise<void>;
  onValidate?: (entryId: string) => Promise<void>;
  onArchive?: (entryId: string) => Promise<void>;
  onDelete?: (entryId: string) => Promise<void>;
  isLoading?: boolean;
}

export function EntryDetailSheet({
  entry,
  open,
  onOpenChange,
  onUpdate,
  onValidate,
  onArchive,
  onDelete,
  isLoading
}: EntryDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<Partial<KnowledgeEntry>>({});

  if (!entry) return null;

  const statusConfig = ENTRY_STATUS_CONFIG[entry.status];
  const typeConfig = ENTRY_TYPE_CONFIG[entry.entryType];
  const contextConfig = entry.context ? CONTEXT_CONFIG[entry.context] : null;

  const handleStartEdit = () => {
    setEditedEntry({
      title: entry.title,
      question: entry.question,
      content: entry.content,
      category: entry.category,
      context: entry.context,
      visibility: entry.visibility,
      internalNotes: entry.internalNotes
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!onUpdate) return;
    await onUpdate(entry.id, editedEntry);
    setIsEditing(false);
  };

  const handleValidate = async () => {
    if (!onValidate) return;
    await onValidate(entry.id);
  };

  const handleArchive = async () => {
    if (!onArchive) return;
    await onArchive(entry.id);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm('Tens a certeza que queres eliminar esta entrada?')) {
      await onDelete(entry.id);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-left pr-8">
                {isEditing ? 'Editar Entrada' : entry.title}
              </SheetTitle>
              <SheetDescription className="text-left mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{typeConfig.label}</Badge>
                  <Badge className={cn(statusConfig.bgColor, statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                  {contextConfig && (
                    <Badge variant="outline" className={contextConfig.color}>
                      {contextConfig.label}
                    </Badge>
                  )}
                </div>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {entry.status === 'draft' && !isEditing && (
                <Button 
                  size="sm" 
                  onClick={handleValidate}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Validar
                </Button>
              )}
              {!isEditing && (
                <Button size="sm" variant="outline" onClick={handleStartEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {isEditing && (
                <>
                  <Button size="sm" onClick={handleSaveEdit} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {entry.status !== 'archived' && (
                <Button size="sm" variant="ghost" onClick={handleArchive}>
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Validation Warning */}
          {entry.status === 'draft' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-400">
                Esta entrada está em rascunho e não será usada pela IA até ser validada.
              </span>
            </div>
          )}

          <Separator />

          {/* Content */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={editedEntry.title || ''}
                  onChange={(e) => setEditedEntry({ ...editedEntry, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              {entry.entryType === 'faq' && (
                <div>
                  <Label>Pergunta</Label>
                  <Input
                    value={editedEntry.question || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, question: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label>Conteúdo</Label>
                <Textarea
                  value={editedEntry.content || ''}
                  onChange={(e) => setEditedEntry({ ...editedEntry, content: e.target.value })}
                  className="mt-1 min-h-[200px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={editedEntry.category || ''}
                    onChange={(e) => setEditedEntry({ ...editedEntry, category: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Contexto</Label>
                  <Select 
                    value={editedEntry.context || 'geral'} 
                    onValueChange={(v) => setEditedEntry({ ...editedEntry, context: v as KnowledgeContext })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTEXT_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observações Internas</Label>
                <Textarea
                  value={editedEntry.internalNotes || ''}
                  onChange={(e) => setEditedEntry({ ...editedEntry, internalNotes: e.target.value })}
                  className="mt-1 min-h-[80px]"
                  placeholder="Notas visíveis apenas para a equipa..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {entry.question && (
                <div>
                  <Label className="text-muted-foreground">Pergunta</Label>
                  <p className="text-primary font-medium mt-1">{entry.question}</p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Conteúdo</Label>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg whitespace-pre-wrap">
                  {entry.content}
                </div>
              </div>

              {entry.category && (
                <div>
                  <Label className="text-muted-foreground">Categoria</Label>
                  <p className="mt-1">{entry.category}</p>
                </div>
              )}

              {entry.internalNotes && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    Observações Internas
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground italic">
                    {entry.internalNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Criado: {format(new Date(entry.createdAt), "d MMM yyyy", { locale: pt })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Atualizado: {format(new Date(entry.updatedAt), "d MMM yyyy", { locale: pt })}</span>
            </div>
            {entry.validatedAt && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Validado: {format(new Date(entry.validatedAt), "d MMM yyyy", { locale: pt })}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>{entry.usageCount || 0} utilizações</span>
            </div>
          </div>

          {/* Keywords */}
          {entry.keywords && entry.keywords.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Palavras-chave</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

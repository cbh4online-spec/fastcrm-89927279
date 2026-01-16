import { useState } from 'react';
import {
  Zap,
  HelpCircle,
  ListChecks,
  Trophy,
  Plus,
  Trash2,
  Users,
  User,
  Building,
  Globe,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FeedType, PostType, ChecklistItem, useInternalFeed } from '@/hooks/useInternalFeed';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFeedType?: FeedType;
}

const POST_TYPES: { type: PostType; label: string; icon: React.ElementType; description: string }[] = [
  { type: 'update', label: 'Update', icon: Zap, description: 'Partilhar uma atualização rápida' },
  { type: 'help_request', label: 'Pedido de Ajuda', icon: HelpCircle, description: 'Pedir ajuda à equipa' },
  { type: 'daily_checklist', label: 'Checklist', icon: ListChecks, description: 'Lista de tarefas do dia' },
  { type: 'winners', label: 'Vencedores', icon: Trophy, description: 'Celebrar conquistas' },
];

const FEED_TYPES: { type: FeedType; label: string; icon: React.ElementType }[] = [
  { type: 'workspace', label: 'Workspace', icon: Globe },
  { type: 'team', label: 'Equipa', icon: Users },
  { type: 'user', label: 'Pessoal', icon: User },
  { type: 'client', label: 'Cliente', icon: Building },
];

export function CreatePostModal({ open, onOpenChange, defaultFeedType = 'workspace' }: CreatePostModalProps) {
  const { createPost } = useInternalFeed();

  const [feedType, setFeedType] = useState<FeedType>(defaultFeedType);
  const [postType, setPostType] = useState<PostType>('update');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');

  const handleAddChecklistItem = () => {
    if (newItem.trim()) {
      setChecklistItems([
        ...checklistItems,
        { id: crypto.randomUUID(), text: newItem.trim(), completed: false },
      ]);
      setNewItem('');
    }
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    await createPost.mutateAsync({
      feed_type: feedType,
      post_type: postType,
      title: title || undefined,
      content,
      checklist_items: postType === 'daily_checklist' ? checklistItems : undefined,
    });

    // Reset form
    setTitle('');
    setContent('');
    setChecklistItems([]);
    setPostType('update');
    onOpenChange(false);
  };

  const isValid = content.trim().length > 0 || (postType === 'daily_checklist' && checklistItems.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Publicação</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feed Type */}
          <div className="space-y-2">
            <Label>Publicar em</Label>
            <div className="flex gap-2">
              {FEED_TYPES.map((feed) => {
                const Icon = feed.icon;
                return (
                  <Button
                    key={feed.type}
                    variant={feedType === feed.type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFeedType(feed.type)}
                    className="flex-1"
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {feed.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Post Type */}
          <div className="space-y-2">
            <Label>Tipo de publicação</Label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map((pt) => {
                const Icon = pt.icon;
                return (
                  <button
                    key={pt.type}
                    onClick={() => setPostType(pt.type)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                      postType === pt.type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg',
                      postType === pt.type ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pt.label}</p>
                      <p className="text-xs text-muted-foreground">{pt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title (optional) */}
          <div className="space-y-2">
            <Label>Título (opcional)</Label>
            <Input
              placeholder="Título da publicação..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          {postType !== 'daily_checklist' && (
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                placeholder="Escreve a tua mensagem... Usa @nome para mencionar alguém"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Checklist Items */}
          {postType === 'daily_checklist' && (
            <div className="space-y-2">
              <Label>Itens da Checklist</Label>
              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="flex-1 text-sm">{item.text}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar item..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                  />
                  <Button variant="outline" size="icon" onClick={handleAddChecklistItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Optional description for checklist */}
              <div className="space-y-2 mt-4">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Adicionar contexto..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || createPost.isPending}>
              {createPost.isPending ? 'A publicar...' : 'Publicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

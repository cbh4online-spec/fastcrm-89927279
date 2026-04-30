import { useState } from 'react';
import { Send, Sparkles, Target, MessageSquare, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TeamFeedPost } from '@/hooks/useMeetingAutomations';

type PostType = TeamFeedPost['post_type'];

interface TeamFeedComposerProps {
  onSubmit: (input: {
    title: string;
    content: string;
    post_type: PostType;
  }) => Promise<boolean>;
}

const TYPE_OPTIONS: { value: PostType; label: string; icon: typeof Sparkles }[] = [
  { value: 'update', label: 'Atualização', icon: MessageSquare },
  { value: 'announcement', label: 'Anúncio', icon: Sparkles },
  { value: 'achievement', label: 'Conquista', icon: Target },
  { value: 'question', label: 'Pergunta', icon: HelpCircle },
];

export function TeamFeedComposer({ onSubmit }: TeamFeedComposerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>('update');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = await onSubmit({ title, content, post_type: type });
    setSubmitting(false);
    if (ok) {
      setTitle('');
      setContent('');
      setType('update');
    }
  };

  const disabled = submitting || !title.trim() || !content.trim();

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => setType(v as PostType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Input
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              className="flex-1"
            />
          </div>
          <Textarea
            placeholder="Escreve uma mensagem para a equipa…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {content.length}/2000
            </span>
            <Button type="submit" size="sm" disabled={disabled} className="gap-2">
              <Send className="h-4 w-4" />
              {submitting ? 'A publicar…' : 'Publicar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

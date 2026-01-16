import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  MoreHorizontal,
  Pin,
  Trash2,
  CheckCircle,
  MessageCircle,
  Heart,
  ThumbsUp,
  Smile,
  Zap,
  AlertTriangle,
  HelpCircle,
  ListChecks,
  Trophy,
  Bot,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Post, PostType, ChecklistItem, useInternalFeed } from '@/hooks/useInternalFeed';
import { useAuth } from '@/contexts/AuthContext';

interface PostCardProps {
  post: Post;
  onViewComments: (post: Post) => void;
}

const POST_TYPE_CONFIG: Record<PostType, { label: string; icon: React.ElementType; color: string }> = {
  update: { label: 'Update', icon: Zap, color: 'bg-blue-500/10 text-blue-500' },
  help_request: { label: 'Pedido de Ajuda', icon: HelpCircle, color: 'bg-orange-500/10 text-orange-500' },
  daily_checklist: { label: 'Checklist do Dia', icon: ListChecks, color: 'bg-purple-500/10 text-purple-500' },
  winners: { label: 'Vencedores do Dia', icon: Trophy, color: 'bg-yellow-500/10 text-yellow-500' },
  ai_alert: { label: 'Alerta IA', icon: Bot, color: 'bg-emerald-500/10 text-emerald-500' },
};

const REACTIONS = [
  { type: 'like', icon: ThumbsUp, label: '👍' },
  { type: 'love', icon: Heart, label: '❤️' },
  { type: 'celebrate', icon: Trophy, label: '🎉' },
  { type: 'laugh', icon: Smile, label: '😄' },
];

export function PostCard({ post, onViewComments }: PostCardProps) {
  const { user } = useAuth();
  const { togglePin, resolvePost, deletePost, addReaction, removeReaction, updateChecklist } = useInternalFeed();
  const [showReactions, setShowReactions] = useState(false);

  const config = POST_TYPE_CONFIG[post.post_type];
  const Icon = config.icon;

  const userReactions = post.reactions?.filter((r) => r.user_id === user?.id) || [];
  const reactionCounts = REACTIONS.map((r) => ({
    ...r,
    count: post.reactions?.filter((pr) => pr.reaction_type === r.type).length || 0,
    hasReacted: userReactions.some((ur) => ur.reaction_type === r.type),
  }));

  const handleReaction = (reactionType: string) => {
    const hasReacted = userReactions.some((r) => r.reaction_type === reactionType);
    if (hasReacted) {
      removeReaction.mutate({ post_id: post.id, reaction_type: reactionType });
    } else {
      addReaction.mutate({ post_id: post.id, reaction_type: reactionType });
    }
    setShowReactions(false);
  };

  const handleChecklistToggle = (itemId: string) => {
    const updatedItems = post.checklist_items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateChecklist.mutate({ id: post.id, checklist_items: updatedItems });
  };

  const completedCount = post.checklist_items.filter((i) => i.completed).length;
  const totalCount = post.checklist_items.length;

  return (
    <Card className={cn(
      'transition-all',
      post.is_pinned && 'border-primary/50 bg-primary/5',
      post.is_resolved && 'opacity-60'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {post.author_id.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Utilizador</span>
                {post.is_pinned && (
                  <Pin className="h-3 w-3 text-primary" />
                )}
                {post.ai_generated && (
                  <Badge variant="outline" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    IA
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={config.color}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>

            {post.author_id === user?.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => togglePin.mutate({ id: post.id, is_pinned: !post.is_pinned })}>
                    <Pin className="h-4 w-4 mr-2" />
                    {post.is_pinned ? 'Desafixar' : 'Fixar'}
                  </DropdownMenuItem>
                  {post.post_type === 'help_request' && (
                    <DropdownMenuItem onClick={() => resolvePost.mutate({ id: post.id, is_resolved: !post.is_resolved })}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {post.is_resolved ? 'Reabrir' : 'Resolver'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => deletePost.mutate(post.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.title && (
          <h3 className="font-semibold text-lg">{post.title}</h3>
        )}

        <p className="text-sm whitespace-pre-wrap">{post.content}</p>

        {/* Checklist */}
        {post.post_type === 'daily_checklist' && post.checklist_items.length > 0 && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span className="text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-2 mt-3">
              {post.checklist_items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => handleChecklistToggle(item.id)}
                  />
                  <span className={cn('text-sm', item.completed && 'line-through text-muted-foreground')}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved badge */}
        {post.is_resolved && (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolvido
          </Badge>
        )}

        {/* Attachments */}
        {post.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Paperclip className="h-3 w-3" />
                {attachment.name}
              </a>
            ))}
          </div>
        )}

        {/* Reactions and comments */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <Popover open={showReactions} onOpenChange={setShowReactions}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Smile className="h-4 w-4 mr-1" />
                  Reagir
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1">
                  {REACTIONS.map((reaction) => (
                    <Button
                      key={reaction.type}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-lg"
                      onClick={() => handleReaction(reaction.type)}
                    >
                      {reaction.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {reactionCounts.filter((r) => r.count > 0).map((reaction) => (
              <Button
                key={reaction.type}
                variant={reaction.hasReacted ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleReaction(reaction.type)}
              >
                {reaction.label} {reaction.count}
              </Button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => onViewComments(post)}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {post.comments_count || 0} comentários
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

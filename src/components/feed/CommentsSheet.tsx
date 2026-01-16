import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Send, CornerDownRight, Trash2, Smile, ThumbsUp, Heart, Trophy } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Post, PostComment, usePostComments } from '@/hooks/useInternalFeed';
import { useAuth } from '@/contexts/AuthContext';

interface CommentsSheetProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REACTIONS = [
  { type: 'like', label: '👍' },
  { type: 'love', label: '❤️' },
  { type: 'celebrate', label: '🎉' },
];

function CommentItem({
  comment,
  onReply,
  onDelete,
  onReaction,
  depth = 0,
}: {
  comment: PostComment;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReaction: (commentId: string, reaction: string) => void;
  depth?: number;
}) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);

  const reactionCounts = REACTIONS.map((r) => ({
    ...r,
    count: comment.reactions?.filter((pr) => pr.reaction_type === r.type).length || 0,
    hasReacted: comment.reactions?.some((pr) => pr.user_id === user?.id && pr.reaction_type === r.type),
  }));

  return (
    <div className={cn('space-y-2', depth > 0 && 'ml-8 pl-4 border-l')}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {comment.author_id.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Utilizador</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: pt })}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-muted-foreground">(editado)</span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-1">
            <Popover open={showReactions} onOpenChange={setShowReactions}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-1 text-xs">
                  <Smile className="h-3 w-3 mr-1" />
                  Reagir
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1" align="start">
                <div className="flex gap-1">
                  {REACTIONS.map((reaction) => (
                    <Button
                      key={reaction.type}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        onReaction(comment.id, reaction.type);
                        setShowReactions(false);
                      }}
                    >
                      {reaction.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {reactionCounts.filter((r) => r.count > 0).map((reaction) => (
              <span key={reaction.type} className="text-xs">
                {reaction.label} {reaction.count}
              </span>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-xs"
              onClick={() => onReply(comment.id)}
            >
              <CornerDownRight className="h-3 w-3 mr-1" />
              Responder
            </Button>

            {comment.author_id === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              onReaction={onReaction}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsSheet({ post, open, onOpenChange }: CommentsSheetProps) {
  const { comments, isLoading, addComment, deleteComment, addCommentReaction } = usePostComments(post?.id || null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await addComment.mutateAsync({
      content: newComment,
      parent_comment_id: replyingTo || undefined,
    });

    setNewComment('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  const handleDelete = (commentId: string) => {
    deleteComment.mutate(commentId);
  };

  const handleReaction = (commentId: string, reaction: string) => {
    addCommentReaction.mutate({ comment_id: commentId, reaction_type: reaction });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Comentários</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                A carregar comentários...
              </p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem comentários. Sê o primeiro!
              </p>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  onReaction={handleReaction}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* New comment input */}
        <div className="pt-4 border-t space-y-2">
          {replyingTo && (
            <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
              <span>A responder a um comentário</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setReplyingTo(null)}
              >
                Cancelar
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Escreve um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0"
              onClick={handleSubmit}
              disabled={!newComment.trim() || addComment.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

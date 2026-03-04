import { useState } from "react";
import { useContextComments, useCreateComment, useDeleteComment } from "@/hooks/useContextComments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  blockId: string;
}

export function ContextCommentsTab({ blockId }: Props) {
  const { data: comments, isLoading } = useContextComments(blockId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment.mutate(
      { blockId, content: newComment.trim() },
      { onSuccess: () => setNewComment("") }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {(!comments || comments.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem comentários. Seja o primeiro a comentar.
          </p>
        )}
        {(comments || []).map(c => (
          <div
            key={c.id}
            className={cn(
              "flex gap-3 p-3 rounded-lg",
              "bg-muted/10 border border-border/30"
            )}
          >
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={c.user_avatar || undefined} />
              <AvatarFallback className="text-[10px] bg-gold/10 text-gold">
                {(c.user_name || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{c.user_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(c.created_at), "d MMM, HH:mm", { locale: pt })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{c.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
              onClick={() => deleteComment.mutate({ commentId: c.id, blockId })}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* New comment input */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar comentário... (Ctrl+Enter para enviar)"
          className="min-h-[60px] bg-background/50 border-border/50 text-sm flex-1"
          rows={2}
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim() || createComment.isPending}
          size="sm"
          className="self-end bg-gold hover:bg-gold/90 text-gold-foreground"
        >
          {createComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

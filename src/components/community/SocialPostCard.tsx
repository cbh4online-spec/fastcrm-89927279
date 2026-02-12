import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { MessageSquare, Heart, Eye, Pin, Lock, Share2, ThumbsUp, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useForumReactionCounts, useUserReaction } from "@/hooks/useForum";
import { useToggleForumReaction } from "@/hooks/useForumReactions";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SocialPostCardProps {
  topic: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_locked: boolean;
    views_count: number;
    replies_count: number;
    created_at: string;
    category_id: string | null;
    author_name?: string;
    author_avatar?: string | null;
  };
  categoryName?: string;
  categoryIcon?: string;
  authorName?: string;
  isAnonymous?: boolean;
  onClick: () => void;
}

function highlightHashtags(text: string) {
  return text.replace(/(#\w+)/g, "**$1**").split(/(\*\*#\w+\*\*)/g).map((part, i) => {
    if (part.startsWith("**#") && part.endsWith("**")) {
      return (
        <span key={i} className="text-primary font-semibold">
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

const REACTION_TYPES = [
  { type: "like", icon: Heart, label: "Gosto" },
  { type: "insightful", icon: Lightbulb, label: "Útil" },
];

export function SocialPostCard({ topic, categoryName, categoryIcon, authorName, isAnonymous, onClick }: SocialPostCardProps) {
  const displayName = isAnonymous ? "Membro Anónimo" : (topic.author_name || authorName || "Membro");
  const avatarInitial = isAnonymous ? "?" : displayName.charAt(0).toUpperCase();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const toggleReaction = useToggleForumReaction(currentWorkspace?.id);
  const { data: reactionCounts = {} } = useForumReactionCounts(topic.id);
  const { data: userReaction } = useUserReaction(topic.id);

  const totalLikes = (reactionCounts["like"] || 0) + (reactionCounts["love"] || 0) + (reactionCounts["insightful"] || 0);

  const handleReaction = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    if (!user) { toast.error("Inicia sessão para reagir."); return; }
    toggleReaction.mutate({ topicId: topic.id, reactionType: type });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/dashboard/fastclub/forum/${topic.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border transition-all group hover:shadow-md",
        topic.is_pinned
          ? "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06]"
          : "bg-card hover:bg-muted/30"
      )}
    >
      <div className="p-4">
        {/* Header: avatar + author + category */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 shrink-0">
            {topic.author_avatar && <AvatarImage src={topic.author_avatar} alt={displayName} />}
            <AvatarFallback className={cn(
              "font-bold text-sm",
              isAnonymous
                ? "bg-muted text-muted-foreground"
                : "bg-gradient-to-br from-primary/20 to-primary/40 text-primary"
            )}>
              {avatarInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-sm font-semibold", isAnonymous ? "text-muted-foreground italic" : "text-foreground")}>
                {displayName}
              </span>
              {categoryName && (
                <Badge variant="secondary" className="text-[10px] gap-1 font-normal">
                  {categoryIcon && <span>{categoryIcon}</span>}
                  {categoryName}
                </Badge>
              )}
              {topic.is_pinned && (
                <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary">
                  <Pin className="h-2.5 w-2.5" /> Fixo
                </Badge>
              )}
              {topic.is_locked && (
                <Badge variant="outline" className="text-[10px] gap-0.5">
                  <Lock className="h-2.5 w-2.5" /> Fechado
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: pt })}
            </p>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
          {topic.title}
        </h3>

        {/* Content preview with hashtag highlighting */}
        <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
          {highlightHashtags(topic.content.substring(0, 200))}
        </p>

        {/* Actions bar */}
        <div className="flex items-center gap-1 pt-2 border-t border-border/50">
          {REACTION_TYPES.map(r => {
            const isActive = userReaction?.reaction_type === r.type;
            const count = reactionCounts[r.type] || 0;
            return (
              <button
                key={r.type}
                onClick={(e) => handleReaction(e, r.type)}
                className={cn(
                  "flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
              >
                <r.icon className={cn("h-3.5 w-3.5", isActive && "fill-primary")} />
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-full hover:bg-primary/5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{topic.replies_count}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-full hover:bg-primary/5"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <Eye className="h-3.5 w-3.5" />
            <span>{topic.views_count}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { MessageSquare, Heart, Eye, Pin, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

export function SocialPostCard({ topic, categoryName, categoryIcon, authorName, isAnonymous, onClick }: SocialPostCardProps) {
  const displayName = isAnonymous ? "Membro Anónimo" : (authorName || "Membro");
  const avatarInitial = isAnonymous ? "?" : displayName.charAt(0).toUpperCase();
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
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
            isAnonymous
              ? "bg-muted text-muted-foreground"
              : "bg-gradient-to-br from-primary/20 to-primary/40 text-primary"
          )}>
            {avatarInitial}
          </div>
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
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Heart className="h-3.5 w-3.5" />
            <span>{topic.views_count}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{topic.replies_count}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <Eye className="h-3.5 w-3.5" />
            <span>{topic.views_count}</span>
          </span>
        </div>
      </div>
    </button>
  );
}

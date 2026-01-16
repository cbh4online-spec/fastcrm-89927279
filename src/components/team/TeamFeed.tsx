import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  MessageSquare, 
  ThumbsUp, 
  Heart, 
  Sparkles, 
  Calendar,
  Users,
  Target,
  HelpCircle,
  Pin,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeamFeed, type TeamFeedPost } from '@/hooks/useMeetingAutomations';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const postTypeConfig: Record<TeamFeedPost['post_type'], {
  icon: typeof Calendar;
  label: string;
  color: string;
}> = {
  meeting_summary: {
    icon: Calendar,
    label: 'Resumo de Reunião',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  announcement: {
    icon: Sparkles,
    label: 'Anúncio',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  },
  achievement: {
    icon: Target,
    label: 'Conquista',
    color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  update: {
    icon: MessageSquare,
    label: 'Atualização',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  question: {
    icon: HelpCircle,
    label: 'Pergunta',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  },
};

const reactionEmojis = ['👍', '❤️', '🎉', '🚀', '💡'];

interface TeamFeedProps {
  className?: string;
}

export function TeamFeed({ className }: TeamFeedProps) {
  const { posts, isLoading, addReaction } = useTeamFeed();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Feed da Equipa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Feed da Equipa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ainda não há publicações no feed</p>
            <p className="text-sm">
              Resumos de reuniões internas aparecerão aqui
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Feed da Equipa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map(post => (
          <FeedPostCard 
            key={post.id} 
            post={post} 
            currentUserId={user?.id}
            onReaction={addReaction}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface FeedPostCardProps {
  post: TeamFeedPost;
  currentUserId?: string;
  onReaction: (postId: string, emoji: string) => void;
}

function FeedPostCard({ post, currentUserId, onReaction }: FeedPostCardProps) {
  const [showReactions, setShowReactions] = useState(false);
  const config = postTypeConfig[post.post_type];
  const Icon = config.icon;

  const reactions = post.reactions || {};
  const totalReactions = Object.values(reactions).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {post.user_id.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", config.color)}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {post.is_pinned && (
                <Pin className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(post.created_at), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
            <DropdownMenuItem>Copiar link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div>
        <h4 className="font-medium">{post.title}</h4>
        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Meeting metadata */}
      {post.post_type === 'meeting_summary' && post.metadata && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
          {(post.metadata as any).decisions?.length > 0 && (
            <div>
              <span className="font-medium">Decisões:</span>
              <ul className="list-disc list-inside text-muted-foreground">
                {(post.metadata as any).decisions.map((d: string, i: number) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {(post.metadata as any).action_items?.length > 0 && (
            <div>
              <span className="font-medium">Ações:</span>
              <ul className="list-disc list-inside text-muted-foreground">
                {(post.metadata as any).action_items.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            <ThumbsUp className="h-4 w-4" />
            {totalReactions > 0 && (
              <span className="text-xs">{totalReactions}</span>
            )}
          </Button>
          
          {showReactions && (
            <div 
              className="absolute bottom-full left-0 mb-1 flex gap-1 bg-popover border rounded-full p-1 shadow-lg z-10"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              {reactionEmojis.map(emoji => {
                const hasReacted = reactions[emoji]?.includes(currentUserId || '');
                return (
                  <button
                    key={emoji}
                    onClick={() => onReaction(post.id, emoji)}
                    className={cn(
                      "text-lg hover:scale-125 transition-transform p-1",
                      hasReacted && "bg-primary/10 rounded-full"
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Show existing reactions */}
        {Object.entries(reactions).map(([emoji, userIds]) => (
          <Badge
            key={emoji}
            variant="secondary"
            className={cn(
              "text-xs gap-1 cursor-pointer hover:bg-secondary/80",
              (userIds as string[]).includes(currentUserId || '') && "ring-1 ring-primary"
            )}
            onClick={() => onReaction(post.id, emoji)}
          >
            {emoji} {(userIds as string[]).length}
          </Badge>
        ))}
      </div>
    </div>
  );
}

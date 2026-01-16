import { useState } from 'react';
import {
  Plus,
  Globe,
  Users,
  User,
  Building,
  Bell,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { CommentsSheet } from './CommentsSheet';
import { FeedType, Post, useInternalFeed, useMyMentions } from '@/hooks/useInternalFeed';

const FEED_TABS: { type: FeedType | 'all'; label: string; icon: React.ElementType }[] = [
  { type: 'all', label: 'Tudo', icon: Globe },
  { type: 'workspace', label: 'Workspace', icon: Globe },
  { type: 'team', label: 'Equipa', icon: Users },
  { type: 'user', label: 'Pessoal', icon: User },
  { type: 'client', label: 'Clientes', icon: Building },
];

export function FeedDashboard() {
  const [activeTab, setActiveTab] = useState<FeedType | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const feedType = activeTab === 'all' ? undefined : activeTab;
  const { posts, isLoading } = useInternalFeed(feedType);
  const { mentions, unreadCount } = useMyMentions();

  const filteredPosts = posts.filter((post) => {
    if (filterType === 'all') return true;
    return post.post_type === filterType;
  });

  const handleViewComments = (post: Post) => {
    setSelectedPost(post);
    setCommentsOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold">Mural Interno</h1>
          <p className="text-muted-foreground">
            Comunica com a equipa sem sair do CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Publicação
          </Button>
        </div>
      </div>

      {/* Tabs and filters */}
      <div className="p-4 border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedType | 'all')}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              {FEED_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.type} value={tab.type} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="update">Updates</SelectItem>
                  <SelectItem value="help_request">Pedidos de Ajuda</SelectItem>
                  <SelectItem value="daily_checklist">Checklists</SelectItem>
                  <SelectItem value="winners">Vencedores</SelectItem>
                  <SelectItem value="ai_alert">Alertas IA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Feed content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Sem publicações ainda. Sê o primeiro a partilhar!
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Publicação
              </Button>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onViewComments={handleViewComments}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Modals */}
      <CreatePostModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultFeedType={activeTab === 'all' ? 'workspace' : activeTab}
      />

      <CommentsSheet
        post={selectedPost}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </div>
  );
}

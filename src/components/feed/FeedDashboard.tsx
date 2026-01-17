import { useState, useMemo } from 'react';
import {
  Plus,
  Globe,
  Users,
  User,
  Building,
  Bell,
  RefreshCw,
  MessageSquare,
  Heart,
  Tag,
  AlertCircle,
  CheckSquare,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { CommentsSheet } from './CommentsSheet';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { FilterSidebar, type FilterGroup } from '@/components/common/FilterSidebar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { FeedType, Post, useInternalFeed, useMyMentions } from '@/hooks/useInternalFeed';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const FEED_TABS: { id: FeedType | 'all'; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Tudo', icon: <Globe className="h-4 w-4" /> },
  { id: 'workspace', label: 'Workspace', icon: <Globe className="h-4 w-4" /> },
  { id: 'team', label: 'Equipa', icon: <Users className="h-4 w-4" /> },
  { id: 'user', label: 'Pessoal', icon: <User className="h-4 w-4" /> },
  { id: 'client', label: 'Clientes', icon: <Building className="h-4 w-4" /> },
];

const POST_TYPES = [
  { value: 'update', label: 'Updates', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'help_request', label: 'Pedidos de Ajuda', icon: <AlertCircle className="h-4 w-4" /> },
  { value: 'daily_checklist', label: 'Checklists', icon: <CheckSquare className="h-4 w-4" /> },
  { value: 'winners', label: 'Vencedores', icon: <Trophy className="h-4 w-4" /> },
  { value: 'ai_alert', label: 'Alertas IA', icon: <Sparkles className="h-4 w-4" /> },
];

export function FeedDashboard() {
  // State
  const [activeTab, setActiveTab] = useState<FeedType | 'all'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // UI state
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('created_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // Filters
  const [postTypeFilter, setPostTypeFilter] = useState<string>('all');

  const feedType = activeTab === 'all' ? undefined : activeTab;
  const { posts, isLoading } = useInternalFeed(feedType);
  const { mentions, unreadCount } = useMyMentions();

  // Stats
  const stats = useMemo(() => ({
    total: posts.length,
    updates: posts.filter(p => p.post_type === 'update').length,
    helpRequests: posts.filter(p => p.post_type === 'help_request').length,
    mentions: unreadCount,
  }), [posts, unreadCount]);

  // Filter and sort
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Post type filter
    if (postTypeFilter !== 'all') {
      result = result.filter(post => post.post_type === postTypeFilter);
    }

    // Search
    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(post =>
        post.content?.toLowerCase().includes(query) ||
        post.author?.full_name?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortValue) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'comments_desc':
          return (b.comments_count || 0) - (a.comments_count || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [posts, postTypeFilter, searchValue, sortValue]);

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / pageSize);
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, currentPage, pageSize]);

  // Handlers
  const handleViewComments = (post: Post) => {
    setSelectedPost(post);
    setCommentsOpen(true);
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    setCurrentPage(1);

    const [group, value] = filterId.split('_');

    if (group === 'type') {
      setPostTypeFilter(value);
    }
  };

  const handleClearFilters = () => {
    setActiveFilterId(undefined);
    setPostTypeFilter('all');
    setSearchValue('');
    setCurrentPage(1);
  };

  // Sort options
  const sortOptions = [
    { value: 'created_desc', label: 'Mais recentes' },
    { value: 'created_asc', label: 'Mais antigos' },
    { value: 'comments_desc', label: 'Mais comentários' },
  ];

  // Filter groups
  const filterGroups: FilterGroup[] = [
    {
      id: 'type',
      label: 'Tipo de Publicação',
      icon: <Tag className="h-4 w-4" />,
      defaultOpen: true,
      items: POST_TYPES.map(type => ({
        id: `type_${type.value}`,
        label: type.label,
        icon: type.icon,
        count: posts.filter(p => p.post_type === type.value).length,
      })),
    },
  ];

  // Page tabs
  const pageTabs = FEED_TABS.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
  }));

  return (
    <div className="h-full flex flex-col">
      {/* PageHeader */}
      <PageHeader
        title="Mural Interno"
        count={stats.total}
        description="Comunica com a equipa sem sair do CRM"
        tabs={pageTabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as FeedType | 'all');
          setCurrentPage(1);
        }}
        actions={[
          {
            label: 'Nova Publicação',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setCreateModalOpen(true),
          },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b">
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Publicações</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Updates</p>
                <p className="text-xl font-bold text-primary">{stats.updates}</p>
              </div>
              <Globe className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pedidos Ajuda</p>
                <p className="text-xl font-bold text-warning">{stats.helpRequests}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-warning/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Menções</p>
                <p className="text-xl font-bold text-destructive">{stats.mentions}</p>
              </div>
              <Bell className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder="Pesquisar publicações..."
        onSearchChange={(value) => {
          setSearchValue(value);
          setCurrentPage(1);
        }}
        showFilters={showFilterSidebar}
        filtersActive={activeFilterId !== undefined || postTypeFilter !== 'all'}
        onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
        onClearFilters={handleClearFilters}
        sortOptions={sortOptions}
        sortValue={sortValue}
        onSortChange={setSortValue}
        rightActions={
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
            <Button variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Sidebar */}
        <FilterSidebar
          filterGroups={filterGroups}
          activeFilterId={activeFilterId}
          onFilterSelect={handleFilterSelect}
          onClearFilter={handleClearFilters}
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
        />

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-3xl mx-auto space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedPosts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  {searchValue || activeFilterId
                    ? 'Sem publicações encontradas'
                    : 'Sem publicações ainda. Sê o primeiro a partilhar!'}
                </p>
                {!searchValue && !activeFilterId && (
                  <Button
                    variant="outline"
                    onClick={() => setCreateModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Publicação
                  </Button>
                )}
              </div>
            ) : (
              paginatedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onViewComments={handleViewComments}
                />
              ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {filteredPosts.length} publicações
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-sm border rounded px-2 py-1 bg-background"
                  >
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size}>{size} por página</option>
                    ))}
                  </select>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

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

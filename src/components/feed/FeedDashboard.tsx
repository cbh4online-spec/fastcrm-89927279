import { useState, useMemo } from 'react';
import {
  Plus,
  Globe,
  Users,
  User,
  Building,
  Bell,
  Loader2,
  MessageSquare,
  AlertCircle,
  CheckSquare,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { CommentsSheet } from './CommentsSheet';
import {
  DocumentListLayout,
  DocumentListToolbar,
} from '@/components/documents/listing';
import { FeedType, Post, useInternalFeed, useMyMentions } from '@/hooks/useInternalFeed';

type ScopeFilter = FeedType | 'all';
type TypeFilter = 'all' | 'update' | 'help_request' | 'daily_checklist' | 'winners' | 'ai_alert';

const SCOPE_TABS: { id: ScopeFilter; label: string; icon: typeof Globe }[] = [
  { id: 'all', label: 'Tudo', icon: Globe },
  { id: 'workspace', label: 'Workspace', icon: Globe },
  { id: 'team', label: 'Equipa', icon: Users },
  { id: 'user', label: 'Pessoal', icon: User },
  { id: 'client', label: 'Clientes', icon: Building },
];

const TYPE_CONFIG: Record<Exclude<TypeFilter, 'all'>, { label: string; icon: typeof MessageSquare; tone: string }> = {
  update: { label: 'Updates', icon: MessageSquare, tone: 'text-blue-500' },
  help_request: { label: 'Pedidos Ajuda', icon: AlertCircle, tone: 'text-orange-500' },
  daily_checklist: { label: 'Checklists', icon: CheckSquare, tone: 'text-emerald-500' },
  winners: { label: 'Vencedores', icon: Trophy, tone: 'text-amber-500' },
  ai_alert: { label: 'Alertas IA', icon: Sparkles, tone: 'text-purple-500' },
};

function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Bell;
  label: string;
  count: number;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-foreground hover:border-primary/40',
      )}
    >
      {Icon && <Icon className={cn('h-3.5 w-3.5', !active && tone)} />}
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 text-xs font-semibold',
          active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function FeedDashboard() {
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'comments'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const feedType = scope === 'all' ? undefined : scope;
  const { posts, isLoading } = useInternalFeed(feedType);
  const { unreadCount } = useMyMentions();

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length };
    posts.forEach((p) => {
      c[p.post_type] = (c[p.post_type] || 0) + 1;
    });
    return c;
  }, [posts]);

  const filtered = useMemo(() => {
    let arr = posts;
    if (typeFilter !== 'all') arr = arr.filter((p) => p.post_type === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.author?.full_name?.toLowerCase().includes(q),
      );
    }
    arr = [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        cmp = (a.comments_count || 0) - (b.comments_count || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [posts, typeFilter, search, sortBy, sortDir]);

  const totalCount = filtered.length;
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const scopeChips = (
    <>
      {SCOPE_TABS.map((tab) => {
        const Icon = tab.icon;
        const count = tab.id === 'all' ? posts.length : posts.filter((p) => p.feed_type === tab.id).length;
        return (
          <FilterChip
            key={tab.id}
            active={scope === tab.id}
            onClick={() => {
              setScope(tab.id);
              setPage(0);
            }}
            icon={Icon}
            label={tab.label}
            count={count}
          />
        );
      })}
      <span className="mx-1 self-center text-muted-foreground/40">|</span>
      <FilterChip
        active={typeFilter === 'all'}
        onClick={() => {
          setTypeFilter('all');
          setPage(0);
        }}
        label="Todos os tipos"
        count={typeCounts.all ?? 0}
      />
      {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
        <FilterChip
          key={key}
          active={typeFilter === key}
          onClick={() => {
            setTypeFilter(key as TypeFilter);
            setPage(0);
          }}
          icon={cfg.icon}
          label={cfg.label}
          count={typeCounts[key] ?? 0}
          tone={cfg.tone}
        />
      ))}
    </>
  );

  return (
    <>
      <DocumentListLayout
        title="Mural Interno"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        searchPlaceholder="Pesquisar publicações, autor ou conteúdo"
        primaryAction={
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="h-12 rounded-full px-5 text-sm font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Publicação
          </Button>
        }
        secondaryAction={
          unreadCount > 0 ? (
            <Badge variant="destructive" className="h-8 gap-1 rounded-full px-3 text-xs">
              <Bell className="h-3 w-3" />
              {unreadCount} menç{unreadCount > 1 ? 'ões' : 'ão'}
            </Badge>
          ) : undefined
        }
        chips={scopeChips}
        toolbar={
          <DocumentListToolbar
            sortOptions={[
              { value: 'created_at', label: 'Data' },
              { value: 'comments', label: 'Comentários' },
            ]}
            sortValue={sortBy}
            onSortChange={(v) => setSortBy(v as typeof sortBy)}
            sortDirection={sortDir}
            onToggleSortDirection={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={(v) => {
              setPageSize(v);
              setPage(0);
            }}
            totalCount={totalCount}
            countLabel="publicações"
          />
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="space-y-3 py-16 text-center">
            <MessageSquare className="mx-auto h-14 w-14 text-muted-foreground/30" />
            <p className="text-lg font-semibold text-muted-foreground">
              {search || typeFilter !== 'all'
                ? 'Sem publicações encontradas'
                : 'Sem publicações ainda'}
            </p>
            <p className="text-sm text-muted-foreground/70">
              Sê o primeiro a partilhar com a equipa.
            </p>
            {!search && typeFilter === 'all' && (
              <Button
                variant="outline"
                className="mt-2 rounded-full"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Publicação
              </Button>
            )}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {pageItems.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onViewComments={(p) => {
                  setSelectedPost(p);
                  setCommentsOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {totalCount > pageSize && (
          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-muted-foreground">
              Página {page + 1} de {Math.max(1, Math.ceil(totalCount / pageSize))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={(page + 1) * pageSize >= totalCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Seguinte
            </Button>
          </div>
        )}
      </DocumentListLayout>

      <CreatePostModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultFeedType={scope === 'all' ? 'workspace' : scope}
      />

      <CommentsSheet
        post={selectedPost}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </>
  );
}

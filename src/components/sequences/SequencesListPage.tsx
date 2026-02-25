import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Zap,
  ListOrdered,
  Users,
  Play,
  Pause,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import {
  useEmailSequences,
  useDeleteSequence,
  useUpdateSequence,
} from '@/hooks/useEmailSequences';
import { SequenceFormDialog } from './SequenceFormDialog';
import { SequenceDetailDialog } from './SequenceDetailDialog';

const sortOptions = [
  { value: 'updated_desc', label: 'Mais recentes' },
  { value: 'name_asc', label: 'Nome (A-Z)' },
];

export function SequencesListPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingSequence, setEditingSequence] = useState<any>(null);
  const [viewingSequence, setViewingSequence] = useState<any>(null);
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('updated_desc');

  const { data: sequences, isLoading } = useEmailSequences();
  const deleteSequence = useDeleteSequence();
  const updateSequence = useUpdateSequence();

  const filtered = useMemo(() => {
    if (!sequences) return [];
    let result = [...sequences];
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortValue === 'name_asc') return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return result;
  }, [sequences, searchValue, sortValue]);

  const stats = useMemo(() => {
    if (!sequences) return { total: 0, active: 0 };
    return { total: sequences.length, active: sequences.filter((s) => s.isActive).length };
  }, [sequences]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sequências de Email"
        count={stats.total}
        description="Automatize follow-ups com sequências de etapas configuráveis"
        actions={[
          {
            label: 'Nova Sequência',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setShowCreate(true),
          },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ListOrdered className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativas</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.active}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Play className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pausadas</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.total - stats.active}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Pause className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={searchValue}
        searchPlaceholder="Pesquisar sequências..."
        onSearchChange={setSearchValue}
        sortOptions={sortOptions}
        sortValue={sortValue}
        onSortChange={setSortValue}
      />

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchValue ? 'Nenhuma sequência encontrada' : 'Sem sequências'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchValue ? 'Tente uma pesquisa diferente' : 'Crie a sua primeira sequência de email'}
            </p>
            {!searchValue && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Sequência
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((seq) => (
            <Card
              key={seq.id}
              className={`${!seq.isActive ? 'opacity-60' : ''} hover:shadow-md transition-all cursor-pointer`}
              onClick={() => setViewingSequence(seq)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ListOrdered className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{seq.name}</CardTitle>
                      {seq.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {seq.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingSequence(seq);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSequence(seq);
                          setShowCreate(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSequence.mutate(seq.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {seq.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {seq.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {seq.exitConditions.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {seq.exitConditions.length} condições
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={seq.isActive}
                    onCheckedChange={(checked) => {
                      updateSequence.mutate({ id: seq.id, is_active: checked });
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <SequenceFormDialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) setEditingSequence(null);
        }}
        sequence={editingSequence}
      />

      {viewingSequence && (
        <SequenceDetailDialog
          open={!!viewingSequence}
          onOpenChange={(open) => !open && setViewingSequence(null)}
          sequence={viewingSequence}
        />
      )}
    </div>
  );
}

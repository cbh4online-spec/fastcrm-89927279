import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Plus, UserX, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceInstance } from '@/contexts/WorkspaceInstanceContext';
import { toast } from 'sonner';

export interface SalesRep {
  id: string;
  name: string;
  code: string | null;
  zone: string | null;
  is_active: boolean;
}

const repSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(120),
  code: z.string().trim().max(40).optional(),
});

export function useSalesReps() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ['sales-reps', wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await (workspaceClient as any)
        .from('sales_reps')
        .select('id,name,code,zone,is_active')
        .eq('workspace_id', wsId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as SalesRep[];
    },
  });
}

interface Props {
  entityType: 'company' | 'contact' | 'lead' | string;
  entityId: string;
  currentSalesRepId: string | null | undefined;
}

export function SalesRepSelector({ entityType, entityId, currentSalesRepId }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();
  const { data: reps = [], isLoading, isError } = useSalesReps();

  if (entityType !== 'company' && entityType !== 'contact') return null;
  const table = entityType === 'company' ? 'companies' : 'contacts';
  const current = reps.find((r) => r.id === currentSalesRepId);
  const q = search.trim().toLowerCase();
  const filtered = reps.filter(
    (r) => r.is_active && (!q || r.name.toLowerCase().includes(q) || (r.code ?? '').toLowerCase().includes(q)),
  );

  const assign = async (repId: string | null) => {
    setSaving(true);
    const { error } = await (workspaceClient as any).from(table).update({ sales_rep_id: repId }).eq('id', entityId);
    setSaving(false);
    if (error) {
      toast.error('Não foi possível atribuir o vendedor');
      return;
    }
    setOpen(false);
    setSearch('');
    toast.success(repId ? 'Vendedor atribuído' : 'Vendedor removido');
    queryClient.invalidateQueries({ queryKey: [entityType] });
    queryClient.invalidateQueries({ queryKey: [`${entityType}s`] });
    queryClient.invalidateQueries({ queryKey: ['entity-for-insights'] });
  };

  const createAndAssign = async () => {
    const parsed = repSchema.safeParse({ name: search, code: newCode || undefined });
    if (!parsed.success || !currentWorkspace?.id) {
      toast.error(parsed.success ? 'Espaço de trabalho indisponível' : parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { data, error } = await (workspaceClient as any)
      .from('sales_reps')
      .insert({ workspace_id: currentWorkspace.id, name: parsed.data.name, code: parsed.data.code ?? null })
      .select('id')
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Já existe um vendedor com esse código' : 'Não foi possível criar o vendedor');
      return;
    }
    setNewCode('');
    await queryClient.invalidateQueries({ queryKey: ['sales-reps'] });
    await assign(data.id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between" aria-label="Escolher vendedor">
          <span className="flex items-center gap-2 truncate">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            {current ? (
              <span className="truncate">
                {current.name}
                {current.code ? <span className="text-muted-foreground"> · {current.code}</span> : null}
              </span>
            ) : (
              <span className="text-muted-foreground">Sem vendedor</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          autoFocus
          placeholder="Pesquisar ou criar vendedor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={120}
          aria-label="Pesquisar vendedor"
        />
        <div className="mt-2 max-h-56 overflow-y-auto">
          {isLoading && <p className="p-2 text-sm text-muted-foreground">A carregar…</p>}
          {isError && <p className="p-2 text-sm text-destructive">Erro ao carregar vendedores</p>}
          {currentSalesRepId && (
            <button
              type="button"
              disabled={saving}
              onClick={() => assign(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <UserX className="h-4 w-4" /> Remover vendedor
            </button>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={saving}
              onClick={() => assign(r.id)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span className="truncate">
                {r.name}
                {(r.code || r.zone) && (
                  <span className="text-muted-foreground"> · {[r.code, r.zone].filter(Boolean).join(' · ')}</span>
                )}
              </span>
              <Check className={cn('h-4 w-4', r.id === currentSalesRepId ? 'opacity-100' : 'opacity-0')} />
            </button>
          ))}
          {!isLoading && filtered.length === 0 && !q && (
            <p className="p-2 text-sm text-muted-foreground">Ainda não há vendedores. Escreva um nome para criar.</p>
          )}
        </div>
        {q && !reps.some((r) => r.name.toLowerCase() === q) && (
          <div className="mt-2 space-y-2 border-t border-border pt-2">
            <Input
              placeholder="Código (opcional)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              maxLength={40}
              aria-label="Código do vendedor"
            />
            <Button size="sm" className="w-full" disabled={saving} onClick={createAndAssign}>
              <Plus className="mr-1 h-4 w-4" /> Criar «{search.trim()}» e atribuir
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { getFilteredActions, executeAction, type Action, type ActionContext } from '@/lib/actionRegistry';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Navigation, Plus, RefreshCw, BarChart3, Bot, Shield } from 'lucide-react';

const groupIcons: Record<string, typeof Zap> = {
  Navigate: Navigation,
  Create: Plus,
  Update: RefreshCw,
  Analyze: BarChart3,
  Automate: Bot,
  Governance: Shield,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeBlockId?: string;
}

export function ActionCommandPalette({ open, onOpenChange, activeBlockId }: Props) {
  const [query, setQuery] = useState('');
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ''));
  }, []);

  const ctx: ActionContext = {
    workspaceId: currentWorkspace?.id ?? '',
    userId,
    activeBlockId,
    navigate: (path) => { navigate(path); onOpenChange(false); },
  };

  const filtered = getFilteredActions(query, ctx);

  // Group actions
  const groups = filtered.reduce<Record<string, Action[]>>((acc, a) => {
    (acc[a.group] = acc[a.group] ?? []).push(a);
    return acc;
  }, {});

  const handleSelect = useCallback(async (actionId: string) => {
    const action = filtered.find((a) => a.id === actionId);
    if (!action) return;
    onOpenChange(false);
    setQuery('');
    await executeAction(action, ctx);
  }, [filtered, ctx, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border-none">
        <CommandInput
          placeholder="Pesquisar ações..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Nenhuma ação encontrada.</CommandEmpty>
          {Object.entries(groups).map(([group, actions]) => {
            const Icon = groupIcons[group] ?? Zap;
            return (
              <CommandGroup key={group} heading={group}>
                {actions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.id}
                    onSelect={() => handleSelect(action.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{action.title}</span>
                    {action.requires?.activeBlock && !activeBlockId && (
                      <span className="ml-auto text-[10px] text-muted-foreground">(precisa bloco ativo)</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, UserPlus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useEnrollContact } from '@/hooks/useEmailSequences';
import { toast } from 'sonner';

interface EnrollContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequenceId: string;
  existingContactIds: string[];
}

export function EnrollContactsDialog({
  open,
  onOpenChange,
  sequenceId,
  existingContactIds,
}: EnrollContactsDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const enrollContact = useEnrollContact();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts-for-enroll', currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from('contacts')
        .select('id, name, email, phone')
        .eq('workspace_id', currentWorkspace.id)
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(50);

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const availableContacts = useMemo(
    () => (contacts || []).filter((c) => !existingContactIds.includes(c.id)),
    [contacts, existingContactIds]
  );

  const toggleContact = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === availableContacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableContacts.map((c) => c.id)));
    }
  };

  const handleEnroll = async () => {
    if (selected.size === 0) return;
    setEnrolling(true);
    let success = 0;
    let failed = 0;

    for (const contactId of selected) {
      try {
        await enrollContact.mutateAsync({ sequenceId, contactId });
        success++;
      } catch {
        failed++;
      }
    }

    setEnrolling(false);
    if (success > 0) toast.success(`${success} contacto(s) inscrito(s)`);
    if (failed > 0) toast.error(`${failed} falha(s) ao inscrever`);
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Inscrever Contactos
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{availableContacts.length} contactos disponíveis</span>
          {availableContacts.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleAll}>
              {selected.size === availableContacts.length ? 'Desselecionar' : 'Selecionar todos'}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px] border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : availableContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">
                {search ? 'Sem resultados' : 'Todos os contactos já estão inscritos'}
              </p>
            </div>
          ) : (
            <div className="p-1">
              {availableContacts.map((contact) => (
                <label
                  key={contact.id}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(contact.id)}
                    onCheckedChange={() => toggleContact(contact.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email || contact.phone || '—'}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleEnroll} disabled={selected.size === 0 || enrolling} className="gap-2">
            {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
            Inscrever {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

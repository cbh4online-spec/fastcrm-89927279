import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Send, Pin, Trash2, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { EntitySubTabs } from './EntitySubTabs';
import { EntityDocumentsSection } from './EntityDocumentsSection';

interface EntityTeamSectionProps {
  entityType: string;
  entityId: string;
  entityName: string;
}

interface TeamNote {
  id: string;
  content: string | null;
  created_at: string;
  created_by: string | null;
  is_pinned: boolean | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function useTeamNotes(entityType: string, entityId: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['team-notes', entityType, entityId, currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data: notes, error } = await supabase
        .from('entity_notes')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('note_type', 'team')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for authors
      const userIds = [...new Set((notes || []).map(n => n.created_by).filter(Boolean))] as string[];
      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      return (notes || []).map(note => ({
        ...note,
        profile: note.created_by ? profileMap.get(note.created_by) || null : null,
      })) as TeamNote[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('entity_notes')
        .insert({
          workspace_id: currentWorkspace.id,
          entity_type: entityType,
          entity_id: entityId,
          content,
          note_type: 'team',
          created_by: user?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes', entityType, entityId] });
      toast.success('Nota adicionada');
    },
    onError: () => toast.error('Erro ao adicionar nota'),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('entity_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes', entityType, entityId] });
      toast.success('Nota eliminada');
    },
    onError: () => toast.error('Erro ao eliminar nota'),
  });

  const togglePin = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('entity_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes', entityType, entityId] });
    },
  });

  return { notes: query.data || [], isLoading: query.isLoading, addNote, deleteNote, togglePin };
}

function TeamNotesPanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [newNote, setNewNote] = useState('');
  const { notes, isLoading, addNote, deleteNote, togglePin } = useTeamNotes(entityType, entityId);

  const handleSubmit = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    addNote.mutate(trimmed);
    setNewNote('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* New note input */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreve uma nota interna para a equipa..."
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ctrl+Enter para enviar</span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newNote.trim() || addNote.isPending}
              className="gap-2"
            >
              <Send className="h-3.5 w-3.5" />
              Publicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageSquareText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">Sem notas internas</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Usa as notas internas para comunicar com a equipa sobre este registo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const initials = note.profile?.full_name
              ? note.profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : '??';

            return (
              <Card key={note.id} className={note.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {note.profile?.full_name || 'Utilizador'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: pt })}
                        </span>
                        {note.is_pinned && (
                          <Badge variant="secondary" className="text-xs gap-1 h-5">
                            <Pin className="h-3 w-3" /> Fixada
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => togglePin.mutate({ noteId: note.id, isPinned: !!note.is_pinned })}
                      >
                        <Pin className={`h-3.5 w-3.5 ${note.is_pinned ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteNote.mutate(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EntityTeamSection({ entityType, entityId, entityName }: Omit<EntityTeamSectionProps, 'showDocuments'>) {
  const tabs = [
    { id: 'notes', label: 'Notas Internas' },
    { id: 'files', label: 'Ficheiros' },
  ];

  return (
    <EntitySubTabs tabs={tabs}>
      {(tab) => {
        if (tab === 'notes') return <TeamNotesPanel entityType={entityType} entityId={entityId} />;
        if (tab === 'files') return <EntityDocumentsSection entityType={entityType} entityId={entityId} />;
        return null;
      }}
    </EntitySubTabs>
  );
}

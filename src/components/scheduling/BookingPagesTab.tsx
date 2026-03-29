import { useState } from 'react';
import { Copy, ExternalLink, Pencil, Plus, QrCode, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBookingPages, useUpdateBookingPage, useDeleteBookingPage, type BookingPage } from '@/hooks/useBookingPages';
import { BookingPageModal } from './BookingPageModal';
import type { Calendar } from '@/hooks/useCalendars';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getPublicBaseUrl } from '@/utils/getPublicDomain';

interface BookingPagesTabProps {
  calendars: Calendar[];
}

export function BookingPagesTab({ calendars }: BookingPagesTabProps) {
  const { data: pages = [], isLoading } = useBookingPages();
  const { currentWorkspace } = useWorkspace();
  const updatePage = useUpdateBookingPage();
  const deletePage = useDeleteBookingPage();
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<BookingPage | null>(null);

  const getPublicUrl = (slug: string) => {
    const base = getPublicBaseUrl();
    const wsSlug = currentWorkspace?.slug || 'workspace';
    return `${base}/${wsSlug}/book/${slug}`;
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(getPublicUrl(slug));
    toast.success('Link copiado!');
  };

  const toggleActive = (page: BookingPage) => {
    updatePage.mutate({ id: page.id, is_active: !page.is_active });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza que quer remover este link?')) {
      deletePage.mutate(id);
    }
  };

  const getCalendarName = (calendarId: string) => {
    return calendars.find(c => c.id === calendarId)?.name || 'Calendário';
  };

  if (isLoading) {
    return <div className="flex justify-center py-12 text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Links de Agendamento</h3>
          <p className="text-sm text-muted-foreground">Crie links públicos para os seus clientes marcarem reuniões</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Link
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Ainda não criou nenhum link de agendamento</p>
          <Button onClick={() => setShowModal(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Criar primeiro link
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <Card key={page.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: page.brand_color }} />
                    <h4 className="font-medium truncate">{page.title}</h4>
                    <Badge variant={page.is_active ? 'default' : 'secondary'} className="text-xs">
                      {page.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {getCalendarName(page.calendar_id)} · {page.duration_minutes} min
                  </p>
                  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                    {getPublicUrl(page.slug)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copyLink(page.slug)} title="Copiar link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => window.open(getPublicUrl(page.slug), '_blank')} title="Abrir">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingPage(page); setShowModal(true); }} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(page)} title={page.is_active ? 'Desativar' : 'Ativar'}>
                    {page.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id)} title="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BookingPageModal
        open={showModal}
        onOpenChange={(v) => { setShowModal(v); if (!v) setEditingPage(null); }}
        calendars={calendars}
        editingPage={editingPage}
      />
    </div>
  );
}

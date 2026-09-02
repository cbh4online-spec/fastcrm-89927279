import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useCreateBookingPage, useUpdateBookingPage, type BookingPage, type BookingCustomField } from '@/hooks/useBookingPages';
import { Plus, X, GripVertical, ImageIcon, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { Calendar } from '@/hooks/useCalendars';

interface BookingPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: Calendar[];
  editingPage?: BookingPage | null;
}

const DAY_LABELS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

export function BookingPageModal({ open, onOpenChange, calendars, editingPage }: BookingPageModalProps) {
  const createPage = useCreateBookingPage();
  const updatePage = useUpdateBookingPage();
  const isEditing = !!editingPage;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [buffer, setBuffer] = useState('0');
  const [maxDays, setMaxDays] = useState('30');
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('18:00');
  const [requirePhone, setRequirePhone] = useState(false);
  const [customMessageLabel, setCustomMessageLabel] = useState('');
  const [customFields, setCustomFields] = useState<BookingCustomField[]>([]);
  const [shareImageUrl, setShareImageUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const { currentWorkspace } = useWorkspace();

  // Populate form when editing
  useEffect(() => {
    if (editingPage) {
      setTitle(editingPage.title);
      setSlug(editingPage.slug);
      setCalendarId(editingPage.calendar_id);
      setDescription(editingPage.description || '');
      setDuration(String(editingPage.duration_minutes));
      setBuffer(String(editingPage.buffer_minutes));
      setMaxDays(String(editingPage.max_advance_days));
      setBrandColor(editingPage.brand_color);
      setWorkingDays(editingPage.working_days);
      setStartHour(editingPage.start_hour);
      setEndHour(editingPage.end_hour);
      setRequirePhone(editingPage.require_phone);
      setCustomMessageLabel(editingPage.custom_message_label || '');
      setCustomFields(editingPage.custom_fields || []);
      setShareImageUrl(editingPage.share_image_url || '');
      setSeoTitle(editingPage.seo_title || '');
      setSeoDescription(editingPage.seo_description || '');
    } else {
      resetForm();
    }
  }, [editingPage]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing && (!slug || slug === generateSlug(title))) {
      setSlug(generateSlug(value));
    }
  };

  const toggleDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async () => {
    if (!title || !slug || !calendarId || workingDays.length === 0) return;
    const payload = {
      title,
      slug,
      calendar_id: calendarId,
      description,
      duration_minutes: parseInt(duration),
      buffer_minutes: parseInt(buffer),
      max_advance_days: parseInt(maxDays),
      is_active: editingPage?.is_active ?? true,
      brand_color: brandColor,
      working_days: workingDays,
      start_hour: startHour,
      end_hour: endHour,
      availability_id: editingPage?.availability_id ?? null,
      require_phone: requirePhone,
      custom_message_label: customMessageLabel || null,
      custom_fields: customFields,
      share_image_url: shareImageUrl.trim() || null,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
    };
    if (isEditing) {
      await updatePage.mutateAsync({ id: editingPage!.id, ...payload });
    } else {
      await createPage.mutateAsync(payload);
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle(''); setSlug(''); setCalendarId(''); setDescription('');
    setDuration('30'); setBuffer('0'); setMaxDays('30'); setBrandColor('#6366f1');
    setWorkingDays([1, 2, 3, 4, 5]); setStartHour('09:00'); setEndHour('18:00');
    setRequirePhone(false); setCustomMessageLabel(''); setCustomFields([]);
    setShareImageUrl(''); setSeoTitle(''); setSeoDescription('');
  };

  const handleImageUpload = async (file: File) => {
    if (!currentWorkspace?.id) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido', { description: 'Use PNG, JPG ou WEBP.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem demasiado grande', { description: 'Máximo 5 MB.' });
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${currentWorkspace.id}/booking/${slug || crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('landing-assets').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('landing-assets').getPublicUrl(path);
      setShareImageUrl(data.publicUrl);
      toast.success('Imagem de partilha carregada');
    } catch (e) {
      toast.error('Erro ao carregar imagem', { description: (e as Error).message });
    } finally {
      setUploadingImage(false);
    }
  };

  const isPending = createPage.isPending || updatePage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>{isEditing ? 'Editar Link de Agendamento' : 'Novo Link de Agendamento'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">
          {/* Basic info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Ex: Reunião com João" value={title} onChange={e => handleTitleChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/book/</span>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="reuniao-joao" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Calendário</Label>
              <Select value={calendarId} onValueChange={setCalendarId}>
                <SelectTrigger><SelectValue placeholder="Selecionar calendário" /></SelectTrigger>
                <SelectContent>
                  {calendars.map(cal => (
                    <SelectItem key={cal.id} value={cal.id}>{cal.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Instruções para o cliente..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
          </div>

          <Separator />

          {/* Schedule config */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Configuração de horários</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buffer (min)</Label>
                <Select value={buffer} onValueChange={setBuffer}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 30].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max dias</Label>
                <Input type="number" value={maxDays} onChange={e => setMaxDays(e.target.value)} min={1} max={90} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias disponíveis</Label>
              <div className="flex gap-2">
                {DAY_LABELS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                      workingDays.includes(day.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hora início</Label>
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hora fim</Label>
                <Select value={endHour} onValueChange={setEndHour}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map(h => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lead capture config */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Campos do formulário</h4>
            <div className="flex items-center justify-between">
              <Label className="cursor-pointer">Pedir telefone</Label>
              <Switch checked={requirePhone} onCheckedChange={setRequirePhone} />
            </div>
            <div className="space-y-2">
              <Label>Campo de mensagem (opcional)</Label>
              <Input
                placeholder="Ex: Descreva o motivo da reunião"
                value={customMessageLabel}
                onChange={e => setCustomMessageLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para não mostrar campo de mensagem</p>
            </div>
          </div>

          <Separator />

          {/* Custom Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">Campos personalizados</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomFields([...customFields, {
                  id: crypto.randomUUID(),
                  label: '',
                  type: 'text',
                  required: false,
                }])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar campo
              </Button>
            </div>
            {customFields.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum campo extra. Adicione campos como empresa, cargo, etc.</p>
            )}
            <div className="space-y-3">
              {customFields.map((field, idx) => (
                <div key={field.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Nome do campo"
                      value={field.label}
                      onChange={e => {
                        const updated = [...customFields];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setCustomFields(updated);
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={field.type}
                      onValueChange={v => {
                        const updated = [...customFields];
                        updated[idx] = { ...updated[idx], type: v as BookingCustomField['type'] };
                        setCustomFields(updated);
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="textarea">Texto longo</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="select">Seleção</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={v => {
                          const updated = [...customFields];
                          updated[idx] = { ...updated[idx], required: v };
                          setCustomFields(updated);
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{field.required ? 'Obrigatório' : 'Opcional'}</span>
                    </div>
                    <Input
                      placeholder="Placeholder (opcional)"
                      value={field.placeholder || ''}
                      onChange={e => {
                        const updated = [...customFields];
                        updated[idx] = { ...updated[idx], placeholder: e.target.value || undefined };
                        setCustomFields(updated);
                      }}
                      className="flex-1 text-xs h-8"
                    />
                  </div>
                  {field.type === 'select' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Opções (uma por linha)</Label>
                      <Textarea
                        rows={2}
                        placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                        value={(field.options || []).join('\n')}
                        onChange={e => {
                          const updated = [...customFields];
                          updated[idx] = { ...updated[idx], options: e.target.value.split('\n').filter(Boolean) };
                          setCustomFields(updated);
                        }}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Partilha e SEO */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Partilha e SEO</h4>
            <p className="text-xs text-muted-foreground">
              Define a imagem e o texto que aparecem quando o link é partilhado no WhatsApp, LinkedIn ou Facebook.
              Sem imagem própria, é usado o logótipo da tua marca.
            </p>

            <div className="space-y-2">
              <Label>Imagem de partilha (1200×630 px)</Label>
              <div className="flex items-start gap-3">
                <div className="h-[63px] w-[120px] shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                  {shareImageUrl ? (
                    <img src={shareImageUrl} alt="Pré-visualização da imagem de partilha" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={uploadingImage} asChild>
                      <label className="cursor-pointer">
                        {uploadingImage ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1" />
                        )}
                        {uploadingImage ? 'A carregar...' : 'Carregar imagem'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={uploadingImage}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </Button>
                    {shareImageUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShareImageUrl('')}>
                        Remover
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Ou colar URL da imagem"
                    value={shareImageUrl}
                    onChange={e => setShareImageUrl(e.target.value)}
                    maxLength={500}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título de partilha (opcional)</Label>
              <Input
                placeholder={title || 'Título da reunião'}
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição de partilha (opcional)</Label>
              <Textarea
                rows={2}
                placeholder={description || 'Escolhe o melhor horário e confirma a tua marcação online.'}
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <Separator />
          <div className="space-y-2">
            <Label>Cor da marca</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-sm text-muted-foreground">{brandColor}</span>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 shrink-0 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title || !slug || !calendarId || workingDays.length === 0 || isPending}>
            {isPending ? (isEditing ? 'A guardar...' : 'A criar...') : (isEditing ? 'Guardar Alterações' : 'Criar Link')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

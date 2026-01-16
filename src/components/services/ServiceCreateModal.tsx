import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X, MapPin, Video, Phone, Building2 } from 'lucide-react';
import type { Service, ServiceCategory, CreateServiceData, ServiceLocation, ServiceAvailability } from '@/hooks/useServices';

interface ServiceCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ServiceCategory[];
  service?: Service | null;
  onSubmit: (data: CreateServiceData) => Promise<unknown>;
  onCreateCategory: (name: string, color?: string) => Promise<unknown>;
}

const LOCATION_TYPES = [
  { value: 'physical', label: 'Presencial', icon: MapPin },
  { value: 'online', label: 'Online', icon: Video },
  { value: 'phone', label: 'Telefone/WhatsApp', icon: Phone },
  { value: 'client_location', label: 'Local do cliente', icon: Building2 },
] as const;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

const COLOR_OPTIONS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function ServiceCreateModal({
  open,
  onOpenChange,
  categories,
  service,
  onSubmit,
  onCreateCategory,
}: ServiceCreateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState('EUR');
  const [color, setColor] = useState('#3B82F6');
  
  // Booking rules
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [minNoticeHours, setMinNoticeHours] = useState(24);
  const [maxBookingDays, setMaxBookingDays] = useState(60);
  const [maxPerDay, setMaxPerDay] = useState<number | ''>('');
  
  // Settings
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [allowCancellation, setAllowCancellation] = useState(true);
  const [cancellationHours, setCancellationHours] = useState(24);
  
  // Locations
  const [locations, setLocations] = useState<Omit<ServiceLocation, 'id' | 'service_id' | 'created_at'>[]>([]);
  
  // Availability
  const [availability, setAvailability] = useState<Omit<ServiceAvailability, 'id' | 'service_id' | 'created_at'>[]>([]);
  
  // New category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || '');
      setCategoryId(service.category_id || '');
      setDuration(service.duration);
      setPrice(service.price || '');
      setCurrency(service.currency);
      setColor(service.color || '#3B82F6');
      setBufferBefore(service.buffer_before);
      setBufferAfter(service.buffer_after);
      setMinNoticeHours(service.min_notice_hours);
      setMaxBookingDays(service.max_booking_days);
      setMaxPerDay(service.max_per_day || '');
      setIsActive(service.is_active);
      setIsPublic(service.is_public);
      setRequiresConfirmation(service.requires_confirmation);
      setAllowCancellation(service.allow_cancellation);
      setCancellationHours(service.cancellation_hours);
      setLocations(service.locations?.map(({ id, service_id, created_at, ...rest }) => rest) || []);
      setAvailability(service.availability?.map(({ id, service_id, created_at, ...rest }) => rest) || []);
    } else {
      resetForm();
    }
  }, [service, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategoryId('');
    setDuration(60);
    setPrice('');
    setCurrency('EUR');
    setColor('#3B82F6');
    setBufferBefore(0);
    setBufferAfter(0);
    setMinNoticeHours(24);
    setMaxBookingDays(60);
    setMaxPerDay('');
    setIsActive(true);
    setIsPublic(false);
    setRequiresConfirmation(false);
    setAllowCancellation(true);
    setCancellationHours(24);
    setLocations([]);
    setAvailability([]);
    setActiveTab('basic');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        category_id: categoryId || undefined,
        duration,
        price: price !== '' ? Number(price) : undefined,
        currency,
        color,
        buffer_before: bufferBefore,
        buffer_after: bufferAfter,
        min_notice_hours: minNoticeHours,
        max_booking_days: maxBookingDays,
        max_per_day: maxPerDay !== '' ? Number(maxPerDay) : undefined,
        is_active: isActive,
        is_public: isPublic,
        requires_confirmation: requiresConfirmation,
        allow_cancellation: allowCancellation,
        cancellation_hours: cancellationHours,
        locations: locations.length > 0 ? locations : undefined,
        availability: availability.length > 0 ? availability : undefined,
      });
      onOpenChange(false);
      resetForm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await onCreateCategory(newCategoryName.trim(), newCategoryColor);
    setShowNewCategory(false);
    setNewCategoryName('');
    setNewCategoryColor('#3B82F6');
  };

  const addLocation = (type: ServiceLocation['location_type']) => {
    setLocations([...locations, {
      location_type: type,
      location_name: null,
      location_address: null,
      meeting_url: null,
      is_default: locations.length === 0,
    }]);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, updates: Partial<Omit<ServiceLocation, 'id' | 'service_id' | 'created_at'>>) => {
    setLocations(locations.map((loc, i) => i === index ? { ...loc, ...updates } : loc));
  };

  const toggleDayAvailability = (dayOfWeek: number) => {
    const existing = availability.find(a => a.day_of_week === dayOfWeek);
    if (existing) {
      setAvailability(availability.filter(a => a.day_of_week !== dayOfWeek));
    } else {
      setAvailability([...availability, {
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '18:00',
        is_active: true,
      }]);
    }
  };

  const updateDayAvailability = (dayOfWeek: number, updates: Partial<ServiceAvailability>) => {
    setAvailability(availability.map(a => 
      a.day_of_week === dayOfWeek ? { ...a, ...updates } : a
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {service ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="rules">Regras</TabsTrigger>
              <TabsTrigger value="locations">Locais</TabsTrigger>
              <TabsTrigger value="availability">Horários</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4 pr-4">
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome do serviço *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Consulta inicial"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreve o serviço..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Categoria</Label>
                      {showNewCategory ? (
                        <div className="flex gap-2">
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nome da categoria"
                            className="flex-1"
                          />
                          <Button type="button" size="icon" onClick={handleCreateCategory}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => setShowNewCategory(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Selecionar categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: cat.color || '#3B82F6' }}
                                    />
                                    {cat.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" size="icon" variant="outline" onClick={() => setShowNewCategory(true)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label>Cor</Label>
                      <div className="flex gap-1 flex-wrap">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`w-6 h-6 rounded-full transition-all ${
                              color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="duration">Duração (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={5}
                        step={5}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="price">Preço</Label>
                      <Input
                        id="price"
                        type="number"
                        min={0}
                        step={0.01}
                        value={price}
                        onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Moeda</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR €</SelectItem>
                          <SelectItem value="USD">USD $</SelectItem>
                          <SelectItem value="GBP">GBP £</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Serviço ativo</Label>
                        <p className="text-xs text-muted-foreground">Disponível para marcação</p>
                      </div>
                      <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Público</Label>
                        <p className="text-xs text-muted-foreground">Visível na página de booking</p>
                      </div>
                      <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Requer confirmação</Label>
                        <p className="text-xs text-muted-foreground">Marcações ficam pendentes</p>
                      </div>
                      <Switch checked={requiresConfirmation} onCheckedChange={setRequiresConfirmation} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 mt-0">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="bufferBefore">Buffer antes (min)</Label>
                      <Input
                        id="bufferBefore"
                        type="number"
                        min={0}
                        step={5}
                        value={bufferBefore}
                        onChange={(e) => setBufferBefore(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Tempo livre antes da reunião</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="bufferAfter">Buffer depois (min)</Label>
                      <Input
                        id="bufferAfter"
                        type="number"
                        min={0}
                        step={5}
                        value={bufferAfter}
                        onChange={(e) => setBufferAfter(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Tempo livre depois da reunião</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="minNotice">Aviso mínimo (horas)</Label>
                      <Input
                        id="minNotice"
                        type="number"
                        min={0}
                        value={minNoticeHours}
                        onChange={(e) => setMinNoticeHours(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Antecedência mínima para marcar</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="maxBooking">Janela máxima (dias)</Label>
                      <Input
                        id="maxBooking"
                        type="number"
                        min={1}
                        value={maxBookingDays}
                        onChange={(e) => setMaxBookingDays(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Até quantos dias no futuro</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="maxPerDay">Máximo por dia</Label>
                    <Input
                      id="maxPerDay"
                      type="number"
                      min={1}
                      value={maxPerDay}
                      onChange={(e) => setMaxPerDay(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Sem limite"
                    />
                    <p className="text-xs text-muted-foreground">Número máximo de marcações deste serviço por dia</p>
                  </div>

                  <div className="grid gap-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Permitir cancelamento</Label>
                        <p className="text-xs text-muted-foreground">Cliente pode cancelar</p>
                      </div>
                      <Switch checked={allowCancellation} onCheckedChange={setAllowCancellation} />
                    </div>

                    {allowCancellation && (
                      <div className="grid gap-2">
                        <Label htmlFor="cancellationHours">Prazo para cancelar (horas)</Label>
                        <Input
                          id="cancellationHours"
                          type="number"
                          min={0}
                          value={cancellationHours}
                          onChange={(e) => setCancellationHours(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">Horas de antecedência mínima para cancelar</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="locations" className="space-y-4 mt-0">
                <div className="grid gap-4">
                  <div>
                    <Label className="mb-2 block">Adicionar local</Label>
                    <div className="flex flex-wrap gap-2">
                      {LOCATION_TYPES.map((type) => {
                        const Icon = type.icon;
                        const exists = locations.some(l => l.location_type === type.value);
                        return (
                          <Button
                            key={type.value}
                            type="button"
                            variant={exists ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => !exists && addLocation(type.value)}
                            disabled={exists}
                          >
                            <Icon className="h-4 w-4 mr-1" />
                            {type.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum local configurado. Adiciona pelo menos um local.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {locations.map((location, index) => {
                        const typeConfig = LOCATION_TYPES.find(t => t.value === location.location_type);
                        const Icon = typeConfig?.icon || MapPin;
                        
                        return (
                          <div key={index} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{typeConfig?.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Checkbox
                                    checked={location.is_default}
                                    onCheckedChange={(checked) => updateLocation(index, { is_default: !!checked })}
                                  />
                                  Padrão
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeLocation(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {(location.location_type === 'physical' || location.location_type === 'client_location') && (
                              <div className="grid gap-2">
                                <Input
                                  placeholder="Nome do local"
                                  value={location.location_name || ''}
                                  onChange={(e) => updateLocation(index, { location_name: e.target.value })}
                                />
                                <Input
                                  placeholder="Morada"
                                  value={location.location_address || ''}
                                  onChange={(e) => updateLocation(index, { location_address: e.target.value })}
                                />
                              </div>
                            )}

                            {location.location_type === 'online' && (
                              <Input
                                placeholder="URL da reunião (Zoom, Google Meet, etc.)"
                                value={location.meeting_url || ''}
                                onChange={(e) => updateLocation(index, { meeting_url: e.target.value })}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="availability" className="space-y-4 mt-0">
                <div className="grid gap-3">
                  <p className="text-sm text-muted-foreground">
                    Define em que dias e horários este serviço pode ser marcado.
                    Se não definires, usará a disponibilidade geral do calendário.
                  </p>

                  {DAYS_OF_WEEK.map((day) => {
                    const dayAvail = availability.find(a => a.day_of_week === day.value);
                    return (
                      <div key={day.value} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Checkbox
                          checked={!!dayAvail}
                          onCheckedChange={() => toggleDayAvailability(day.value)}
                        />
                        <span className="w-24 font-medium">{day.label}</span>
                        
                        {dayAvail && (
                          <>
                            <Input
                              type="time"
                              value={dayAvail.start_time}
                              onChange={(e) => updateDayAvailability(day.value, { start_time: e.target.value })}
                              className="w-28"
                            />
                            <span className="text-muted-foreground">até</span>
                            <Input
                              type="time"
                              value={dayAvail.end_time}
                              onChange={(e) => updateDayAvailability(day.value, { end_time: e.target.value })}
                              className="w-28"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {service ? 'Guardar' : 'Criar serviço'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Sparkles, Loader2, Wand2, Search, User, Building2, UserCheck, X, Link } from "lucide-react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TaskPriority, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from "@/types/taskTemplate";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

type RelatedType = "contact" | "lead" | "company";

interface EntityResult {
  id: string;
  name: string;
  email?: string | null;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (task: {
    title: string;
    due_at?: string;
    assigned_to?: string;
    related_type?: string;
    related_id?: string;
  }) => void;
  initialTitle?: string;
  initialDueDays?: number;
  entityName: string;
}

const ENTITY_TYPE_CONFIG: Record<RelatedType, { label: string; icon: typeof User; table: string }> = {
  contact: { label: "Contacto", icon: UserCheck, table: "contacts" },
  lead: { label: "Lead", icon: User, table: "leads" },
  company: { label: "Empresa", icon: Building2, table: "companies" },
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  onCreateTask,
  initialTitle = "",
  initialDueDays = 3,
  entityName
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), initialDueDays));
  const [isAIEnhancing, setIsAIEnhancing] = useState(false);

  // Entity association state
  const [relatedType, setRelatedType] = useState<RelatedType | "none">("none");
  const [relatedId, setRelatedId] = useState<string | null>(null);
  const [relatedName, setRelatedName] = useState<string | null>(null);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityResults, setEntityResults] = useState<EntityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);

  const debouncedSearch = useDebounce(entitySearch, 300);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDueDate(addDays(new Date(), initialDueDays));
      setRelatedType("none");
      setRelatedId(null);
      setRelatedName(null);
      setEntitySearch("");
      setEntityResults([]);
    }
  }, [open, initialTitle, initialDueDays]);

  // Search entities when debounced search changes
  useEffect(() => {
    if (relatedType === "none" || !debouncedSearch.trim()) {
      setEntityResults([]);
      return;
    }

    const searchEntities = async () => {
      setIsSearching(true);
      try {
        const config = ENTITY_TYPE_CONFIG[relatedType];
        const { data } = await supabase
          .from(config.table)
          .select("id, name, email")
          .ilike("name", `%${debouncedSearch}%`)
          .limit(10);
        setEntityResults((data as EntityResult[]) || []);
      } catch {
        setEntityResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchEntities();
  }, [debouncedSearch, relatedType]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    onCreateTask({
      title: title.trim(),
      due_at: dueDate?.toISOString(),
      ...(relatedType !== "none" && relatedId ? { related_type: relatedType === "contact" ? "contact" : relatedType === "lead" ? "lead" : "company", related_id: relatedId } : {}),
    });
    
    // Reset form
    setTitle("");
    setDescription("");
    setPriority('medium');
    setDueDate(addDays(new Date(), 3));
    setRelatedType("none");
    setRelatedId(null);
    setRelatedName(null);
    setEntitySearch("");
    onOpenChange(false);
  };

  const handleAIEnhance = async () => {
    setIsAIEnhancing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (title.toLowerCase().includes('ligar')) {
      setTitle(title + ' - confirmar disponibilidade');
      setDescription('Pontos a abordar:\n1. Confirmar receção da proposta\n2. Esclarecer dúvidas\n3. Definir próximos passos');
    } else if (title.toLowerCase().includes('proposta')) {
      setDescription('Incluir:\n• Resumo executivo\n• Detalhes da solução\n• Pricing competitivo\n• Casos de sucesso relevantes');
    }
    
    setIsAIEnhancing(false);
  };

  const handleSelectEntity = (entity: EntityResult) => {
    setRelatedId(entity.id);
    setRelatedName(entity.name);
    setEntitySearch("");
    setShowEntityDropdown(false);
    setEntityResults([]);
  };

  const handleClearEntity = () => {
    setRelatedId(null);
    setRelatedName(null);
    setEntitySearch("");
    setEntityResults([]);
  };

  const handleTypeChange = (value: string) => {
    setRelatedType(value as RelatedType | "none");
    setRelatedId(null);
    setRelatedName(null);
    setEntitySearch("");
    setEntityResults([]);
  };

  const quickDates = [
    { label: 'Hoje', days: 0 },
    { label: 'Amanhã', days: 1 },
    { label: '3 dias', days: 3 },
    { label: '1 semana', days: 7 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Criar tarefa para {entityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title with AI Enhance */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que precisa ser feito?"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAIEnhance}
                disabled={isAIEnhancing || !title.trim()}
                title="Melhorar com IA"
              >
                {isAIEnhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notas (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                <Button
                  key={p}
                  variant={priority === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPriority(p)}
                  className={cn(
                    priority === p && TASK_PRIORITY_COLORS[p]
                  )}
                >
                  {TASK_PRIORITY_LABELS[p]}
                </Button>
              ))}
            </div>
          </div>

          {/* Entity Association */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" />
              Associar a
            </Label>
            <Select value={relatedType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geral (sem associação)</SelectItem>
                <SelectItem value="contact">
                  <span className="flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" /> Contacto</span>
                </SelectItem>
                <SelectItem value="lead">
                  <span className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> Lead</span>
                </SelectItem>
                <SelectItem value="company">
                  <span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Empresa</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {relatedType !== "none" && (
              <div className="relative">
                {relatedId && relatedName ? (
                  <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                    {(() => {
                      const Icon = ENTITY_TYPE_CONFIG[relatedType].icon;
                      return <Icon className="w-4 h-4 text-muted-foreground" />;
                    })()}
                    <span className="text-sm font-medium flex-1">{relatedName}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {ENTITY_TYPE_CONFIG[relatedType].label}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearEntity}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={`Pesquisar ${ENTITY_TYPE_CONFIG[relatedType].label.toLowerCase()}...`}
                        value={entitySearch}
                        onChange={(e) => {
                          setEntitySearch(e.target.value);
                          setShowEntityDropdown(true);
                        }}
                        onFocus={() => setShowEntityDropdown(true)}
                        className="pl-8"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {showEntityDropdown && entitySearch.trim() && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                        <ScrollArea className="max-h-[160px]">
                          {isSearching ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : entityResults.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                              Nenhum resultado encontrado
                            </div>
                          ) : (
                            <div className="p-1">
                              {entityResults.map((entity) => (
                                <button
                                  key={entity.id}
                                  type="button"
                                  onClick={() => handleSelectEntity(entity)}
                                  className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-md hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{entity.name}</div>
                                    {entity.email && (
                                      <div className="text-xs text-muted-foreground truncate">{entity.email}</div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Data Limite</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {quickDates.map((qd) => (
                <Button
                  key={qd.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setDueDate(addDays(new Date(), qd.days))}
                  className={cn(
                    "text-xs",
                    dueDate && format(dueDate, 'yyyy-MM-dd') === format(addDays(new Date(), qd.days), 'yyyy-MM-dd') &&
                    "bg-primary text-primary-foreground"
                  )}
                >
                  {qd.label}
                </Button>
              ))}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: pt }) : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  locale={pt}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* AI Tip */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary">Dica IA</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa o botão ✨ para a IA sugerir melhorias ao título e adicionar notas úteis automaticamente.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Criar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
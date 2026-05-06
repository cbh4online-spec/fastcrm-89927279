import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCreateSupportTicketFromConversation,
  useSupportCategories,
} from "@/hooks/useSupportTickets";
import { Sparkles, LifeBuoy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  prefill?: {
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "critical";
    category?: string | null;
    ai_summary?: string | null;
    ai_recommendation?: Record<string, unknown> | null;
    ai_intent?: string | null;
    ai_urgency?: string | null;
    ai_draft?: boolean;
  };
  onCreated?: (ticketId: string) => void;
}

export function CreateTicketFromConversationDialog({
  open,
  onOpenChange,
  conversationId,
  contactId,
  leadId,
  contactName,
  contactPhone,
  prefill,
  onCreated,
}: Props) {
  const { data: categories = [] } = useSupportCategories();
  const create = useCreateSupportTicketFromConversation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [categoryId, setCategoryId] = useState<string>("");
  const [aiDraft, setAiDraft] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(prefill?.title ?? (contactName ? `Suporte — ${contactName}` : ""));
    setDescription(prefill?.description ?? prefill?.ai_summary ?? "");
    setPriority(prefill?.priority ?? "medium");
    setAiDraft(!!prefill?.ai_draft);
    if (prefill?.category) {
      const match = categories.find((c) => c.name.toLowerCase() === prefill.category!.toLowerCase());
      setCategoryId(match?.id ?? "");
    } else {
      setCategoryId("");
    }
  }, [open, prefill, contactName, categories]);

  const submit = async () => {
    if (!title.trim()) return;
    const cat = categories.find((c) => c.id === categoryId);
    const ticket = await create.mutateAsync({
      conversation_id: conversationId ?? null,
      contact_id: contactId ?? null,
      lead_id: leadId ?? null,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      category: cat?.name ?? prefill?.category ?? null,
      category_id: cat?.id ?? null,
      ai_summary: prefill?.ai_summary ?? null,
      ai_recommendation: prefill?.ai_recommendation ?? null,
      ai_intent: prefill?.ai_intent ?? null,
      ai_urgency: prefill?.ai_urgency ?? null,
      ai_draft: aiDraft,
      source: "whatsapp",
    });
    if (ticket?.id) onCreated?.(ticket.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-primary" />
            Criar ticket de suporte
          </DialogTitle>
          <DialogDescription>
            Transforma esta conversa num ticket com SLA e responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {prefill?.ai_summary && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-primary mb-1">
                <Sparkles className="w-3 h-3" /> Sugestão da Inbox Intelligence
              </div>
              <p className="text-muted-foreground">{prefill.ai_summary}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ticket-title">Título</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 255))}
              placeholder="Ex.: Pedido de suporte sobre encomenda #1234"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-desc">Descrição</Label>
            <Textarea
              id="ticket-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
              rows={4}
              placeholder="Resumo do problema, contexto e pedidos relacionados…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="(sem categoria)" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Criar como rascunho IA</Label>
              <p className="text-xs text-muted-foreground">
                Guarda o ticket pendente de confirmação humana.
              </p>
            </div>
            <Switch checked={aiDraft} onCheckedChange={setAiDraft} />
          </div>

          {(contactName || contactPhone) && (
            <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
              <strong className="text-foreground">Contacto:</strong> {contactName ?? "—"}
              {contactPhone ? ` · ${contactPhone}` : ""}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!title.trim() || create.isPending}>
            {create.isPending ? "A criar…" : "Criar ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

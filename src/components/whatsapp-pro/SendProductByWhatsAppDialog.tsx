import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Search, UserPlus, Sparkles, FileText, MessageCircle, ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppProSend, useRegisterWhatsAppProductShare, useWhatsAppProTemplates } from "@/hooks/useWhatsAppPro";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { toE164, isValidPhone } from "@/utils/phone";

const messageSchema = z
  .string()
  .trim()
  .min(1, "A mensagem não pode ficar vazia.")
  .max(2000, "A mensagem é demasiado longa (máx. 2000 caracteres).");

interface SendProductByWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
  productPrice?: number | null;
  productImageUrl?: string | null;
  productLink?: string | null;
  prefillContactId?: string | null;
  prefillConversationId?: string | null;
  prefillPhone?: string | null;
}

interface ContactOption {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

function buildDefaultMessage(opts: {
  contactName?: string | null;
  productName?: string;
  productPrice?: number | null;
  productLink?: string | null;
  shortDescription?: string | null;
}): string {
  const firstName = opts.contactName ? opts.contactName.split(" ")[0] : null;
  const greet = firstName ? `Olá ${firstName} 👋` : "Olá 👋";
  const lines: string[] = [];
  lines.push(`${greet}`);
  lines.push("");
  lines.push("Encontrei esta opção que pode fazer sentido para si:");
  lines.push("");
  if (opts.productName) lines.push(`📦 *${opts.productName}*`);
  if (opts.shortDescription) {
    lines.push("");
    lines.push(opts.shortDescription);
  }
  if (typeof opts.productPrice === "number") {
    lines.push("");
    lines.push(`💶 *${opts.productPrice.toFixed(2)} €*`);
  }
  if (opts.productLink) {
    lines.push("");
    lines.push(`🛒 Comprar agora:`);
    lines.push(opts.productLink);
  }
  lines.push("");
  lines.push("Qualquer dúvida diga, estou disponível para ajudar.");
  return lines.join("\n");
}

export function SendProductByWhatsAppDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productPrice,
  productImageUrl,
  productLink,
  prefillContactId,
  prefillConversationId,
  prefillPhone,
}: SendProductByWhatsAppDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const send = useWhatsAppProSend();
  const registerShare = useRegisterWhatsAppProductShare();
  const { data: templates } = useWhatsAppProTemplates();

  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(prefillContactId ?? null);
  const [phoneOverride, setPhoneOverride] = useState<string>(prefillPhone ?? "");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [includeImage, setIncludeImage] = useState<boolean>(true);

  // Buscar dados extra do produto (short_description) — opcional
  const { data: productExtra } = useQuery({
    queryKey: ["product-short-desc", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("short_description, sheet_slug, images, category, stock_status")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!productId,
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts-search-whatsapp", currentWorkspace?.id, search],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("contacts")
        .select("id, name, phone, email")
        .eq("workspace_id", currentWorkspace.id)
        .not("phone", "is", null)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (search.trim().length > 1) {
        q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ContactOption[];
    },
    enabled: open && !!currentWorkspace,
  });

  const selectedContact = useMemo(
    () => contacts?.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const rawPhone = phoneOverride.trim() || selectedContact?.phone || prefillPhone || "";
  const normalizedPhone = useMemo(() => toE164(rawPhone, "PT"), [rawPhone]);
  const phoneIsValid = !!rawPhone && isValidPhone(rawPhone, "PT");

  const defaultMessage = useMemo(
    () =>
      buildDefaultMessage({
        contactName: selectedContact?.name,
        productName,
        productPrice,
        productLink: productLink ?? (productExtra?.sheet_slug ? `/produto/${productExtra.sheet_slug}` : null),
        shortDescription: productExtra?.short_description,
      }),
    [selectedContact?.name, productName, productPrice, productLink, productExtra],
  );

  const [message, setMessage] = useState<string>(defaultMessage);

  // Regenerar mensagem quando muda o destinatário ou o produto carrega short_description
  useEffect(() => {
    if (open) setMessage(defaultMessage);
  }, [defaultMessage, open]);

  // Quick-create contact
  const quickCreate = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Sessão inválida");
      const trimmedName = quickName.trim();
      const trimmedPhone = quickPhone.trim();
      if (!trimmedName) throw new Error("Indique o nome do contacto.");
      if (!trimmedPhone) throw new Error("Indique o telefone.");
      const e164 = toE164(trimmedPhone, "PT");
      if (!e164) throw new Error("Telefone inválido. Use formato 912345678 ou +351912345678.");

      const { data, error } = await supabase
        .from("contacts")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: trimmedName,
          phone: e164,
        })
        .select("id, name, phone, email")
        .single();
      if (error) throw error;
      return data as ContactOption;
    },
    onSuccess: (data) => {
      toast.success("Contacto criado");
      setSelectedContactId(data.id);
      setPhoneOverride("");
      setShowQuickCreate(false);
      setQuickName("");
      setQuickPhone("");
      queryClient.invalidateQueries({ queryKey: ["contacts-search-whatsapp", currentWorkspace?.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleApplyTemplate = (templateId: string) => {
    const t = templates?.find((x) => x.id === templateId);
    if (!t) return;
    // Substituições básicas
    const ctx: Record<string, string> = {
      contact_name: selectedContact?.name ?? "",
      product_name: productName ?? "",
      product_price: typeof productPrice === "number" ? `${productPrice.toFixed(2)} €` : "",
      product_link: productLink ?? "",
      product_short_description: productExtra?.short_description ?? "",
    };
    let text = t.content;
    for (const [k, v] of Object.entries(ctx)) {
      text = text.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "gi"), v);
    }
    setMessage(text);
    toast.success(`Template "${t.name}" aplicado`);
  };

  const handleSend = async () => {
    const parsed = messageSchema.safeParse(message);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!normalizedPhone) {
      toast.error("Telefone inválido. Use formato português ou internacional (+351...).");
      return;
    }

    try {
      const result = await send.mutateAsync({
        phone: normalizedPhone,
        contactId: selectedContactId ?? undefined,
        conversationId: prefillConversationId ?? undefined,
        messageType: "product",
        text: parsed.data,
        productId,
        mediaUrl: productImageUrl ?? undefined,
        metadata: {
          source: prefillConversationId ? "conversation" : "product_detail",
          product_name: productName,
          product_price: productPrice,
          product_link: productLink,
          product_image: productImageUrl,
        },
      });

      await registerShare.mutateAsync({
        productId,
        contactId: selectedContactId ?? null,
        conversationId: prefillConversationId ?? null,
        providerMessageId: result.providerMessageId,
      });

      toast.success("Produto enviado por WhatsApp ✅");
      onOpenChange(false);
    } catch {
      // toast já tratado no hook
    }
  };

  const productTemplates = useMemo(
    () => templates?.filter((t) => t.category === "sales" || /produto/i.test(t.name)) ?? [],
    [templates],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Enviar produto por WhatsApp
          </DialogTitle>
          <DialogDescription>
            Partilhe este produto com um contacto. A operação fica registada no histórico do cliente, do produto e da conversa.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do produto */}
        <div className="flex gap-3 p-3 rounded-lg border bg-muted/30">
          {productImageUrl && (
            <img src={productImageUrl} alt={productName} className="h-16 w-16 rounded object-cover shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{productName ?? "Produto"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              {typeof productPrice === "number" && <span className="text-emerald-600 font-semibold">{productPrice.toFixed(2)} €</span>}
              {productExtra?.category && <Badge variant="outline" className="text-[10px]">{productExtra.category}</Badge>}
              {productExtra?.stock_status && <Badge variant="secondary" className="text-[10px]">{productExtra.stock_status}</Badge>}
            </div>
            {productExtra?.short_description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{productExtra.short_description}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 flex-1 overflow-hidden">
          {/* Lado esquerdo: contacto */}
          <div className="space-y-3 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <Label>Destinatário</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={() => setShowQuickCreate((v) => !v)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {showQuickCreate ? "Cancelar" : "Criar contacto"}
              </Button>
            </div>

            {showQuickCreate ? (
              <div className="space-y-2 p-3 border rounded-md bg-muted/20">
                <Input
                  placeholder="Nome"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  maxLength={120}
                />
                <Input
                  placeholder="Telefone (ex: 912345678)"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  maxLength={30}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => quickCreate.mutate()}
                  disabled={quickCreate.isPending || !quickName.trim() || !quickPhone.trim()}
                >
                  {quickCreate.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Guardar contacto
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome, telefone ou email"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="flex-1 border rounded-md min-h-[160px]">
                  {contactsLoading ? (
                    <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : !contacts || contacts.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground p-6">
                      Sem contactos com telefone. Use "Criar contacto" acima.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {contacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedContactId(c.id);
                            setPhoneOverride("");
                          }}
                          className={
                            "w-full text-left px-3 py-2 hover:bg-muted/40 transition " +
                            (selectedContactId === c.id ? "bg-primary/5" : "")
                          }
                        >
                          <div className="text-sm font-medium truncate">{c.name || "Sem nome"}</div>
                          <div className="text-xs text-muted-foreground flex gap-2 items-center">
                            <span className="truncate">{c.phone}</span>
                            {selectedContactId === c.id && (
                              <Badge variant="secondary" className="text-[10px] ml-auto">Selecionado</Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="space-y-1.5">
                  <Label htmlFor="phone-override" className="text-xs">Ou indique um número manualmente</Label>
                  <Input
                    id="phone-override"
                    placeholder="ex: 912345678 (PT por defeito)"
                    value={phoneOverride}
                    onChange={(e) => {
                      setPhoneOverride(e.target.value);
                      if (e.target.value) setSelectedContactId(null);
                    }}
                  />
                  {rawPhone && (
                    <p className={`text-[11px] ${phoneIsValid ? "text-emerald-600" : "text-destructive"}`}>
                      {phoneIsValid ? `✓ ${normalizedPhone}` : "Telefone inválido"}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Lado direito: mensagem com tabs editar/preview */}
          <div className="space-y-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <Label>Mensagem</Label>
              {productTemplates.length > 0 && (
                <Select onValueChange={handleApplyTemplate}>
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="flex-1 flex flex-col min-h-0">
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="text-xs">Editar</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Pré-visualização</TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="flex-1 mt-2 min-h-0">
                <Textarea
                  rows={10}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  className="text-sm h-full min-h-[200px] resize-none"
                />
              </TabsContent>

              <TabsContent value="preview" className="flex-1 mt-2 min-h-0">
                <div className="h-full min-h-[200px] rounded-md p-4 bg-[#e5ddd5] dark:bg-zinc-800 overflow-auto">
                  <div className="ml-auto max-w-[85%] bg-[#dcf8c6] dark:bg-emerald-900/40 rounded-lg p-2.5 shadow-sm">
                    {productImageUrl && (
                      <img src={productImageUrl} alt="" className="rounded mb-2 max-h-32 w-full object-cover" />
                    )}
                    <p className="text-xs whitespace-pre-wrap text-zinc-900 dark:text-zinc-100 break-words">
                      {message || "(mensagem vazia)"}
                    </p>
                    <p className="text-[10px] text-zinc-500 text-right mt-1">agora · ✓✓</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <button
                type="button"
                className="hover:underline flex items-center gap-1"
                onClick={() => setMessage(defaultMessage)}
              >
                <Sparkles className="h-3 w-3" /> Regenerar
              </button>
              <span>{message.length}/2000</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={send.isPending || !phoneIsValid}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

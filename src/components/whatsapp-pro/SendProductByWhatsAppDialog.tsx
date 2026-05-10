import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Search, UserPlus, Sparkles, FileText, MessageCircle, ImageIcon, Plus, X, Package } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppProSend, useRegisterWhatsAppProductShare, useWhatsAppProTemplates } from "@/hooks/useWhatsAppPro";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
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

interface RecommendationItem {
  id: string;
  name: string;
  base_price: number | null;
  link: string | null;
}

function buildDefaultMessage(opts: {
  contactName?: string | null;
  productName?: string;
  productPrice?: number | null;
  productLink?: string | null;
  shortDescription?: string | null;
  taxIncluded?: boolean | null;
  recommendations?: RecommendationItem[];
  embedLink?: boolean;
}): string {
  const firstName = opts.contactName ? opts.contactName.split(" ")[0] : null;
  const greet = firstName ? `Olá ${firstName} 👋` : "Olá 👋";
  const shortDescription = opts.shortDescription?.trim();
  const clippedDescription = shortDescription && shortDescription.length > 220
    ? `${shortDescription.slice(0, 217).trim()}...`
    : shortDescription;

  const taxLabel =
    opts.taxIncluded === true ? "c/ IVA" : opts.taxIncluded === false ? "s/ IVA" : null;
  const priceLine =
    typeof opts.productPrice === "number"
      ? `💶 *${opts.productPrice.toFixed(2)} €*${taxLabel ? ` (${taxLabel})` : ""}`
      : null;

  const lines: string[] = [];
  lines.push(greet);
  lines.push("");
  if (opts.productName) lines.push(`📦 *${opts.productName}*`);
  if (priceLine) lines.push(priceLine);
  if (opts.productLink && opts.embedLink !== false) {
    lines.push(`🛒 Comprar agora: ${opts.productLink}`);
  }
  if (clippedDescription) {
    lines.push("");
    lines.push(clippedDescription);
  }
  if (opts.recommendations && opts.recommendations.length > 0) {
    lines.push("");
    lines.push("✨ *Pode também gostar:*");
    for (const r of opts.recommendations) {
      const price = typeof r.base_price === "number" ? ` — ${r.base_price.toFixed(2)} €` : "";
      lines.push(`• ${r.name}${price}`);
      if (r.link) lines.push(`  ${r.link}`);
    }
  }
  lines.push("");
  lines.push("Se quiser, posso ajudar com a compra ou esclarecer qualquer dúvida.");
  return lines.join("\n");
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não foi possível carregar a imagem (${response.status}).`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("O ficheiro carregado não é uma imagem válida.");
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = originalDataUrl;
  });
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
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
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [showRecPicker, setShowRecPicker] = useState(false);
  const [recSearch, setRecSearch] = useState("");
  const DEFAULT_CTA_PROMPT = "👇 Toque no botão para abrir a página segura do produto.";
  const [ctaPrompt, setCtaPrompt] = useState<string>(DEFAULT_CTA_PROMPT);
  const [showCtaEditor, setShowCtaEditor] = useState(false);

  // Buscar dados extra do produto (short_description, tax) — opcional
  const { data: productExtra } = useQuery({
    queryKey: ["product-short-desc", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("short_description, sheet_slug, images, category, stock_status, tax_included")
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

  // Recomendações: pesquisa e seleção (até 3 produtos)
  const { data: recCandidates } = useQuery({
    queryKey: ["product-rec-picker", currentWorkspace?.id, productId, recSearch, productExtra?.category],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("products")
        .select("id, name, base_price, sheet_slug, category")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .neq("id", productId)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (recSearch.trim().length > 1) {
        q = q.ilike("name", `%${recSearch}%`);
      } else if (productExtra?.category) {
        q = q.eq("category", productExtra.category);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && showRecPicker && !!currentWorkspace,
  });

  // Resolver dados completos das recomendações selecionadas (independente da query de pesquisa)
  const { data: selectedRecs } = useQuery({
    queryKey: ["product-rec-selected", recommendedIds, currentWorkspace?.id],
    queryFn: async () => {
      if (recommendedIds.length === 0) return [] as RecommendationItem[];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, base_price, sheet_slug")
        .in("id", recommendedIds);
      if (error) throw error;
      const baseUrl = getPublicBaseUrl();
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        base_price: p.base_price,
        link: currentWorkspace?.slug ? `${baseUrl}/store/${currentWorkspace.slug}/product/${p.id}` : null,
      })) as RecommendationItem[];
    },
    enabled: recommendedIds.length > 0,
  });

  const selectedContact = useMemo(
    () => contacts?.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const rawPhone = phoneOverride.trim() || selectedContact?.phone || prefillPhone || "";
  const normalizedPhone = useMemo(() => toE164(rawPhone, "PT"), [rawPhone]);
  const phoneIsValid = !!rawPhone && isValidPhone(rawPhone, "PT");

  const absoluteProductLink = useMemo(() => {
    const workspaceProductPath = currentWorkspace?.slug ? `/store/${currentWorkspace.slug}/product/${productId}` : null;
    const raw = productLink && !productLink.startsWith("/produto/") ? productLink : workspaceProductPath;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (typeof window !== "undefined") return `${getPublicBaseUrl()}${raw.startsWith("/") ? "" : "/"}${raw}`;
    return raw;
  }, [productLink, currentWorkspace?.slug, productId]);

  // Quando vamos enviar imagem + CTA via Z-API, o link vai como botão numa 2ª mensagem.
  // Nesse caso não duplicamos o URL na caption.
  const willSendCtaButton = !!absoluteProductLink && includeImage;

  const defaultMessage = useMemo(
    () =>
      buildDefaultMessage({
        contactName: selectedContact?.name,
        productName,
        productPrice,
        productLink: absoluteProductLink,
        shortDescription: productExtra?.short_description,
        taxIncluded: (productExtra as any)?.tax_included,
        recommendations: selectedRecs ?? [],
        embedLink: !willSendCtaButton,
      }),
    [selectedContact?.name, productName, productPrice, absoluteProductLink, productExtra, selectedRecs, willSendCtaButton],
  );

  const [message, setMessage] = useState<string>(defaultMessage);

  // Regenerar mensagem quando muda o destinatário ou o produto carrega short_description
  useEffect(() => {
    if (open) setMessage(defaultMessage);
  }, [defaultMessage, open]);

  // Por defeito, partilha com imagem do produto + CTA de compra.
  useEffect(() => {
    if (open) setIncludeImage(true);
  }, [open, productId]);

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
      product_link: absoluteProductLink ?? "",
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
      let mediaUrl = includeImage && productImageUrl ? productImageUrl : undefined;
      if (mediaUrl) {
        try {
          mediaUrl = await imageUrlToDataUrl(mediaUrl);
        } catch {
          // Se a conversão falhar, mantém o URL original para o provider tentar enviar por link público.
        }
      }
      const result = await send.mutateAsync({
        phone: normalizedPhone,
        contactId: selectedContactId ?? undefined,
        conversationId: prefillConversationId ?? undefined,
        messageType: mediaUrl ? "product" : "text",
        text: parsed.data,
        productId,
        mediaUrl,
        ctaUrl: absoluteProductLink,
        ctaLabel: "Comprar Agora",
        ctaPrompt: ctaPrompt.trim() || DEFAULT_CTA_PROMPT,
        metadata: {
          source: prefillConversationId ? "conversation" : "product_detail",
          product_name: productName,
          product_price: productPrice,
          product_link: absoluteProductLink,
          include_image: includeImage,
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

            {productImageUrl && (
              <label className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-md border bg-muted/30">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Anexar imagem do produto
                  <span className="text-[10px] text-muted-foreground/70">
                    ({includeImage ? "imagem + botão" : "só texto + botão"})
                  </span>
                </span>
                <Switch checked={includeImage} onCheckedChange={setIncludeImage} />
              </label>
            )}

            {/* Recomendações */}
            <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Recomendações ({recommendedIds.length}/3)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] gap-1"
                  onClick={() => setShowRecPicker((v) => !v)}
                >
                  <Plus className="h-3 w-3" />
                  {showRecPicker ? "Fechar" : "Adicionar"}
                </Button>
              </div>

              {selectedRecs && selectedRecs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedRecs.map((r) => (
                    <Badge key={r.id} variant="secondary" className="gap-1 pr-1 text-[11px]">
                      <span className="truncate max-w-[140px]">{r.name}</span>
                      <button
                        type="button"
                        onClick={() => setRecommendedIds((ids) => ids.filter((x) => x !== r.id))}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {showRecPicker && (
                <div className="space-y-1.5 pt-1 border-t">
                  <Input
                    placeholder="Pesquisar produto…"
                    value={recSearch}
                    onChange={(e) => setRecSearch(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <ScrollArea className="h-[120px] border rounded bg-background">
                    {!recCandidates || recCandidates.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground p-3 text-center">
                        Sem produtos encontrados.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {recCandidates.map((p: any) => {
                          const picked = recommendedIds.includes(p.id);
                          const disabled = !picked && recommendedIds.length >= 3;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setRecommendedIds((ids) =>
                                  picked ? ids.filter((x) => x !== p.id) : [...ids, p.id],
                                );
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/40 transition disabled:opacity-40 ${picked ? "bg-primary/5" : ""}`}
                            >
                              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs truncate flex-1">{p.name}</span>
                              {typeof p.base_price === "number" && (
                                <span className="text-[11px] text-emerald-600 font-medium">
                                  {p.base_price.toFixed(2)} €
                                </span>
                              )}
                              {picked && <Badge variant="secondary" className="text-[9px]">✓</Badge>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* CTA prompt (texto da bolha do botão) */}
            {willSendCtaButton && (
              <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Texto antes do botão "Comprar Agora"
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px]"
                    onClick={() => setShowCtaEditor((v) => !v)}
                  >
                    {showCtaEditor ? "Ocultar" : "Personalizar"}
                  </Button>
                </div>
                {showCtaEditor ? (
                  <Input
                    value={ctaPrompt}
                    onChange={(e) => setCtaPrompt(e.target.value.slice(0, 120))}
                    maxLength={120}
                    placeholder={DEFAULT_CTA_PROMPT}
                    className="h-7 text-xs"
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                    "{ctaPrompt || DEFAULT_CTA_PROMPT}"
                  </p>
                )}
              </div>
            )}
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
                <div className="h-full min-h-[200px] rounded-md p-4 bg-[#e5ddd5] dark:bg-zinc-800 overflow-auto space-y-2">
                  <div className="ml-auto max-w-[85%] bg-[#dcf8c6] dark:bg-emerald-900/40 rounded-lg p-2.5 shadow-sm">
                    {includeImage && productImageUrl ? (
                      <img src={productImageUrl} alt="" className="rounded mb-2 max-h-24 w-28 object-cover" />
                    ) : absoluteProductLink && !willSendCtaButton ? (
                      <div className="mb-2 rounded border border-border bg-background/80 overflow-hidden">
                        <div className="flex gap-2 p-2">
                          {productImageUrl && <img src={productImageUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" />}
                          <div className="min-w-0 text-left">
                            <p className="text-[11px] font-medium text-foreground line-clamp-2">{productName ?? "Produto"}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{absoluteProductLink}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <p className="text-xs whitespace-pre-wrap text-zinc-900 dark:text-zinc-100 break-words">
                      {message || "(mensagem vazia)"}
                    </p>
                    <p className="text-[10px] text-zinc-500 text-right mt-1">agora · ✓✓</p>
                  </div>

                  {willSendCtaButton && (
                    <div className="ml-auto max-w-[85%] bg-[#dcf8c6] dark:bg-emerald-900/40 rounded-lg p-2.5 shadow-sm">
                      <p className="text-xs text-zinc-900 dark:text-zinc-100 break-words">
                        {ctaPrompt || DEFAULT_CTA_PROMPT}
                      </p>
                      <div className="mt-2 rounded-md bg-background/90 px-3 py-1.5 text-center text-[11px] font-semibold text-primary border border-border">
                        🛒 Comprar Agora
                      </div>
                      <p className="text-[10px] text-zinc-500 text-right mt-1">agora · ✓✓</p>
                    </div>
                  )}
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

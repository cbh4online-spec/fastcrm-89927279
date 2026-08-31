import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWhatsAppCampaigns, type CampaignRecipientInput } from "@/hooks/useWhatsAppCampaigns";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Loader2, Users, FileText } from "lucide-react";
import { toE164 } from "@/utils/phone";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type AudienceMode = "manual" | "contacts" | "leads" | "companies";

export function WhatsAppCampaignWizard({ open, onOpenChange }: Props) {
  const { create } = useWhatsAppCampaigns();
  const { data: templates } = useWhatsAppTemplates();
  const approvedTemplates = (templates || []).filter(t => (t.status || "draft") === "approved" && t.is_active !== false);
  const [templateId, setTemplateId] = useState<string>("");
  const { currentWorkspace } = useWorkspace();
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [throttle, setThrottle] = useState(20);
  const [windowStart, setWindowStart] = useState("09:00");
  const [windowEnd, setWindowEnd] = useState("20:00");
  const [scheduledAt, setScheduledAt] = useState("");
  const [optoutFooter, setOptoutFooter] = useState(true);

  const [audienceMode, setAudienceMode] = useState<AudienceMode>("manual");
  const [phonesText, setPhonesText] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [recipientPreview, setRecipientPreview] = useState<CampaignRecipientInput[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const reset = () => {
    setStep(1);
    setName(""); setMessageText(""); setCtaUrl(""); setCtaLabel("");
    setThrottle(20); setWindowStart("09:00"); setWindowEnd("20:00");
    setScheduledAt(""); setOptoutFooter(true);
    setAudienceMode("manual"); setPhonesText(""); setTagFilter("");
    setRecipientPreview([]);
  };

  const parseManualPhones = (): CampaignRecipientInput[] => {
    return phonesText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const [phone, ...rest] = line.split(/[|\t]/);
        const e164 = toE164(phone.trim());
        return { phone: e164?.replace(/\D/g, "") ?? "", contact_name: rest.join(" ").trim() || null };
      })
      .filter((r) => r.phone.length > 0);
  };

  const loadFromWorkspaceRecords = async (source: "contacts" | "leads" | "companies") => {
    if (!currentWorkspace) return;
    setLoadingPreview(true);
    try {
      const table = source;
      const records: Array<{ id: string; name: string | null; phone: string | null; tags?: string[] | null }> = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        let query = supabase
          .from(table)
          .select(source === "contacts" ? "id, name, phone, tags" : "id, name, phone")
          .eq("workspace_id", currentWorkspace.id)
          .is("archived_at", null)
          .not("phone", "is", null)
          .order("created_at", { ascending: true })
          .range(from, from + pageSize - 1);
        // "leads" não tem soft delete; contactos e empresas têm.
        if (source !== "leads") query = query.is("deleted_at", null);
        query = query.or("is_blocked.is.null,is_blocked.eq.false");
        if (source === "contacts" && tagFilter.trim()) {
          query = query.contains("tags", [tagFilter.trim()]);
        }
        const { data, error } = await query;
        if (error) throw error;
        const page = (data ?? []) as Array<{ id: string; name: string | null; phone: string | null; tags?: string[] | null }>;
        records.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      const seen = new Set<string>();
      let invalidCount = 0;
      let duplicateCount = 0;
      const recipients = records.flatMap((record) => {
        const e164 = toE164(record.phone ?? "");
        const phone = e164?.replace(/\D/g, "") ?? "";
        if (!phone) { invalidCount += 1; return []; }
        if (seen.has(phone)) { duplicateCount += 1; return []; }
        seen.add(phone);
        return [{
          phone,
          contact_name: record.name ?? null,
          ...(source === "contacts" ? { contact_id: record.id } : {}),
          ...(source === "leads" ? { lead_id: record.id } : {}),
          ...(source === "companies" ? { company_id: record.id } : {}),
        }];
      });
      setRecipientPreview(recipients);
      const labels = { contacts: "contactos", leads: "leads", companies: "empresas" };
      toast.success(`${recipients.length} ${labels[source]} elegíveis · ${invalidCount} inválidos · ${duplicateCount} duplicados excluídos`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha a carregar audiência");
    } finally {
      setLoadingPreview(false);
    }
  };

  const recipients =
    audienceMode === "manual" ? parseManualPhones() : recipientPreview;

  const handleAudienceModeChange = (value: string) => {
    if (value !== "manual" && value !== "contacts" && value !== "leads" && value !== "companies") return;
    setAudienceMode(value);
    setRecipientPreview([]);
  };

  const canCreate =
    name.trim().length > 0 &&
    messageText.trim().length > 0 &&
    recipients.length > 0;

  const submit = async () => {
    await create.mutateAsync({
      name: name.trim(),
      message_text: messageText.trim(),
      cta_url: ctaUrl.trim() || null,
      cta_label: ctaLabel.trim() || null,
      throttle_per_minute: throttle,
      send_window_start: windowStart,
      send_window_end: windowEnd,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      append_optout_footer: optoutFooter,
      recipients,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova campanha WhatsApp</DialogTitle>
          <DialogDescription>
            Mensagem, audiência e cadência. Opt-outs são respeitados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={`s${step}`} onValueChange={(v) => setStep(parseInt(v.slice(1)))}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="s1">1. Mensagem</TabsTrigger>
            <TabsTrigger value="s2">2. Audiência</TabsTrigger>
            <TabsTrigger value="s3">3. Cadência</TabsTrigger>
          </TabsList>

          <TabsContent value="s1" className="space-y-3 mt-4">
            <div>
              <Label>Nome interno</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Black Friday – clientes ativos" />
            </div>
            {approvedTemplates.length > 0 && (
              <div>
                <Label className="flex items-center gap-1"><FileText className="h-3 w-3" /> Usar template aprovado (opcional)</Label>
                <Select
                  value={templateId}
                  onValueChange={(v) => {
                    setTemplateId(v);
                    const t = approvedTemplates.find(x => x.id === v);
                    if (t) setMessageText(t.body);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar template…" /></SelectTrigger>
                  <SelectContent>
                    {approvedTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.language})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Mensagem</Label>
              <Textarea
                rows={6}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Olá {{name}}, temos uma novidade para ti..."
              />
              <p className="text-xs text-muted-foreground mt-1">Variáveis: {"{{name}}"}, {"{{phone}}"} ou as definidas no template.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Botão CTA – Texto (opcional)</Label>
                <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Ver oferta" />
              </div>
              <div>
                <Label>Botão CTA – URL</Label>
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Adicionar rodapé de opt-out</p>
                <p className="text-xs text-muted-foreground">"Para deixar de receber, responde STOP."</p>
              </div>
              <Switch checked={optoutFooter} onCheckedChange={setOptoutFooter} />
            </div>
          </TabsContent>

          <TabsContent value="s2" className="space-y-3 mt-4">
            <Tabs value={audienceMode} onValueChange={handleAudienceModeChange}>
              <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="manual">Lista manual</TabsTrigger>
                <TabsTrigger value="contacts">Contactos</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="companies">Empresas</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-2 mt-3">
                <Label>Telefones (um por linha; opcionalmente "telefone | nome")</Label>
                <Textarea
                  rows={8}
                  value={phonesText}
                  onChange={(e) => setPhonesText(e.target.value)}
                  placeholder={"351912345678 | João\n351933333333"}
                />
                <p className="text-xs text-muted-foreground">{parseManualPhones().length} contactos válidos</p>
              </TabsContent>
              <TabsContent value="contacts" className="space-y-2 mt-3">
                <div className="flex gap-2">
                  <Input value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="Tag (ex: cliente-vip). Vazio = todos" />
                  <Button type="button" onClick={() => loadFromWorkspaceRecords("contacts")} disabled={loadingPreview}>
                    {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                    Carregar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{recipientPreview.length} contactos selecionados</p>
              </TabsContent>
              <TabsContent value="leads" className="space-y-2 mt-3">
                <p className="text-sm text-muted-foreground">Carrega todos os Leads ativos com telefone válido. Números repetidos são enviados apenas uma vez.</p>
                <Button type="button" onClick={() => loadFromWorkspaceRecords("leads")} disabled={loadingPreview}>
                  {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Carregar Leads elegíveis
                </Button>
                <p className="text-xs text-muted-foreground">{recipientPreview.length} leads selecionados</p>
              </TabsContent>
              <TabsContent value="companies" className="space-y-2 mt-3">
                <p className="text-sm text-muted-foreground">Carrega todas as Empresas ativas com telefone válido. Números repetidos são enviados apenas uma vez.</p>
                <Button type="button" onClick={() => loadFromWorkspaceRecords("companies")} disabled={loadingPreview}>
                  {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Carregar Empresas elegíveis
                </Button>
                <p className="text-xs text-muted-foreground">{recipientPreview.length} empresas selecionadas</p>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="s3" className="space-y-3 mt-4">
            <div>
              <Label>Mensagens por minuto (anti-ban): {throttle}</Label>
              <Input type="range" min={5} max={60} step={5} value={throttle} onChange={(e) => setThrottle(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Recomendado: 15–25/min para Z-API.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Janela – Início</Label>
                <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
              </div>
              <div>
                <Label>Janela – Fim</Label>
                <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Agendar (opcional)</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Vazio = inicia manualmente após criar.</p>
            </div>
            <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
              <div><span className="text-muted-foreground">Destinatários:</span> <strong>{recipients.length}</strong></div>
              <div><span className="text-muted-foreground">Tempo estimado:</span> <strong>{recipients.length > 0 ? Math.ceil(recipients.length / throttle) : 0} min</strong></div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Anterior</Button>}
          {step < 3 && <Button onClick={() => setStep(step + 1)}>Seguinte</Button>}
          {step === 3 && (
            <Button onClick={submit} disabled={!canCreate || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar campanha
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

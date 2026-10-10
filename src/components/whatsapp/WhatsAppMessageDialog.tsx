/**
 * Diálogo "Enviar WhatsApp" — usado nas fichas de Contacto, Lead e Empresa.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ExternalLink, Loader2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { OBJECTION_REPLIES, fillObjectionReply } from "@/lib/prospecting/objectionReplies";
import {
  buildWhatsAppLinks,
  isMobileDevice,
  normalizeWhatsAppNumber,
  type WhatsAppCallEntityType,
} from "@/hooks/useWhatsAppCall";
import {
  applyTemplateVariables,
  useEntityWhatsAppConversation,
  useGHLWhatsAppAvailable,
  useSendWhatsAppMessage,
  WHATSAPP_MESSAGE_MAX_LENGTH,
  type WhatsAppSendChannel,
} from "@/hooks/useWhatsAppMessage";
import { useWhatsAppProviderInstance, useWhatsAppProTemplates } from "@/hooks/useWhatsAppPro";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone?: string | null;
  entityType: WhatsAppCallEntityType;
  entityId: string;
  entityName?: string | null;
  companyName?: string | null;
  /** Texto pré-preenchido ao abrir (ex.: follow-up de prospeção). */
  initialMessage?: string | null;
  /**
   * Chamado só depois de envio confirmado: resposta de sucesso do fornecedor ou
   * clique explícito em «Já enviei» no envio assistido. É aguardado.
   */
  onSent?: (info: { message: string; channel: WhatsAppSendChannel }) => void | Promise<void>;
  /** Aviso sobre conteúdo partilhado (ex.: vídeo enviado só como ligação). */
  mediaNotice?: string | null;
}

type DeliveryPhase = "compose" | "opened" | "provider_sent";

export function WhatsAppMessageDialog({
  open,
  onOpenChange,
  phone,
  entityType,
  entityId,
  entityName,
  companyName,
  initialMessage,
  onSent,
  mediaNotice,
}: Props) {
  const [phase, setPhase] = useState<DeliveryPhase>("compose");
  const [sentText, setSentText] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const normalized = normalizeWhatsAppNumber(phone);
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [channel, setChannel] = useState<WhatsAppSendChannel>("link");

  const { data: instance, isLoading: loadingInstance } = useWhatsAppProviderInstance();
  const { data: ghlActive } = useGHLWhatsAppAvailable();
  const { data: conversation } = useEntityWhatsAppConversation(entityType, entityId, phone);
  const { data: templates = [] } = useWhatsAppProTemplates();
  const send = useSendWhatsAppMessage();

  const proAvailable = !!instance?.active;
  const ghlAvailable = !!ghlActive && !!conversation?.id;

  useEffect(() => {
    if (!open) return;
    setChannel(proAvailable ? "pro" : ghlAvailable ? "ghl" : "link");
  }, [open, proAvailable, ghlAvailable]);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setTemplateId("none");
      setPhase("compose");
      setSentText("");
    } else if (initialMessage) {
      setMessage(initialMessage);
    }
  }, [open, initialMessage]);

  const activeTemplates = useMemo(() => templates.filter((t) => t.active), [templates]);
  const selectedTemplate = activeTemplates.find((t) => t.id === templateId) ?? null;

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = activeTemplates.find((t) => t.id === id);
    if (tpl) {
      setMessage(applyTemplateVariables(tpl.content ?? "", { name: entityName, company: companyName }));
    }
  };

  const tooLong = message.length > WHATSAPP_MESSAGE_MAX_LENGTH;
  const canSend = !!normalized && message.trim().length > 0 && !tooLong && !send.isPending && phase === "compose" && !recording;

  /** Regista o envio local (queue, etc.). Nunca repete o envio real. */
  const recordSent = async (text: string, via: WhatsAppSendChannel) => {
    setRecording(true);
    try {
      await onSent?.({ message: text, channel: via });
      onOpenChange(false);
    } catch (e) {
      toast.error("Envio feito, mas não foi possível registá-lo", {
        description: e instanceof Error ? e.message : "Tente registar novamente",
      });
    } finally {
      setRecording(false);
    }
  };

  const handleSend = async () => {
    if (!normalized || !canSend) return;
    const text = message.trim();
    if (channel === "link") {
      // Abrir o WhatsApp não é envio: nada é registado até «Já enviei».
      const links = buildWhatsAppLinks(normalized);
      const base = isMobileDevice() ? links.universal : links.web;
      window.open(`${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      setSentText(text);
      setPhase("opened");
      return;
    }
    try {
      await send.mutateAsync({
        channel,
        message: text,
        phone: normalized,
        entityType,
        entityId,
        entityName,
        conversationId: conversation?.id ?? null,
        templateName: selectedTemplate?.name ?? null,
      });
    } catch {
      return; /* erro já reportado no hook; nada foi enviado */
    }
    setSentText(text);
    setPhase("provider_sent");
    await recordSent(text, channel);
  };

  const handleConfirmAssisted = async () => {
    if (phase !== "opened" || !normalized || recording) return;
    setRecording(true);
    try {
      await send.mutateAsync({
        channel: "link",
        message: sentText,
        phone: normalized,
        entityType,
        entityId,
        entityName,
        conversationId: conversation?.id ?? null,
        templateName: selectedTemplate?.name ?? null,
      });
    } catch {
      setRecording(false);
      return;
    }
    setRecording(false);
    await recordSent(sentText, "link");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {entityName ? `${entityName} · ` : ""}
            {normalized ? `+${normalized}` : "Sem número válido"}
          </DialogDescription>
        </DialogHeader>

        {!normalized ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Este registo não tem um número de telefone válido.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {activeTemplates.length > 0 && (
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem template</SelectItem>
                    {activeTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="wa-message">Mensagem</Label>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Respostas rápidas a objeções">
                {OBJECTION_REPLIES.map((o) => (
                  <Button
                    key={o.key}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setMessage(fillObjectionReply(o.template, entityName))}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
              <Textarea
                id="wa-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                readOnly={phase !== "compose"}
                rows={6}
                maxLength={WHATSAPP_MESSAGE_MAX_LENGTH + 200}
                placeholder="Escreva a mensagem…"
              />
              <div className={`text-xs ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
                {message.length}/{WHATSAPP_MESSAGE_MAX_LENGTH} caracteres
              </div>
            </div>

            <div className="space-y-2">
              <Label>Canal de envio</Label>
              <RadioGroup value={channel} onValueChange={(v) => setChannel(v as WhatsAppSendChannel)} className="space-y-2">
                <ChannelOption
                  value="pro"
                  disabled={!proAvailable || loadingInstance}
                  title="FastCRM WhatsApp"
                  hint={
                    proAvailable
                      ? "Envio direto pelo canal do workspace; fica na conversa do Inbox."
                      : "Sem canal WhatsApp ativo neste workspace."
                  }
                />
                <ChannelOption
                  value="ghl"
                  disabled={!ghlAvailable}
                  title="WhatsApp (GHL)"
                  hint={
                    !ghlActive
                      ? "Canal WhatsApp GHL não ativo neste workspace."
                      : !conversation?.id
                        ? "Sem conversa GHL existente para este número."
                        : "Envia pela conversa GHL existente."
                  }
                />
                <ChannelOption
                  value="link"
                  title="Abrir no WhatsApp"
                  hint="Abre o WhatsApp com o texto pré-preenchido. Sem confirmação de entrega."
                />
              </RadioGroup>
              {!proAvailable && !ghlAvailable && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex flex-wrap items-center gap-1">
                    Nenhum canal ligado neste workspace.
                    <Link to="/dashboard/settings?tab=integrations" className="inline-flex items-center gap-1 underline">
                      Configurar integrações <ExternalLink className="h-3 w-3" />
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {mediaNotice && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{mediaNotice}</AlertDescription>
          </Alert>
        )}
        {phase === "opened" && (
          <Alert role="status">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              WhatsApp aberto com a mensagem preparada. Ainda não foi registado nenhum envio: envie no WhatsApp e confirme com «Já enviei».
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {phase === "compose" && (
            <Button onClick={handleSend} disabled={!canSend} className="gap-2">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {channel === "link" ? "Abrir no WhatsApp" : "Enviar"}
            </Button>
          )}
          {phase === "opened" && (
            <Button onClick={handleConfirmAssisted} disabled={recording} className="gap-2">
              {recording && <Loader2 className="h-4 w-4 animate-spin" />}
              Já enviei
            </Button>
          )}
          {phase === "provider_sent" && (
            <Button onClick={() => recordSent(sentText, channel)} disabled={recording} className="gap-2">
              {recording && <Loader2 className="h-4 w-4 animate-spin" />}
              Registar novamente (sem reenviar)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelOption({
  value,
  title,
  hint,
  disabled,
}: {
  value: WhatsAppSendChannel;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={`wa-channel-${value}`}
      className={`flex items-start gap-3 rounded-md border p-3 ${disabled ? "opacity-60" : "cursor-pointer hover:bg-muted/40"}`}
    >
      <RadioGroupItem id={`wa-channel-${value}`} value={value} disabled={disabled} className="mt-1" />
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          {title}
          {disabled && <Badge variant="outline">Indisponível</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </label>
  );
}

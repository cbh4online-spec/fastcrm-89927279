import { useMemo, useState } from "react";
import { CheckCircle, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStorePriceRequest } from "@/hooks/useStorePriceRequests";
import { trackEvent } from "@/lib/analytics";
import type { ConversionGoal, OfferSectorConfig } from "./offerPageTypes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal: ConversionGoal;
  productId: string;
  productName: string;
  workspaceId: string;
  quantity?: number;
  sectorConfig?: OfferSectorConfig;
  preset?: string;
}

type ExtraField = "quantity" | "contactWindow" | "session" | "preferredDate" | "period" | "modality";

interface GoalCopy {
  title: string;
  description: string;
  submitLabel: string;
  successText: string;
  fields: ExtraField[];
}

const GOAL_COPY: Record<string, GoalCopy> = {
  request_quote: {
    title: "Pedir orçamento",
    description: "Solicite uma cotação para",
    submitLabel: "Enviar pedido de orçamento",
    successText: "Enviamos o orçamento para o seu email o mais breve possível.",
    fields: ["quantity"],
  },
  request_contact: {
    title: "Pedir contacto",
    description: "Fale com a nossa equipa sobre",
    submitLabel: "Pedir contacto",
    successText: "Entraremos em contacto no horário indicado.",
    fields: ["contactWindow"],
  },
  enroll: {
    title: "Inscrição",
    description: "Reserve o seu lugar em",
    submitLabel: "Enviar inscrição",
    successText: "Recebemos a sua inscrição. Confirmamos por email.",
    fields: ["session", "modality"],
  },
  book_assessment: {
    title: "Agendar avaliação",
    description: "Agende uma avaliação para",
    submitLabel: "Pedir agendamento",
    successText: "Vamos confirmar a data da avaliação por email.",
    fields: ["preferredDate", "period"],
  },
  book_demo: {
    title: "Marcar demonstração",
    description: "Marque uma demonstração de",
    submitLabel: "Marcar demonstração",
    successText: "Vamos confirmar a demonstração por email.",
    fields: ["preferredDate", "modality"],
  },
};

const CONTACT_WINDOWS = ["Manhã (9h-12h)", "Tarde (14h-18h)", "Fim do dia (18h-20h)"];
const PERIODS = ["Manhã", "Tarde", "Indiferente"];
const MODALITIES = ["Presencial", "Online"];

/**
 * Conversion dialog shared by all non-cart goals.
 * Persists in store_price_requests, tagging the goal and extra fields in the message.
 */
export function OfferConversionDialog({
  open,
  onOpenChange,
  goal,
  productId,
  productName,
  workspaceId,
  quantity = 1,
  sectorConfig,
  preset,
}: Props) {
  const copy = GOAL_COPY[goal] || GOAL_COPY.request_quote;
  const createRequest = useCreateStorePriceRequest();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [qty, setQty] = useState(String(quantity));
  const [contactWindow, setContactWindow] = useState("");
  const [session, setSession] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [period, setPeriod] = useState("");
  const [modality, setModality] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sessionOptions = useMemo(
    () =>
      (sectorConfig?.sessions || [])
        .filter((s) => s && (s.date || s.time || s.location))
        .map((s) => [s.date, s.time, s.location].filter(Boolean).join(" · ")),
    [sectorConfig],
  );

  const isValid =
    name.trim().length > 1 &&
    name.trim().length <= 100 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    message.trim().length <= 1000;

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setContactWindow("");
    setSession("");
    setPreferredDate("");
    setPeriod("");
    setModality("");
    setSubmitted(false);
  };

  const buildMessage = () => {
    const lines: string[] = [`Objetivo: ${copy.title}`];
    if (copy.fields.includes("quantity") && qty) lines.push(`Quantidade: ${qty}`);
    if (copy.fields.includes("contactWindow") && contactWindow) lines.push(`Melhor horário: ${contactWindow}`);
    if (copy.fields.includes("session") && session) lines.push(`Sessão pretendida: ${session}`);
    if (copy.fields.includes("preferredDate") && preferredDate) lines.push(`Data preferida: ${preferredDate}`);
    if (copy.fields.includes("period") && period) lines.push(`Período: ${period}`);
    if (copy.fields.includes("modality") && modality) lines.push(`Modalidade: ${modality}`);
    if (message.trim()) lines.push("", message.trim());
    return lines.join("\n");
  };

  const handleSubmit = () => {
    if (!isValid) return;
    createRequest.mutate(
      {
        workspace_id: workspaceId,
        product_id: productId,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        message: buildMessage(),
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          trackEvent(`smart_offer_${goal}_submitted`, {
            productId,
            workspaceId,
            preset,
            goal,
          });
          setTimeout(() => {
            onOpenChange(false);
            reset();
          }, 2500);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSubmitted(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-primary" />
            <h3 className="text-lg font-semibold">Pedido enviado</h3>
            <p className="text-center text-sm text-muted-foreground">{copy.successText}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5" />
                {copy.title}
              </DialogTitle>
              <DialogDescription>
                {copy.description} <strong>{productName}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="offer-name">Nome *</Label>
                  <Input
                    id="offer-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="O seu nome"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offer-email">Email *</Label>
                  <Input
                    id="offer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offer-phone">Telefone (opcional)</Label>
                <Input
                  id="offer-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+351 9xx xxx xxx"
                  maxLength={20}
                />
              </div>

              {copy.fields.includes("quantity") && (
                <div className="space-y-1.5">
                  <Label htmlFor="offer-qty">Quantidade</Label>
                  <Input
                    id="offer-qty"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>
              )}

              {copy.fields.includes("contactWindow") && (
                <div className="space-y-1.5">
                  <Label>Melhor horário para contacto</Label>
                  <Select value={contactWindow} onValueChange={setContactWindow}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_WINDOWS.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {copy.fields.includes("session") && sessionOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Sessão pretendida</Label>
                  <Select value={session} onValueChange={setSession}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar sessão" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {copy.fields.includes("preferredDate") && (
                <div className="space-y-1.5">
                  <Label htmlFor="offer-date">Data preferida</Label>
                  <Input
                    id="offer-date"
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>
              )}

              {copy.fields.includes("period") && (
                <div className="space-y-1.5">
                  <Label>Período</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {copy.fields.includes("modality") && (
                <div className="space-y-1.5">
                  <Label>Modalidade</Label>
                  <Select value={modality} onValueChange={setModality}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {(sectorConfig?.modalities?.length ? sectorConfig.modalities : MODALITIES).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="offer-message">Mensagem (opcional)</Label>
                <Textarea
                  id="offer-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva o que precisa..."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!isValid || createRequest.isPending}
              >
                {createRequest.isPending ? "A enviar..." : copy.submitLabel}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

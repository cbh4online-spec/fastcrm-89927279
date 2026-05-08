import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, AlertTriangle, ShieldAlert, ListChecks } from "lucide-react";
import { useLeadChefMessageTemplates } from "@/hooks/leadchef/useLeadChefMessageTemplates";
import { LeadChefMessageTemplatePicker } from "./LeadChefMessageTemplatePicker";
import { LeadChefMessagePreview } from "./LeadChefMessagePreview";
import { LeadChefCopyMessageButton } from "./LeadChefCopyMessageButton";
import { buildWhatsAppHref, cleanPhoneNumber } from "@/utils/leadchef/contact";
import {
  buildContextFromLead,
  renderLeadChefTemplate,
  getMissingTemplateVariables,
  type LeadChefTemplateContext,
} from "@/utils/leadchef/templateRenderer";
import {
  LEADCHEF_DEFAULT_TEMPLATES,
  type LeadChefTemplateCategory,
} from "@/utils/leadchef/templates";
import { useCreateLeadChefActivity } from "@/hooks/leadchef/useCreateLeadChefActivity";
import type { LeadChefActivityType } from "@/types/leadchef";
import type { LeadChefMessageTemplate } from "@/types/leadchefTemplates";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  phone: string | null | undefined;
  recipientName?: string | null;
  /** "lead" | "client" | "referral" */
  entityKind: "lead" | "client" | "referral";
  /** id do lead correspondente para registar atividade (se aplicável) */
  leadId?: string | null;
  preferredCategory?: LeadChefTemplateCategory;
  agentName?: string | null;
  context?: Partial<LeadChefTemplateContext>;
  /** Para referências: granted | unknown | denied */
  authorizationStatus?: "granted" | "unknown" | "denied";
  onRegisterContact?: () => void;
}

export function LeadChefWhatsAppActionSheet({
  open, onOpenChange, phone, recipientName, entityKind, leadId,
  preferredCategory, agentName, context, authorizationStatus,
  onRegisterContact,
}: Props) {
  const { data: templates = [] } = useLeadChefMessageTemplates({ activeOnly: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [authConfirmed, setAuthConfirmed] = useState(false);

  const create = useCreateLeadChefActivity();

  // Use defaults as fallback if user has no templates of preferred category
  const candidatesByCategory = useMemo(() => {
    const allByCat = new Map<string, LeadChefMessageTemplate>();
    for (const t of templates) {
      if (!allByCat.has(t.category)) allByCat.set(t.category, t);
    }
    return allByCat;
  }, [templates]);

  const ctx: LeadChefTemplateContext = useMemo(() => {
    return {
      ...buildContextFromLead({
        leadName: entityKind !== "client" ? recipientName : null,
        clientName: entityKind === "client" ? recipientName : null,
        agentName,
      }),
      ...(context ?? {}),
    };
  }, [recipientName, entityKind, agentName, context]);

  // Default selection on open
  useEffect(() => {
    if (!open) return;
    setAuthConfirmed(false);
    let initial: string | null = null;
    let initialBody = "";
    if (preferredCategory && candidatesByCategory.has(preferredCategory)) {
      const t = candidatesByCategory.get(preferredCategory)!;
      initial = t.id;
      initialBody = t.body;
    } else if (preferredCategory) {
      // Fallback to default
      const fallback = LEADCHEF_DEFAULT_TEMPLATES.find((d) => d.category === preferredCategory);
      if (fallback) initialBody = fallback.body;
    }
    setSelectedId(initial);
    setText(renderLeadChefTemplate(initialBody, ctx));
  }, [open, preferredCategory, candidatesByCategory, ctx]);

  const onPick = (id: string | null) => {
    setSelectedId(id);
    if (!id) {
      setText("");
      return;
    }
    const t = templates.find((x) => x.id === id);
    if (t) setText(renderLeadChefTemplate(t.body, ctx));
  };

  const phoneClean = cleanPhoneNumber(phone ?? "");
  const hasPhone = phoneClean.length > 0;

  const isReferral = entityKind === "referral";
  const referralBlocked = isReferral && authorizationStatus === "denied";
  const referralNeedsConfirm = isReferral && authorizationStatus !== "granted" && !referralBlocked;

  const missingVars = getMissingTemplateVariables(text, ctx);

  const canSend =
    hasPhone &&
    text.trim().length > 0 &&
    !referralBlocked &&
    (!referralNeedsConfirm || authConfirmed);

  const registerActivity = async (kind: "prepared" | "registered") => {
    if (!leadId) return;
    try {
      await create.mutateAsync({
        leadId,
        type: "whatsapp" as LeadChefActivityType,
        title: kind === "prepared" ? "Mensagem WhatsApp preparada" : "Contacto WhatsApp registado",
        description: text,
        metadata: { templateId: selectedId, source: "whatsapp_sheet" },
      });
    } catch {
      // toasts já tratados no hook
    }
  };

  const openWhatsApp = async () => {
    if (!canSend) return;
    const href = buildWhatsAppHref(phone ?? "", text);
    window.open(href, "_blank", "noopener,noreferrer");
    await registerActivity("prepared");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Enviar mensagem WhatsApp</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {!hasPhone && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>Este contacto não tem telefone. Adiciona um número antes de enviar.</span>
            </div>
          )}

          {referralBlocked && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5" />
              <span>Esta referência não tem autorização para contacto.</span>
            </div>
          )}

          {referralNeedsConfirm && !referralBlocked && (
            <label className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={authConfirmed}
                onChange={(e) => setAuthConfirmed(e.target.checked)}
              />
              <span>
                Ainda não está confirmada a autorização de contacto. Confirmo que tenho
                autorização para contactar.
              </span>
            </label>
          )}

          <div>
            <Label className="mb-1.5 block">Template</Label>
            <LeadChefMessageTemplatePicker
              templates={templates}
              selectedId={selectedId}
              onChange={onPick}
              preferredCategory={preferredCategory}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Mensagem</Label>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreve a tua mensagem…"
            />
          </div>

          <LeadChefMessagePreview text={text} />

          {missingVars.length > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
              Variáveis sem valor: {missingVars.map((v) => `{{${v}}}`).join(", ")}.
              Edita a mensagem antes de enviar.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              onClick={openWhatsApp}
              disabled={!canSend}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" /> Abrir WhatsApp
            </Button>
            <LeadChefCopyMessageButton text={text} />
          </div>

          {leadId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await registerActivity("registered");
                onRegisterContact?.();
              }}
            >
              <ListChecks className="h-4 w-4 mr-1.5" /> Registar contacto
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <p className="text-[11px] text-slate-500">
            Abrir o WhatsApp não confirma o envio da mensagem. Confirma o envio na app.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

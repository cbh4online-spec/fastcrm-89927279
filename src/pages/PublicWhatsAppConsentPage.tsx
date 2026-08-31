import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsAppConsentCheckbox } from "@/components/whatsapp-pro/WhatsAppConsentCheckbox";
import { WHATSAPP_CONSENT_BRAND, WHATSAPP_CONSENT_VERSION } from "@/lib/whatsapp/consent";
import { toE164 } from "@/utils/phone";
import { Check, Loader2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Landing page pública de recolha de consentimento WhatsApp.
 * URL: /consentimento-whatsapp?w=<workspace_id>&ref=<campanha>&lead=<lead_id>
 */
export default function PublicWhatsAppConsentPage() {
  const [params] = useSearchParams();
  const workspaceId = params.get("w") ?? "";
  const sourceReference = params.get("ref") ?? "landing-consentimento";
  const leadId = params.get("lead");
  const contactId = params.get("contact");

  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      toast.error("Ligação inválida. Peça um novo link.");
      return;
    }
    const e164 = toE164(phone);
    if (!e164) {
      toast.error("Indique um número de telemóvel válido.");
      return;
    }
    if (!accepted) {
      toast.error("Tem de assinalar o consentimento para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-consent-record", {
        body: {
          workspace_id: workspaceId,
          phone: e164,
          accepted: true,
          source: "landing_page",
          source_reference: sourceReference,
          consent_version: WHATSAPP_CONSENT_VERSION,
          lead_id: leadId || null,
          contact_id: contactId || null,
        },
      });
      if (error) throw error;
      if (data && (data as { error?: unknown }).error) throw new Error("Não foi possível registar o consentimento.");
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registar o consentimento.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Consentimento registado</h1>
            <p className="text-muted-foreground">
              Obrigado. A partir de agora poderá receber as nossas comunicações por WhatsApp.
              Pode sair a qualquer momento respondendo <strong>STOP</strong>.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{WHATSAPP_CONSENT_BRAND}</span>
          </div>
          <CardTitle>Receber novidades por WhatsApp</CardTitle>
          <CardDescription>
            Autorize {WHATSAPP_CONSENT_BRAND} a contactá-lo por WhatsApp. É opcional e pode cancelar quando quiser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Novidades e ofertas antes de toda a gente.</li>
            <li className="flex gap-2"><MessageCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Apoio direto, sem esperas ao telefone.</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Sem spam. Responda STOP para sair.</li>
          </ul>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telemóvel</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                maxLength={32}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+351 912 345 678"
                required
              />
            </div>

            <WhatsAppConsentCheckbox checked={accepted} onCheckedChange={setAccepted} />

            <Button type="submit" className="w-full" disabled={submitting || !accepted}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> A registar…</> : "Autorizar contacto por WhatsApp"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

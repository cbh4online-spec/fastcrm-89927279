import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { WHATSAPP_CONSENT_BRAND, WHATSAPP_CONSENT_TEXT, PRIVACY_POLICY_PATH } from "@/lib/whatsapp/consent";
import { toE164 } from "@/utils/phone";
import { Check, Loader2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PublicLink {
  label: string;
  brand_name: string | null;
  consent_text: string;
  consent_version: string;
  privacy_policy_url: string | null;
}

/**
 * Landing page pública de opt-in WhatsApp.
 * URL: /consentimento-whatsapp?t=<token>
 * O token é opaco: nenhum ID interno (workspace, campanha, lead) circula no URL.
 */
export default function PublicWhatsAppConsentPage() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";

  const [link, setLink] = useState<PublicLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"granted" | "revoked" | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("whatsapp-consent-public", {
        body: { action: "resolve", token },
      });
      if (!active) return;
      if (error || !data || (data as { ok?: boolean }).ok !== true) setLink(null);
      else setLink((data as { link: PublicLink }).link);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function call(action: "submit" | "revoke") {
    const e164 = toE164(phone);
    if (!e164) {
      toast.error("Indique um número de telemóvel válido, com indicativo do país.");
      return;
    }
    if (action === "submit" && !accepted) {
      toast.error("Tem de assinalar o consentimento para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-consent-public", {
        body: {
          action,
          token,
          phone: e164,
          ...(action === "submit" ? { accepted: true, name: name.trim() || null } : {}),
        },
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string; recorded?: boolean };
      if (res?.error === "rate_limited") throw new Error("Demasiados pedidos. Tente novamente mais tarde.");
      if (!res?.ok) throw new Error("Não foi possível processar o pedido.");
      setDone(action === "submit" ? "granted" : "revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível processar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-3 py-10">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!token || !link) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <h1 className="mb-2 text-xl font-semibold">Ligação indisponível</h1>
            <p className="text-muted-foreground">
              Este link de consentimento não está ativo. Peça uma nova ligação a quem o partilhou.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const brand = link.brand_name ?? WHATSAPP_CONSENT_BRAND;

  if (done) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold">
              {done === "granted" ? "Consentimento registado" : "Consentimento retirado"}
            </h1>
            <p className="text-muted-foreground">
              {done === "granted"
                ? <>Obrigado. Pode sair a qualquer momento respondendo <strong>STOP</strong> no WhatsApp.</>
                : "Deixará de receber comunicações de marketing por WhatsApp."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{brand}</span>
          </div>
          <CardTitle>Receber novidades por WhatsApp</CardTitle>
          <CardDescription>
            Autorize {brand} a contactá-lo por WhatsApp. É opcional e pode cancelar quando quiser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Novidades e ofertas em primeira mão.</li>
            <li className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Apoio direto, sem esperas ao telefone.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Sem spam. Responda STOP para sair.</li>
          </ul>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void call("submit");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input id="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telemóvel (com indicativo do país)</Label>
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

            <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <Checkbox
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                aria-label="Consentimento WhatsApp"
              />
              <span>
                {link.consent_text || WHATSAPP_CONSENT_TEXT}{" "}
                <a
                  className="underline"
                  href={link.privacy_policy_url ?? PRIVACY_POLICY_PATH}
                  target="_blank"
                  rel="noreferrer"
                >
                  Política de Privacidade
                </a>
                <span className="block text-xs text-muted-foreground">Versão {link.consent_version}</span>
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={submitting || !accepted}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A registar…</> : "Autorizar contacto por WhatsApp"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={submitting}
              onClick={() => void call("revoke")}
            >
              Já autorizei e quero cancelar (STOP)
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

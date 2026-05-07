import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, FileText, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

interface Proposal {
  id: string;
  title: string;
  content_blocks: any;
  price: number;
  currency: string;
  status: string;
  expires_at: string | null;
  payment_conditions: string | null;
  expired: boolean;
}

type Mode = "view" | "accept" | "changes" | "reject" | "done";

export default function PublicProposalPortalPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("view");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<any>({ accepted_terms: false, accepted_privacy: false });
  const [resultMsg, setResultMsg] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    fetch(`${FN_BASE}/portal-load-proposal?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast.error("Proposta não encontrada ou inválida");
        } else setProposal(d);
      })
      .catch(() => toast.error("Erro ao carregar proposta"))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (action: "accept" | "request_changes" | "reject") => {
    if (!token) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${FN_BASE}/portal-accept-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, payload: form }),
      });
      const d = await r.json();
      if (d.success) {
        setMode("done");
        setResultMsg(
          action === "accept"
            ? "Aceitação registada. A nossa equipa vai contactar-te para iniciar o onboarding."
            : action === "request_changes"
            ? "Pedido de alteração registado. A equipa irá rever e responder."
            : "Pedido de rejeição registado. Obrigado pelo feedback."
        );
      } else {
        toast.error("Erro ao submeter. Tenta novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">A carregar proposta…</div>;
  if (!proposal) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md"><CardContent className="pt-6 text-center space-y-3">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
        <h2 className="text-xl font-semibold">Proposta não encontrada</h2>
        <p className="text-muted-foreground text-sm">O link pode ter expirado ou ser inválido.</p>
      </CardContent></Card>
    </div>
  );

  if (mode === "done") return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-primary/5 to-background">
      <Card className="max-w-md"><CardContent className="pt-6 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Obrigado!</h2>
        <p className="text-muted-foreground">{resultMsg}</p>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> Portal seguro</Badge>
          <h1 className="text-3xl md:text-4xl font-bold">{proposal.title}</h1>
          <p className="text-muted-foreground">Reveja a proposta abaixo e escolha como pretende avançar.</p>
        </header>

        {proposal.expired && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium">Esta proposta expirou.</p>
                <p className="text-sm text-muted-foreground">Pode pedir uma atualização à equipa comercial.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Investimento total</span>
              <span className="text-3xl font-bold">{proposal.price?.toLocaleString("pt-PT")} {proposal.currency || "EUR"}</span>
            </div>
            {proposal.payment_conditions && (
              <><Separator /><div><div className="text-sm text-muted-foreground mb-1">Condições</div><div>{proposal.payment_conditions}</div></div></>
            )}
            {proposal.expires_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Válida até {new Date(proposal.expires_at).toLocaleDateString("pt-PT")}
              </div>
            )}
          </CardContent>
        </Card>

        {!proposal.expired && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button size="lg" className="gap-2" onClick={() => setMode("accept")}>
              <CheckCircle2 className="h-4 w-4" /> Aceitar proposta
            </Button>
            <Button size="lg" variant="outline" onClick={() => setMode("changes")}>Pedir alteração</Button>
            <Button size="lg" variant="ghost" onClick={() => setMode("reject")}>Rejeitar</Button>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" /> Powered by FastCRM Customer Portal
        </p>
      </div>

      {/* ACCEPT DIALOG */}
      <Dialog open={mode === "accept"} onOpenChange={(o) => !o && setMode("view")}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Aceitar proposta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome*</Label><Input onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email*</Label><Input type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Cargo</Label><Input onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
              <div className="col-span-2"><Label>Empresa*</Label><Input onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>NIF</Label><Input onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
              <div><Label>Morada fiscal</Label><Input onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2"><Checkbox onCheckedChange={(c) => setForm({ ...form, accepted_terms: !!c })} /><span>Aceito os termos comerciais apresentados.</span></label>
              <label className="flex items-start gap-2"><Checkbox onCheckedChange={(c) => setForm({ ...form, accepted_privacy: !!c })} /><span>Confirmo que os dados fornecidos estão corretos.</span></label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode("view")}>Cancelar</Button>
            <Button disabled={!form.name || !form.email || !form.company_name || !form.accepted_terms || !form.accepted_privacy || submitting}
              onClick={() => submit("accept")}>Submeter aceitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHANGES DIALOG */}
      <Dialog open={mode === "changes"} onOpenChange={(o) => !o && setMode("view")}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pedir alteração</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome*</Label><Input onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email*</Label><Input type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Tipo de alteração</Label>
              <Select onValueChange={(v) => setForm({ ...form, change_type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Preço</SelectItem>
                  <SelectItem value="modules">Módulos</SelectItem>
                  <SelectItem value="timeline">Prazo</SelectItem>
                  <SelectItem value="terms">Condições</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Mensagem*</Label><Textarea rows={4} onChange={(e) => setForm({ ...form, requested_changes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode("view")}>Cancelar</Button>
            <Button disabled={!form.name || !form.email || !form.requested_changes || submitting} onClick={() => submit("request_changes")}>Submeter pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG */}
      <Dialog open={mode === "reject"} onOpenChange={(o) => !o && setMode("view")}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar proposta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Motivo</Label>
              <Select onValueChange={(v) => setForm({ ...form, rejection_category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Preço</SelectItem>
                  <SelectItem value="timing">Timing</SelectItem>
                  <SelectItem value="no_need">Falta de necessidade</SelectItem>
                  <SelectItem value="competitor">Escolheu concorrente</SelectItem>
                  <SelectItem value="internal_review">Precisa rever internamente</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Comentário</Label><Textarea rows={3} onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode("view")}>Cancelar</Button>
            <Button variant="destructive" disabled={submitting} onClick={() => submit("reject")}>Confirmar rejeição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

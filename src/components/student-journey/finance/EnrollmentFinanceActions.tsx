import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, FileText, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildInstallmentPlan, planMatchesAgreed, type PlanFrequency } from "@/lib/studentJourney/enrollmentFinance";
import { lisbonTodayYmd } from "@/lib/dates/lisbonDays";

const db = supabase as any;
const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);

export const PAYMENT_METHODS = [
  { value: "mbway", label: "MB Way" },
  { value: "transferencia", label: "Transferência" },
  { value: "numerario", label: "Numerário" },
  { value: "cartao", label: "Cartão" },
  { value: "stripe", label: "Stripe" },
  { value: "outro", label: "Outro" },
];

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["sj-enrollment-finance"] });
    qc.invalidateQueries({ queryKey: ["sj-finance-overview"] });
    qc.invalidateQueries({ queryKey: ["sj-enrollments"] });
    qc.invalidateQueries({ queryKey: ["sj-due-soon"] });
  };
}
const errMsg = (e: any) => e?.message?.replace(/^.*?:\s/, "") || "Operação falhou";

interface Props {
  enrollmentId: string;
  contactId?: string | null;
  base: number | null;
  discount: number;
  agreed: number;
  open: number;
  hasPlan: boolean;
}

export function EnrollmentFinanceActions(props: Props) {
  const [dlg, setDlg] = useState<null | "plan" | "pay" | "inv">(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setDlg("plan")}><CalendarClock className="mr-1 h-4 w-4" aria-hidden />Plano de pagamento</Button>
      <Button size="sm" variant="outline" onClick={() => setDlg("pay")} disabled={!props.hasPlan || props.open <= 0}
        title={!props.hasPlan ? "Defina primeiro o plano" : undefined}><Wallet className="mr-1 h-4 w-4" aria-hidden />Registar pagamento</Button>
      <Button size="sm" variant="outline" onClick={() => setDlg("inv")}><FileText className="mr-1 h-4 w-4" aria-hidden />Associar fatura</Button>
      {dlg === "plan" && <PlanDialog {...props} onClose={() => setDlg(null)} />}
      {dlg === "pay" && <PaymentDialog {...props} onClose={() => setDlg(null)} />}
      {dlg === "inv" && <InvoiceDialog {...props} onClose={() => setDlg(null)} />}
    </div>
  );
}

const planSchema = z.object({
  base: z.number().min(0).max(1_000_000),
  discount: z.number().min(0).max(1_000_000),
  agreed: z.number().min(0).max(1_000_000),
  count: z.number().int().min(1).max(60),
});

function PlanDialog({ enrollmentId, base, discount, agreed, onClose }: Props & { onClose: () => void }) {
  const invalidate = useInvalidate();
  const [b, setB] = useState(String(base ?? agreed ?? 0));
  const [d, setD] = useState(String(discount ?? 0));
  const [a, setA] = useState(String(agreed ?? 0));
  const [reason, setReason] = useState("");
  const [count, setCount] = useState("1");
  const [first, setFirst] = useState(lisbonTodayYmd());
  const [freq, setFreq] = useState<PlanFrequency>("mensal");
  const [rows, setRows] = useState<{ amount: number; due_date: string }[] | null>(null);

  const agreedN = Number(a.replace(",", "."));
  const generated = useMemo(
    () => (Number.isFinite(agreedN) && first ? buildInstallmentPlan(agreedN, Number(count) || 1, first, freq) : []),
    [agreedN, count, first, freq],
  );
  const plan = rows ?? generated;
  const sumOk = planMatchesAgreed(plan, agreedN || 0);

  const m = useMutation({
    mutationFn: async () => {
      const parsed = planSchema.safeParse({ base: Number(b.replace(",", ".")), discount: Number(d.replace(",", ".")), agreed: agreedN, count: plan.length });
      if (!parsed.success) throw new Error("Valores inválidos");
      if (!sumOk) throw new Error("A soma das prestações tem de ser igual ao valor acordado");
      const { error } = await db.rpc("sj_set_payment_plan", {
        _enrollment_id: enrollmentId, _base: parsed.data.base, _discount: parsed.data.discount,
        _agreed: parsed.data.agreed, _discount_reason: reason.slice(0, 300) || null, _installments: plan,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plano de pagamento guardado"); invalidate(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plano de pagamento</DialogTitle>
          <DialogDescription>Os pagamentos já recebidos são reaplicados às novas prestações.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <div><Label htmlFor="pb">Valor base</Label><Input id="pb" inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} /></div>
          <div><Label htmlFor="pd">Desconto</Label><Input id="pd" inputMode="decimal" value={d} onChange={(e) => {
            setD(e.target.value);
            const nb = Number(b.replace(",", ".")), nd = Number(e.target.value.replace(",", "."));
            if (Number.isFinite(nb) && Number.isFinite(nd)) { setA(String(Math.max(0, nb - nd))); setRows(null); }
          }} /></div>
          <div><Label htmlFor="pa">Valor acordado</Label><Input id="pa" inputMode="decimal" value={a} onChange={(e) => { setA(e.target.value); setRows(null); }} /></div>
        </div>
        {Number(d) > 0 && (
          <div><Label htmlFor="pr">Motivo do desconto</Label><Textarea id="pr" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div><Label htmlFor="pc">Prestações</Label><Input id="pc" type="number" min={1} max={60} value={count} onChange={(e) => { setCount(e.target.value); setRows(null); }} /></div>
          <div><Label htmlFor="pf">1.º vencimento</Label><Input id="pf" type="date" value={first} onChange={(e) => { setFirst(e.target.value); setRows(null); }} /></div>
          <div><Label>Periodicidade</Label>
            <Select value={freq} onValueChange={(v) => { setFreq(v as PlanFrequency); setRows(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="mensal">Mensal</SelectItem><SelectItem value="quinzenal">Quinzenal</SelectItem><SelectItem value="semanal">Semanal</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <ul className="divide-y rounded-md border text-sm">
          {plan.map((p, i) => (
            <li key={i} className="flex items-center gap-2 p-2">
              <span className="w-8 text-muted-foreground">{i + 1}.</span>
              <Input aria-label={`Vencimento da prestação ${i + 1}`} type="date" className="h-8" value={p.due_date}
                onChange={(e) => setRows(plan.map((r, k) => (k === i ? { ...r, due_date: e.target.value } : r)))} />
              <Input aria-label={`Valor da prestação ${i + 1}`} inputMode="decimal" className="h-8 w-28" value={String(p.amount)}
                onChange={(e) => setRows(plan.map((r, k) => (k === i ? { ...r, amount: Number(e.target.value.replace(",", ".")) || 0 } : r)))} />
            </li>
          ))}
        </ul>
        {!sumOk && <p role="alert" className="text-sm text-destructive">A soma das prestações ({eur(plan.reduce((s, p) => s + p.amount, 0))}) difere do valor acordado.</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !sumOk}>Guardar plano</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ enrollmentId, open, onClose }: Props & { onClose: () => void }) {
  const invalidate = useInvalidate();
  const [amount, setAmount] = useState(String(open));
  const [date, setDate] = useState(lisbonTodayYmd());
  const [method, setMethod] = useState("transferencia");
  const [ref, setRef] = useState("");
  const n = Number(amount.replace(",", "."));
  const valid = Number.isFinite(n) && n > 0 && n <= open + 0.004 && !!date && date <= lisbonTodayYmd();
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("sj_register_payment", {
        _enrollment_id: enrollmentId, _amount: n, _paid_on: date, _method: method, _reference: ref.trim().slice(0, 200) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pagamento registado"); invalidate(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registar pagamento</DialogTitle>
          <DialogDescription>Em aberto: {eur(open)}. Um pagamento não emite fatura.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <div><Label htmlFor="ya">Valor</Label><Input id="ya" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label htmlFor="yd">Data</Label><Input id="yd" type="date" max={lisbonTodayYmd()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div><Label>Método</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="yr">Referência</Label><Input id="yr" maxLength={200} value={ref} onChange={(e) => setRef(e.target.value)} /></div>
        {!valid && amount && <p role="alert" className="text-sm text-destructive">Valor tem de ser positivo e não superior ao saldo; a data não pode ser futura.</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={!valid || m.isPending}>Registar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({ enrollmentId, contactId, onClose }: Props & { onClose: () => void }) {
  const invalidate = useInvalidate();
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<{ id: string; total: number } | null>(null);
  const [alloc, setAlloc] = useState("");
  const search = useQuery({
    queryKey: ["sj-invoice-search", ws, contactId, q],
    enabled: !!ws,
    queryFn: async () => {
      let query = db.from("invoices").select("id, invoice_number, client_name, total, status, issue_date, document_type")
        .eq("workspace_id", ws).order("issue_date", { ascending: false }).limit(20);
      const term = q.trim().replace(/[%,()]/g, "");
      if (term) query = query.or(`invoice_number.ilike.%${term}%,client_name.ilike.%${term}%`);
      else if (contactId) query = query.eq("contact_id", contactId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const m = useMutation({
    mutationFn: async () => {
      const v = alloc.trim() ? Number(alloc.replace(",", ".")) : null;
      if (v != null && (!Number.isFinite(v) || v <= 0)) throw new Error("Valor atribuído inválido");
      const { error } = await db.rpc("sj_link_invoice", { _enrollment_id: enrollmentId, _invoice_id: selected!.id, _allocated: v });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fatura associada"); invalidate(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Associar fatura existente</DialogTitle>
          <DialogDescription>Nenhum documento fiscal é emitido aqui. Pró-formas e anuladas não contam como faturado.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Pesquisar fatura" placeholder="Número ou nome do cliente" maxLength={80} value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm" role="listbox" aria-label="Faturas">
          {search.isLoading && <li className="p-2 text-muted-foreground">A pesquisar…</li>}
          {search.isError && <li className="p-2 text-destructive">Não foi possível pesquisar.</li>}
          {search.data?.length === 0 && <li className="p-2 text-muted-foreground">Sem faturas encontradas.</li>}
          {search.data?.map((i) => (
            <li key={i.id}>
              <button type="button" role="option" aria-selected={selected?.id === i.id}
                onClick={() => { setSelected({ id: i.id, total: Number(i.total) }); setAlloc(String(i.total ?? "")); }}
                className={`flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected?.id === i.id ? "bg-muted" : ""}`}>
                <span>{i.invoice_number || "Sem número"} · {i.client_name || "—"} <span className="text-xs text-muted-foreground">{i.document_type} {i.status}</span></span>
                <span className="tabular-nums">{eur(Number(i.total || 0))}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected && <div><Label htmlFor="ia">Valor atribuído a esta inscrição</Label><Input id="ia" inputMode="decimal" value={alloc} onChange={(e) => setAlloc(e.target.value)} /></div>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={!selected || m.isPending}>Associar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

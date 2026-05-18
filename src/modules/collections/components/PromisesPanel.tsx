import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X } from "lucide-react";
import { usePaymentPromises, useCreatePromise, useResolvePromise } from "../hooks/usePaymentPromises";
import { formatEur } from "../lib/collectionsFormat";

interface Props { caseId: string; outstanding: number; }

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  kept: "secondary",
  broken: "destructive",
  cancelled: "outline",
};

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  kept: "Cumprida",
  broken: "Quebrada",
  cancelled: "Cancelada",
};

export function PromisesPanel({ caseId, outstanding }: Props) {
  const { data: promises = [], isLoading } = usePaymentPromises(caseId);
  const create = useCreatePromise();
  const resolve = useResolvePromise();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState<string>(outstanding.toFixed(2));
  const [date, setDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !date) return;
    create.mutate(
      { caseId, promised_amount: amt, promised_date: date, notes: notes || undefined },
      { onSuccess: () => { setShowForm(false); setNotes(""); setDate(""); } },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Promessas de pagamento</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <form onSubmit={submit} className="space-y-2 rounded-md border p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Valor (€)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs">Data prometida</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={create.isPending}>Registar</Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">A carregar…</p>
        ) : promises.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem promessas registadas.</p>
        ) : (
          <div className="space-y-2">
            {promises.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="space-y-0.5">
                  <div className="font-medium">{formatEur(Number(p.promised_amount))}</div>
                  <div className="text-xs text-muted-foreground">Para {p.promised_date}</div>
                  {p.notes && <div className="text-xs text-muted-foreground line-clamp-1">{p.notes}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={statusVariant[p.status] ?? "outline"}>{statusLabel[p.status] ?? p.status}</Badge>
                  {p.status === "pending" && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Cumprida"
                        onClick={() => resolve.mutate({ id: p.id, status: "kept" })}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Quebrada"
                        onClick={() => resolve.mutate({ id: p.id, status: "broken" })}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

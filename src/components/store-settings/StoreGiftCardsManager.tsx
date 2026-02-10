import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useStoreGiftCards, useCreateGiftCard, useToggleGiftCardStatus } from "@/hooks/useStoreGiftCards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Gift, Copy } from "lucide-react";
import { toast } from "sonner";

const PRESET_VALUES = [10, 25, 50, 100];

export function StoreGiftCardsManager() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id || "";
  const { data: giftCards = [], isLoading } = useStoreGiftCards(workspaceId);
  const createGiftCard = useCreateGiftCard(workspaceId);
  const toggleStatus = useToggleGiftCardStatus(workspaceId);
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = async (value: number) => {
    await createGiftCard.mutateAsync({
      initial_balance: value,
      recipient_name: recipientName || undefined,
      recipient_email: recipientEmail || undefined,
      message: message || undefined,
    });
    setOpen(false);
    setCustomValue("");
    setRecipientName("");
    setRecipientEmail("");
    setMessage("");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Ativo</Badge>;
      case "depleted": return <Badge variant="secondary">Esgotado</Badge>;
      case "disabled": return <Badge variant="destructive">Desativado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Gift Cards</CardTitle>
            <CardDescription>Criar e gerir cartões presente digitais</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Criar Gift Card</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Gift Card</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Valor pré-definido</Label>
                  <div className="flex gap-2 mt-2">
                    {PRESET_VALUES.map((v) => (
                      <Button
                        key={v}
                        variant="outline"
                        onClick={() => handleCreate(v)}
                        disabled={createGiftCard.isPending}
                      >
                        €{v}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ou valor personalizado (€)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Ex: 75"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                    />
                    <Button
                      onClick={() => handleCreate(Number(customValue))}
                      disabled={!customValue || Number(customValue) <= 0 || createGiftCard.isPending}
                    >
                      Criar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Destinatário (opcional)</Label>
                  <Input placeholder="Nome" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                  <Input placeholder="Email" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem (opcional)</Label>
                  <Input placeholder="Mensagem pessoal" value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : giftCards.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum Gift Card criado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Valor Original</TableHead>
                <TableHead>Saldo Atual</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCards.map((gc) => (
                <TableRow key={gc.id}>
                  <TableCell>
                    <button onClick={() => copyCode(gc.code)} className="flex items-center gap-1 font-mono text-sm hover:text-primary">
                      {gc.code} <Copy className="h-3 w-3" />
                    </button>
                  </TableCell>
                  <TableCell>€{gc.initial_balance.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">€{gc.current_balance.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{gc.recipient_name || gc.recipient_email || "—"}</TableCell>
                  <TableCell>{statusBadge(gc.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(gc.created_at).toLocaleDateString("pt-PT")}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus.mutate({ id: gc.id, currentStatus: gc.status })}
                      disabled={gc.status === "depleted"}
                    >
                      {gc.status === "active" ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

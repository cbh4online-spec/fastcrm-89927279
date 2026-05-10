import { useState } from "react";
import { useWhatsAppOptouts } from "@/hooks/useWhatsAppCampaigns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function WhatsAppOptoutsManager() {
  const { optouts, isLoading, add, remove } = useWhatsAppOptouts();
  const [phone, setPhone] = useState("");

  const submit = async () => {
    if (!phone.trim()) return;
    await add.mutateAsync(phone.trim());
    setPhone("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5" /> Lista de opt-outs
        </CardTitle>
        <CardDescription>
          Números nesta lista são automaticamente excluídos de todas as campanhas. Inscrições automáticas via palavras
          STOP, SAIR, CANCELAR, PARAR, UNSUBSCRIBE em mensagens recebidas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="351912345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button onClick={submit} disabled={add.isPending || !phone.trim()}>
            Adicionar
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
        {!isLoading && optouts.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum opt-out registado.</p>
        )}

        <div className="divide-y rounded-md border">
          {optouts.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between p-3">
              <div className="space-y-1">
                <div className="font-mono text-sm">{o.phone}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">{o.source || "manual"}</Badge>
                  {o.reason && <span className="line-clamp-1">{o.reason}</span>}
                  <span>•</span>
                  <span>{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(o.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

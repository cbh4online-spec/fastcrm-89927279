import { Coins, ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export function CreditLedgerPanel() {
  const { ledger, ledgerLoading, balance } = useCreditWallet();

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            Histórico de Créditos
          </span>
          <Badge variant="outline" className="text-sm font-bold">
            {balance} disponíveis
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {ledgerLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">A carregar...</div>
          ) : ledger.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem movimentos registados.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {ledger.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-6 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    entry.direction === "debit"
                      ? "bg-destructive/10"
                      : "bg-green-500/10"
                  }`}>
                    {entry.direction === "debit" ? (
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.action_key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: pt })}
                    </p>
                  </div>
                  <Badge
                    variant={entry.direction === "debit" ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {entry.direction === "debit" ? "-" : "+"}{entry.credits_amount}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

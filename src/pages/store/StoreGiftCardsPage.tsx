import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, ArrowLeft, CheckCircle2, Search, Loader2 } from "lucide-react";
import { validateGiftCard } from "@/hooks/useStoreGiftCards";
import { toast } from "sonner";

const PRESET_VALUES = [10, 25, 50, 100];

export default function StoreGiftCardsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";

  // Balance check
  const [checkCode, setCheckCode] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const handleCheckBalance = async () => {
    if (!checkCode.trim()) return;
    setCheckLoading(true);
    setBalance(null);
    const gc = await validateGiftCard(checkCode, wsSlug);
    setCheckLoading(false);
    if (gc) {
      setBalance(gc.current_balance);
    } else {
      toast.error("Gift Card não encontrado ou inválido");
    }
  };

  return (
    <>
      <Helmet>
        <title>Cartões Presente | Loja</title>
        <meta name="description" content="Compre cartões presente digitais para oferecer a quem gosta" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link to={`/store/${wsSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Voltar à Loja
          </Link>

          <div className="text-center mb-10">
            <Gift className="h-12 w-12 mx-auto text-primary mb-3" />
            <h1 className="text-3xl font-bold mb-2">Cartões Presente</h1>
            <p className="text-muted-foreground">Ofereça um cartão presente digital a alguém especial</p>
          </div>

          {/* Preset values - informational */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {PRESET_VALUES.map((v) => (
              <Card key={v} className="text-center hover:border-primary transition-colors cursor-default">
                <CardContent className="pt-6 pb-4">
                  <Gift className="h-8 w-8 mx-auto mb-2 text-primary/60" />
                  <p className="text-2xl font-bold text-primary">€{v}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cartão Presente</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mb-12">
            Para adquirir um cartão presente, contacte-nos diretamente.
          </p>

          {/* Balance check section */}
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Verificar Saldo</h2>
              </div>
              <div className="space-y-2">
                <Label>Código do Gift Card</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="GC-XXXX-XXXX-XXXX"
                    value={checkCode}
                    onChange={(e) => { setCheckCode(e.target.value.toUpperCase()); setBalance(null); }}
                    className="font-mono"
                  />
                  <Button onClick={handleCheckBalance} disabled={checkLoading || !checkCode.trim()}>
                    {checkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
                  </Button>
                </div>
              </div>
              {balance !== null && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Saldo disponível</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">€{balance.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

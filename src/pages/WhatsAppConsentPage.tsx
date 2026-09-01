import { useMemo, useState, useRef } from "react";
import Papa from "papaparse";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppOptouts } from "@/hooks/useWhatsAppCampaigns";
import { WhatsAppOptoutsManager } from "@/components/whatsapp-pro/WhatsAppOptoutsManager";
import { WhatsAppConsentsManager } from "@/components/whatsapp-pro/WhatsAppConsentsManager";
import { WhatsAppConsentImportCard } from "@/components/whatsapp-pro/WhatsAppConsentImportCard";
import { WhatsAppConsentLinksCard } from "@/components/whatsapp-pro/WhatsAppConsentLinksCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Ban, Upload, Zap, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toE164 } from "@/utils/phone";

interface OptoutRow {
  id: string;
  phone: string;
  source: string;
  reason: string | null;
  created_at: string;
}

export default function WhatsAppConsentPage() {
  const { currentWorkspace } = useWorkspace();
  const { optouts } = useWhatsAppOptouts();
  const list = optouts as OptoutRow[];
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const kpis = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last24 = list.filter((o) => now - new Date(o.created_at).getTime() < day).length;
    const last7d = list.filter((o) => now - new Date(o.created_at).getTime() < 7 * day).length;
    const auto = list.filter((o) => o.source === "auto_keyword").length;
    const manual = list.filter((o) => o.source === "manual").length;
    const imported = list.filter((o) => o.source === "csv_import").length;
    return { total: list.length, last24, last7d, auto, manual, imported };
  }, [list]);

  // Recent inbound text count (24h) for opt-out rate
  const { data: inbound24h } = useQuery({
    queryKey: ["wa-inbound-24h", currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async () => {
      if (!currentWorkspace) return 0;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .eq("direction", "inbound")
        .eq("message_type", "text")
        .gte("sent_at", since);
      return count ?? 0;
    },
  });

  const optOutRate24h = inbound24h && inbound24h > 0
    ? ((kpis.last24 / inbound24h) * 100).toFixed(2)
    : "0.00";

  async function runDetectorNow() {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-pro-optout-detect", {});
      if (error) throw error;
      if (data?.ok) {
        toast.success(`Scan ok — ${data.optouts ?? 0} opt-outs, ${data.optins ?? 0} opt-ins`);
      } else {
        toast.error(data?.error || "Falha no scan");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  function handleCsvImport(file: File) {
    if (!currentWorkspace) return;
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const phones = new Set<string>();
          for (const r of rows) {
            const raw = r.phone || r.telefone || r.numero || r.número || Object.values(r)[0] || "";
            const e164 = toE164(String(raw).trim(), "PT");
            const cleaned = e164 ? e164.replace(/\D/g, "") : String(raw).replace(/\D/g, "");
            if (cleaned.length >= 9) phones.add(cleaned);
          }
          if (phones.size === 0) {
            toast.error("Nenhum número válido encontrado no CSV");
            return;
          }
          // Insert in chunks of 200, ignore duplicates
          const arr = Array.from(phones);
          let inserted = 0;
          for (let i = 0; i < arr.length; i += 200) {
            const chunk = arr.slice(i, i + 200).map((p) => ({
              workspace_id: currentWorkspace.id,
              phone: p,
              source: "csv_import",
              reason: `Importado de ${file.name}`,
            }));
            const { error, count } = await supabase
              .from("whatsapp_optouts" as never)
              .upsert(chunk as never, { onConflict: "workspace_id,phone", ignoreDuplicates: true, count: "exact" } as never);
            if (error) {
              console.error("import error", error);
            } else {
              inserted += count ?? 0;
            }
          }
          toast.success(`Importação concluída: ${inserted} novos opt-outs (${arr.length} no ficheiro)`);
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
      error: (err) => {
        toast.error("Erro a ler CSV: " + err.message);
        setImporting(false);
      },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" /> Consentimento WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Gestão de opt-in / opt-out conforme RGPD. Detecção automática de palavras de cancelamento
          (STOP, SAIR, CANCELAR, PARAR, UNSUBSCRIBE, REMOVER) e re-subscrição (SUBSCREVER, START).
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total opt-outs" value={kpis.total} icon={<Ban className="h-4 w-4" />} />
        <KpiCard label="Últimas 24h" value={kpis.last24} hint={`${optOutRate24h}% do tráfego`} />
        <KpiCard label="Últimos 7 dias" value={kpis.last7d} />
        <KpiCard label="Detecção automática" value={kpis.auto} icon={<Zap className="h-4 w-4" />} />
        <KpiCard label="Importados (CSV)" value={kpis.imported} icon={<Upload className="h-4 w-4" />} />
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Detector ativo a cada minuto</AlertTitle>
        <AlertDescription>
          Sempre que um contacto responde com palavras-chave de opt-out, é adicionado a esta lista e
          recebe automaticamente uma confirmação. Campanhas ignoram automaticamente estes números.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="consents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consents">Consentimentos</TabsTrigger>
          <TabsTrigger value="links">Links de opt-in</TabsTrigger>
          <TabsTrigger value="import-consents">Importar consentimentos</TabsTrigger>
          <TabsTrigger value="manage">Opt-outs</TabsTrigger>
          <TabsTrigger value="import">Importar CSV</TabsTrigger>
          <TabsTrigger value="tools">Ferramentas</TabsTrigger>
        </TabsList>

        <TabsContent value="consents">
          <WhatsAppConsentsManager />
        </TabsContent>

        <TabsContent value="links">
          <WhatsAppConsentLinksCard />
        </TabsContent>

        <TabsContent value="import-consents">
          <WhatsAppConsentImportCard />
        </TabsContent>

        <TabsContent value="manage">
          <WhatsAppOptoutsManager />
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Importar opt-outs de CSV</CardTitle>
              <CardDescription>
                CSV com cabeçalho contendo a coluna <code>phone</code> (ou <code>telefone</code> /{" "}
                <code>numero</code>). Os números são normalizados para E.164 (PT por defeito) e
                duplicados são ignorados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCsvImport(f);
                  }}
                />
                <Button
                  variant="default"
                  onClick={() => fileRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Selecionar CSV
                </Button>
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" /> Apenas opt-outs (lista de bloqueio)
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Exemplo de cabeçalho: <code>phone,reason</code> — apenas <code>phone</code> é obrigatório.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Forçar deteção agora</CardTitle>
              <CardDescription>
                Executa o detector imediatamente sobre as últimas mensagens recebidas (10 min).
                Útil para validar regras após alterações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={runDetectorNow} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Executar scan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, hint, icon }: { label: string; value: number; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Search, ShieldCheck, ShieldOff, Users, Loader2 } from "lucide-react";
import { useWhatsAppConsents } from "@/hooks/useWhatsAppConsents";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toE164 } from "@/utils/phone";
import { WHATSAPP_CONSENT_TEXT, WHATSAPP_CONSENT_VERSION } from "@/lib/whatsapp/consent";
import { toast } from "sonner";

export function WhatsAppConsentsManager() {
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "granted" | "revoked">("all");
  const [source, setSource] = useState<string>("all");
  const [bulkSource, setBulkSource] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkText, setBulkText] = useState(WHATSAPP_CONSENT_TEXT);
  const [evidenceRef, setEvidenceRef] = useState("");
  const [grantedAt, setGrantedAt] = useState("");
  const [evidenceConfirmed, setEvidenceConfirmed] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);

  const { consents, isLoading, revoke, refetch } = useWhatsAppConsents({ search, status, source });
  const rows = useMemo(() => consents, [consents]);

  // Contagens globais do workspace (independentes dos filtros da tabela).
  const { data: counts = { granted: 0, revoked: 0, pending: 0 } } = useQuery({
    queryKey: ["whatsapp-consent-counts", currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async () => {
      const wsId = currentWorkspace!.id;
      const [granted, revoked, leadsWithPhone] = await Promise.all([
        supabase.from("whatsapp_consents").select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId).eq("status", "granted"),
        supabase.from("whatsapp_consents").select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId).eq("status", "revoked"),
        supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId).is("archived_at", null).not("phone", "is", null),
      ]);
      const grantedCount = granted.count ?? 0;
      return {
        granted: grantedCount,
        revoked: revoked.count ?? 0,
        pending: Math.max((leadsWithPhone.count ?? 0) - grantedCount, 0),
      };
    },
  });

  async function applyBulkConsent() {
    if (!currentWorkspace) return;
    if (!bulkSource.trim() && !bulkTag.trim()) {
      toast.error("Indica pelo menos uma origem ou tag para limitar o lote");
      return;
    }
    if (!grantedAt || !bulkText.trim() || !evidenceRef.trim() || !evidenceConfirmed) {
      toast.error("Preenche a data, o texto, a referência da prova e confirma a evidência");
      return;
    }
    setBulkApplying(true);
    try {
      const leads: Array<{ id: string; phone: string | null }> = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        let query = supabase
          .from("leads")
          .select("id, phone")
          .eq("workspace_id", currentWorkspace.id)
          .is("archived_at", null)
          .eq("is_blocked", false)
          .not("phone", "is", null);
        if (bulkSource.trim()) query = query.eq("source", bulkSource.trim());
        if (bulkTag.trim()) query = query.contains("tags", [bulkTag.trim()]);
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error) throw error;
        const page = data ?? [];
        leads.push(...page);
        if (page.length < pageSize) break;
      }

      const unique = new Map<string, string>();
      for (const lead of leads) {
        const normalized = toE164(lead.phone ?? "");
        if (normalized) unique.set(normalized, lead.id);
      }
      if (unique.size === 0) throw new Error("Nenhuma Lead com telefone válido corresponde aos filtros");

      const now = new Date().toISOString();
      const records = Array.from(unique.entries()).map(([phone, leadId]) => ({
        workspace_id: currentWorkspace.id,
        phone,
        lead_id: leadId,
        contact_id: null,
        company_id: null,
        status: "granted",
        consent_category: "marketing",
        consent_text: bulkText.trim(),
        consent_version: WHATSAPP_CONSENT_VERSION,
        source: "manual_import",
        source_reference: evidenceRef.trim(),
        granted_at: new Date(grantedAt).toISOString(),
        revoked_at: null,
        updated_at: now,
      }));
      for (let i = 0; i < records.length; i += 200) {
        const { error } = await supabase.from("whatsapp_consents").upsert(
          records.slice(i, i + 200),
          { onConflict: "workspace_id,phone,consent_category" },
        );
        if (error) throw error;
      }
      toast.success(`${records.length} consentimentos registados com prova e auditoria`);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na atualização em massa");
    } finally {
      setBulkApplying(false);
    }
  }

  function exportCsv() {
    if (rows.length === 0) {
      toast.error("Sem consentimentos para exportar");
      return;
    }
    const csv = Papa.unparse(
      rows.map((r) => ({
        telefone: r.phone,
        estado: r.status,
        categoria: r.consent_category,
        origem: r.source,
        referencia: r.source_reference ?? "",
        versao_texto: r.consent_version,
        texto: r.consent_text,
        concedido_em: r.granted_at ?? "",
        revogado_em: r.revoked_at ?? "",
        ip: r.ip_address ?? "",
        user_agent: r.user_agent ?? "",
      })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `consentimentos-whatsapp-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} registos exportados`);
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Consentimentos WhatsApp
            </CardTitle>
            <CardDescription>
              Prova de consentimento por número: origem, data, versão do texto, IP e user-agent.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2" data-testid="consent-counts">
          <CountCard label="Concedidos" value={counts.granted} />
          <CountCard label="Revogados" value={counts.revoked} />
          <CountCard label="Pendentes (Leads sem consentimento)" value={counts.pending} />
        </div>
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="flex items-center gap-2 font-medium"><Users className="h-4 w-4" /> Registar opt-in em massa</h3>
            <p className="text-xs text-muted-foreground">Seleciona Leads por origem/tag e guarda a prova aplicada ao lote.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1"><Label>Origem da Lead</Label><Input value={bulkSource} onChange={(e) => setBulkSource(e.target.value)} placeholder="ex.: edinforma" /></div>
            <div className="space-y-1"><Label>Tag</Label><Input value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="ex.: pharliss" /></div>
            <div className="space-y-1"><Label>Data do consentimento</Label><Input type="datetime-local" value={grantedAt} onChange={(e) => setGrantedAt(e.target.value)} /></div>
            <div className="space-y-1"><Label>Referência da prova</Label><Input value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} placeholder="Contrato, ficheiro, URL ou lote" /></div>
          </div>
          <div className="space-y-1"><Label>Texto aceite</Label><Textarea rows={3} value={bulkText} onChange={(e) => setBulkText(e.target.value)} /></div>
          <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <Checkbox checked={evidenceConfirmed} onCheckedChange={(v) => setEvidenceConfirmed(v === true)} />
            <span>Confirmo que existe prova verificável para todas as Leads abrangidas pelo filtro.</span>
          </label>
          <Button onClick={applyBulkConsent} disabled={bulkApplying || !evidenceConfirmed}>
            {bulkApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Aplicar consentimento ao lote
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Pesquisar telefone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="granted">Concedido</SelectItem>
              <SelectItem value="revoked">Revogado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="form">Formulário</SelectItem>
              <SelectItem value="landing_page">Landing page</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp_inbound">WhatsApp (inbound)</SelectItem>
              <SelectItem value="manual_import">Importação manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não existem consentimentos registados com estes filtros.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Concedido</TableHead>
                  <TableHead>Revogado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "granted" ? "default" : "secondary"}>
                        {r.status === "granted" ? "Concedido" : "Revogado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.source}</TableCell>
                    <TableCell className="text-xs">{r.consent_version}</TableCell>
                    <TableCell className="text-xs">
                      {r.granted_at ? new Date(r.granted_at).toLocaleString("pt-PT") : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.revoked_at ? new Date(r.revoked_at).toLocaleString("pt-PT") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "granted" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={revoke.isPending}>
                              <ShieldOff className="mr-1 h-4 w-4" /> Revogar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revogar consentimento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O número {r.phone} deixa de ser elegível para campanhas WhatsApp. A ação fica registada como prova.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => revoke.mutate(r.id)}>Revogar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

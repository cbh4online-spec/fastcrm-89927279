/**
 * VoiceHub — main page (Fase 1P.3)
 * Tabs: Chamadas, Providers, Números, Tarifas, Conformidade.
 */
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Plus, Plug, Hash,
  Coins, ShieldCheck, Trash2, Pencil, TestTube2, Search, ShieldAlert, Sparkles, FileSearch,
} from "lucide-react";
import {
  useVoiceProviders, useDeleteVoiceProvider, useTestVoiceProvider,
  useVoiceNumbers, useDeleteVoiceNumber,
  useVoiceCallLogs, useVoiceRates, useDeleteVoiceRate, useUpsertVoiceRate,
  useVoiceCompliance, useUpsertVoiceCompliance,
  type VoiceProviderInstance, type VoiceNumber,
} from "@/hooks/useVoiceHub";
import { VoiceProviderDialog } from "@/components/voice/VoiceProviderDialog";
import { VoiceNumberDialog } from "@/components/voice/VoiceNumberDialog";
import { LogCallDialog } from "@/components/voice/LogCallDialog";
import { VoiceCallDetailDialog } from "@/components/voice/VoiceCallDetailDialog";
import { VoiceComplianceKeywordsManager } from "@/components/voice/VoiceComplianceKeywordsManager";
import { CallCenterOperations } from "@/components/voice/CallCenterOperations";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function formatDuration(s: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function directionIcon(d: string) {
  if (d === "inbound") return <PhoneIncoming className="h-4 w-4 text-emerald-600" />;
  if (d === "outbound") return <PhoneOutgoing className="h-4 w-4 text-blue-600" />;
  if (d === "missed") return <PhoneMissed className="h-4 w-4 text-red-600" />;
  return <Phone className="h-4 w-4" />;
}

export default function VoiceHubPage() {
  const [tab, setTab] = useState("calls");
  const [search, setSearch] = useState("");
  const [providerDialog, setProviderDialog] = useState<{ open: boolean; initial?: VoiceProviderInstance | null }>({ open: false });
  const [numberDialog, setNumberDialog] = useState<{ open: boolean; initial?: VoiceNumber | null }>({ open: false });
  const [callDialog, setCallDialog] = useState(false);
  const [detailCallId, setDetailCallId] = useState<string | null>(null);

  const { data: providers = [] } = useVoiceProviders();
  const delProvider = useDeleteVoiceProvider();
  const testProvider = useTestVoiceProvider();
  const { data: numbers = [] } = useVoiceNumbers();
  const delNumber = useDeleteVoiceNumber();
  const { data: calls = [] } = useVoiceCallLogs({ q: search });
  const { data: rates = [] } = useVoiceRates();
  const delRate = useDeleteVoiceRate();
  const upsertRate = useUpsertVoiceRate();
  const { data: compliance } = useVoiceCompliance();
  const upsertCompliance = useUpsertVoiceCompliance();

  // KPIs
  const totalCalls = calls.length;
  const inbound = calls.filter((c) => c.call_direction === "inbound").length;
  const outbound = calls.filter((c) => c.call_direction === "outbound").length;
  const reviewPending = calls.filter((c: any) => c.compliance_review_required).length;
  const avgQuality = (() => {
    const scored = calls.filter((c: any) => typeof c.quality_score === "number");
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((a, c: any) => a + c.quality_score, 0) / scored.length);
  })();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            FastCRM VoiceHub
          </h1>
          <p className="text-sm text-muted-foreground">Comunicação por voz unificada — independente de fornecedor.</p>
        </div>
        <Button onClick={() => setCallDialog(true)}>
          <PhoneOutgoing className="h-4 w-4 mr-2" />Nova chamada
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total chamadas</p><p className="text-2xl font-semibold">{totalCalls}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Entrada</p><p className="text-2xl font-semibold text-emerald-600">{inbound}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Saída</p><p className="text-2xl font-semibold text-blue-600">{outbound}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" />Qualidade média</p><p className="text-2xl font-semibold">{avgQuality != null ? `${avgQuality}/100` : "—"}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3" />Revisão pendente</p><p className={`text-2xl font-semibold ${reviewPending > 0 ? "text-red-600" : ""}`}>{reviewPending}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-7 max-w-4xl">
          <TabsTrigger value="calls"><Phone className="h-4 w-4 mr-2" />Chamadas</TabsTrigger>
          <TabsTrigger value="ops"><Activity className="h-4 w-4 mr-2" />Operations</TabsTrigger>
          <TabsTrigger value="providers"><Plug className="h-4 w-4 mr-2" />Providers</TabsTrigger>
          <TabsTrigger value="numbers"><Hash className="h-4 w-4 mr-2" />Números</TabsTrigger>
          <TabsTrigger value="rates"><Coins className="h-4 w-4 mr-2" />Tarifas</TabsTrigger>
          <TabsTrigger value="compliance"><ShieldCheck className="h-4 w-4 mr-2" />Conformidade</TabsTrigger>
          <TabsTrigger value="keywords"><FileSearch className="h-4 w-4 mr-2" />Keywords</TabsTrigger>
        </TabsList>

        {/* CALLS */}
        <TabsContent value="calls" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Histórico de chamadas</CardTitle>
              <div className="relative w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Para / De</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>IA</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Sem chamadas registadas.</TableCell></TableRow>
                  )}
                  {calls.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailCallId(c.id)}>
                      <TableCell>{directionIcon(c.call_direction)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{c.to_number || c.from_number || "—"}</div>
                        {c.subject && <div className="text-xs text-muted-foreground">{c.subject}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell>{c.outcome ?? "—"}</TableCell>
                      <TableCell>{formatDuration(c.duration_seconds)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {c.transcription_status === "completed" && <Badge variant="secondary" className="text-xs">T</Badge>}
                          {c.ai_summary && <Sparkles className="h-3 w-3 text-primary" />}
                          {c.quality_score != null && <span className="text-xs tabular-nums">{c.quality_score}</span>}
                          {c.compliance_review_required && <ShieldAlert className="h-3 w-3 text-red-600" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.created_at ? format(new Date(c.created_at), "dd/MM HH:mm", { locale: pt }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPERATIONS */}
        <TabsContent value="ops" className="mt-4">
          <CallCenterOperations />
        </TabsContent>

        {/* PROVIDERS */}
        <TabsContent value="providers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Providers VoiceHub</CardTitle>
              <Button onClick={() => setProviderDialog({ open: true })}>
                <Plus className="h-4 w-4 mr-2" />Novo provider
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último teste</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Sem providers configurados.</TableCell></TableRow>
                  )}
                  {providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.display_name || "VoiceHub"}</TableCell>
                      <TableCell><Badge variant="secondary">{p.provider_name}</Badge></TableCell>
                      <TableCell>{p.environment}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.last_test_status ? (
                          <span className={p.last_test_status === "ok" ? "text-emerald-600" : "text-red-600"}>
                            {p.last_test_status}{p.last_tested_at ? ` · ${format(new Date(p.last_tested_at), "dd/MM HH:mm")}` : ""}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => testProvider.mutate(p.id)} title="Testar ligação">
                          <TestTube2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setProviderDialog({ open: true, initial: p })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover provider?")) delProvider.mutate(p.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NUMBERS */}
        <TabsContent value="numbers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Números VoiceHub</CardTitle>
              <Button onClick={() => setNumberDialog({ open: true })}>
                <Plus className="h-4 w-4 mr-2" />Novo número
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Capacidades</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {numbers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Sem números.</TableCell></TableRow>
                  )}
                  {numbers.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="font-medium">{n.number}</div>
                        {n.display_name && <div className="text-xs text-muted-foreground">{n.display_name}</div>}
                        {n.is_primary && <Badge variant="secondary" className="mt-1">Principal</Badge>}
                      </TableCell>
                      <TableCell>{n.country}</TableCell>
                      <TableCell>{n.number_type ?? "—"}</TableCell>
                      <TableCell className="space-x-1">
                        {n.inbound_enabled && <Badge variant="outline" className="text-xs">IN</Badge>}
                        {n.outbound_enabled && <Badge variant="outline" className="text-xs">OUT</Badge>}
                        {n.recording_enabled && <Badge variant="outline" className="text-xs">REC</Badge>}
                      </TableCell>
                      <TableCell><Badge variant={n.status === "active" ? "default" : "outline"}>{n.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => setNumberDialog({ open: true, initial: n })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover número?")) delNumber.mutate(n.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RATES */}
        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tarifas por país</CardTitle>
              <Button onClick={() => upsertRate.mutate({ provider_name: providers[0]?.provider_name ?? "mock", country: "PT", destination_type: "mobile", direction: "outbound", cost_per_minute: 0, billing_increment_seconds: 60, currency: "EUR", active: true })}>
                <Plus className="h-4 w-4 mr-2" />Nova tarifa
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Sentido</TableHead>
                    <TableHead>€/min</TableHead>
                    <TableHead>Conexão</TableHead>
                    <TableHead>Inc. (s)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Sem tarifas. Adicione manualmente conforme contrato real.</TableCell></TableRow>
                  )}
                  {rates.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="secondary">{r.provider_name}</Badge></TableCell>
                      <TableCell>{r.country}</TableCell>
                      <TableCell>{r.destination_type}</TableCell>
                      <TableCell>{r.direction}</TableCell>
                      <TableCell>{r.cost_per_minute?.toFixed(4) ?? "—"} {r.currency}</TableCell>
                      <TableCell>{r.connection_fee?.toFixed(4) ?? "—"}</TableCell>
                      <TableCell>{r.billing_increment_seconds}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover tarifa?")) delRate.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPLIANCE */}
        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Conformidade & Gravação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Gravar chamadas por defeito</Label>
                  <p className="text-xs text-muted-foreground">Activa a gravação automática.</p>
                </div>
                <Switch
                  checked={compliance?.recording_default ?? false}
                  onCheckedChange={(v) => upsertCompliance.mutate({ recording_default: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir consentimento</Label>
                  <p className="text-xs text-muted-foreground">Reproduz mensagem antes da gravação.</p>
                </div>
                <Switch
                  checked={compliance?.recording_consent_required ?? true}
                  onCheckedChange={(v) => upsertCompliance.mutate({ recording_consent_required: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto de consentimento</Label>
                <Input
                  defaultValue={compliance?.recording_consent_text ?? ""}
                  onBlur={(e) => upsertCompliance.mutate({ recording_consent_text: e.target.value })}
                  placeholder="Esta chamada poderá ser gravada para fins de qualidade."
                />
              </div>
              <div className="space-y-2">
                <Label>Retenção de gravações (dias)</Label>
                <Input
                  type="number"
                  defaultValue={compliance?.retention_days ?? 90}
                  onBlur={(e) => upsertCompliance.mutate({ retention_days: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Permitir chamadas fora do horário</Label>
                <Switch
                  checked={compliance?.allow_outbound_after_hours ?? false}
                  onCheckedChange={(v) => upsertCompliance.mutate({ allow_outbound_after_hours: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          <VoiceComplianceKeywordsManager />
        </TabsContent>
      </Tabs>


      <VoiceProviderDialog
        open={providerDialog.open}
        onOpenChange={(o) => setProviderDialog({ open: o, initial: o ? providerDialog.initial : null })}
        initial={providerDialog.initial}
      />
      <VoiceNumberDialog
        open={numberDialog.open}
        onOpenChange={(o) => setNumberDialog({ open: o, initial: o ? numberDialog.initial : null })}
        initial={numberDialog.initial}
      />
      <LogCallDialog open={callDialog} onOpenChange={setCallDialog} />
      <VoiceCallDetailDialog
        callId={detailCallId}
        open={!!detailCallId}
        onOpenChange={(o) => !o && setDetailCallId(null)}
      />

    </div>
  );
}

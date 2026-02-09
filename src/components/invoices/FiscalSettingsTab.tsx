import { useState } from "react";
import {
  useDocumentSeries,
  useUpsertDocumentSeries,
  useVatRules,
  useUpsertVatRule,
  useDeleteVatRule,
  useSeedDefaultVatRules,
  DOCUMENT_TYPES,
  CLIENT_TYPES,
  VAT_RATE_TYPES,
  type DocumentSeries,
  type VatRule,
} from "@/hooks/useFiscalModule";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText,
  Plus,
  Loader2,
  Hash,
  Percent,
  Trash2,
  Sparkles,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function FiscalSettingsTab() {
  return (
    <div className="space-y-6">
      <DocumentSeriesManager />
      <Separator />
      <VatRulesManager />
    </div>
  );
}

// ============= Document Series =============

function DocumentSeriesManager() {
  const { data: series = [], isLoading } = useDocumentSeries();
  const upsertSeries = useUpsertDocumentSeries();
  const [createOpen, setCreateOpen] = useState(false);
  const [newDocType, setNewDocType] = useState("invoice");
  const [newPrefix, setNewPrefix] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleCreate = () => {
    upsertSeries.mutate(
      {
        document_type: newDocType,
        series_prefix: newPrefix || DOCUMENT_TYPES[newDocType]?.prefix || "DOC",
        description: newDesc || null,
        is_default: series.filter(s => s.document_type === newDocType).length === 0,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewPrefix("");
          setNewDesc("");
        },
      }
    );
  };

  const handleToggleDefault = (s: DocumentSeries) => {
    upsertSeries.mutate({
      ...s,
      is_default: !s.is_default,
    });
  };

  const handleToggleActive = (s: DocumentSeries) => {
    upsertSeries.mutate({
      ...s,
      is_active: !s.is_active,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Séries de Documentos
        </CardTitle>
        <CardDescription>
          Séries de numeração certificadas por tipo de documento. Cada tipo deve ter pelo menos uma série ativa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Último Nº</TableHead>
                  <TableHead>Predefinida</TableHead>
                  <TableHead>Ativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma série criada. As séries são criadas automaticamente ao emitir documentos.
                    </TableCell>
                  </TableRow>
                ) : (
                  series.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Badge variant="outline">{DOCUMENT_TYPES[s.document_type]?.label || s.document_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{s.series_prefix}</TableCell>
                      <TableCell>{s.series_year}</TableCell>
                      <TableCell>{s.current_number}</TableCell>
                      <TableCell>
                        <Switch checked={s.is_default} onCheckedChange={() => handleToggleDefault(s)} />
                      </TableCell>
                      <TableCell>
                        <Switch checked={s.is_active} onCheckedChange={() => handleToggleActive(s)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 mt-4">
                  <Plus className="h-3.5 w-3.5" /> Nova Série
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Série de Documentos</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select value={newDocType} onValueChange={(v) => { setNewDocType(v); setNewPrefix(DOCUMENT_TYPES[v]?.prefix || ""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOCUMENT_TYPES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prefixo</Label>
                    <Input
                      value={newPrefix}
                      onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                      placeholder={DOCUMENT_TYPES[newDocType]?.prefix}
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Exemplo: {newPrefix || DOCUMENT_TYPES[newDocType]?.prefix} {new Date().getFullYear()}/0001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Input
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="e.g. Série principal"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={upsertSeries.isPending}>
                    {upsertSeries.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============= VAT Rules =============

function VatRulesManager() {
  const { data: rules = [], isLoading } = useVatRules();
  const upsertRule = useUpsertVatRule();
  const deleteRule = useDeleteVatRule();
  const seedRules = useSeedDefaultVatRules();
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    country_code: "PT",
    client_type: "b2c",
    rate: 23,
    rate_type: "standard",
    exemption_reason: "",
    priority: 0,
  });

  const handleCreate = () => {
    upsertRule.mutate(
      {
        name: form.name,
        country_code: form.country_code,
        client_type: form.client_type,
        rate: form.rate,
        rate_type: form.rate_type,
        exemption_reason: form.exemption_reason || null,
        priority: form.priority,
        is_active: true,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setForm({ name: "", country_code: "PT", client_type: "b2c", rate: 23, rate_type: "standard", exemption_reason: "", priority: 0 });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Regras de IVA
        </CardTitle>
        <CardDescription>
          Regras contextuais de IVA por tipo de cliente. As regras com maior prioridade são aplicadas primeiro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            {rules.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <Shield className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Sem regras de IVA configuradas.</p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => seedRules.mutate()}
                  disabled={seedRules.isPending}
                >
                  {seedRules.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Carregar Regras PT Padrão
                </Button>
              </div>
            )}

            {rules.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo Cliente</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Isenção</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} className={cn(!rule.is_active && "opacity-50")}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{CLIENT_TYPES[rule.client_type] || rule.client_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{rule.rate}%</TableCell>
                      <TableCell>{VAT_RATE_TYPES[rule.rate_type] || rule.rate_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {rule.exemption_reason || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule.mutate(rule.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 mt-4">
                  <Plus className="h-3.5 w-3.5" /> Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Regra de IVA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Normal B2C PT" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Cliente</Label>
                      <Select value={form.client_type} onValueChange={(v) => setForm(p => ({ ...p, client_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CLIENT_TYPES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Taxa</Label>
                      <Select value={form.rate_type} onValueChange={(v) => setForm(p => ({ ...p, rate_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(VAT_RATE_TYPES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Taxa (%)</Label>
                      <Input type="number" min={0} max={100} step={0.5} value={form.rate} onChange={(e) => setForm(p => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>País</Label>
                      <Input value={form.country_code} onChange={(e) => setForm(p => ({ ...p, country_code: e.target.value.toUpperCase() }))} maxLength={5} placeholder="PT" />
                    </div>
                  </div>
                  {(form.rate_type === "exempt" || form.rate_type === "reverse_charge") && (
                    <div className="space-y-2">
                      <Label>Motivo de Isenção</Label>
                      <Input value={form.exemption_reason} onChange={(e) => setForm(p => ({ ...p, exemption_reason: e.target.value }))} placeholder="Art. 14º CIVA" />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={!form.name || upsertRule.isPending}>
                    {upsertRule.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Criar Regra
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

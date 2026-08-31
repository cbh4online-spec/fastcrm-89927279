import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Download, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { useWhatsAppConsents } from "@/hooks/useWhatsAppConsents";
import { toast } from "sonner";

export function WhatsAppConsentsManager() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "granted" | "revoked">("all");
  const [source, setSource] = useState<string>("all");

  const { list, revoke } = useWhatsAppConsents({ search, status, source });
  const rows = useMemo(() => list.data ?? [], [list.data]);

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

        {list.isLoading ? (
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
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revoke.isPending}
                          onClick={() => revoke.mutate({ phone: r.phone })}
                        >
                          <ShieldOff className="mr-1 h-4 w-4" /> Revogar
                        </Button>
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

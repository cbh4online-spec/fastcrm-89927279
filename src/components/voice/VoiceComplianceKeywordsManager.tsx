/**
 * VoiceComplianceKeywordsManager — Fase 1Q.3
 * Gestão de palavras-chave de conformidade (proibidas, exigidas, consentimento).
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import {
  useComplianceKeywords, useUpsertComplianceKeyword, useDeleteComplianceKeyword,
} from "@/hooks/useVoiceHub";

export function VoiceComplianceKeywordsManager() {
  const { data: list = [] } = useComplianceKeywords();
  const upsert = useUpsertComplianceKeyword();
  const del = useDeleteComplianceKeyword();
  const [phrase, setPhrase] = useState("");
  const [kind, setKind] = useState<"forbidden" | "required" | "consent">("forbidden");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("warning");

  const submit = () => {
    if (!phrase.trim()) return;
    upsert.mutate({ phrase: phrase.trim(), kind, severity, active: true });
    setPhrase("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Palavras-chave de conformidade</CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina frases que devem (ou não devem) ser ditas durante a chamada. A IA irá detetar e sinalizar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs text-muted-foreground">Frase</label>
            <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="ex: garantia vitalícia" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="forbidden">Proibida</SelectItem>
                <SelectItem value="required">Exigida</SelectItem>
                <SelectItem value="consent">Consentimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Severidade</label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} disabled={upsert.isPending || !phrase.trim()}>
            <Plus className="h-4 w-4 mr-2" />Adicionar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Frase</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Severidade</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                Sem palavras-chave configuradas.
              </TableCell></TableRow>
            )}
            {list.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.phrase}</TableCell>
                <TableCell><Badge variant="outline">{k.kind}</Badge></TableCell>
                <TableCell>
                  <Badge variant={k.severity === "critical" ? "destructive" : k.severity === "warning" ? "default" : "secondary"}>
                    {k.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={k.active}
                    onCheckedChange={(v) => upsert.mutate({ id: k.id, kind: k.kind, phrase: k.phrase, active: v })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) del.mutate(k.id); }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

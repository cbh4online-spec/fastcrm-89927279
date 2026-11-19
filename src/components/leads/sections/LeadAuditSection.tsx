import { useLeadAuditLog } from "@/hooks/useLeadAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface LeadAuditSectionProps {
  leadId: string;
}

export function LeadAuditSection({ leadId }: LeadAuditSectionProps) {
  const { data: entries, isLoading } = useLeadAuditLog(leadId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!entries?.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <History className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Sem alterações registadas</p>
        </CardContent>
      </Card>
    );
  }

  const FIELD_LABELS: Record<string, string> = {
    name: 'Nome', email: 'Email', phone: 'Telefone', status: 'Estado', tags: 'Etiquetas',
    assigned_to: 'Responsável', source: 'Fonte', notes: 'Notas', company_name: 'Empresa',
    tax_id: 'NIF', address: 'Morada', city: 'Localidade', postal_code: 'Código postal',
    ai_temperature: 'Temperatura', estimated_value: 'Valor estimado', website: 'Website',
    lead_type: 'Tipo', icp_score_status: 'Estado do encaixe ICP', last_contact_at: 'Último contacto', archived_at: 'Arquivado em', deleted_at: 'Eliminado em',
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '—';
    if (Array.isArray(val)) return val.join(', ') || '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Registo de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Campo</TableHead>
                <TableHead className="text-xs">Antes</TableHead>
                <TableHead className="text-xs">Depois</TableHead>
                <TableHead className="text-xs">Utilizador</TableHead>
                <TableHead className="text-xs">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {FIELD_LABELS[entry.field_name] ?? entry.field_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {formatValue(entry.old_value)}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {formatValue(entry.new_value)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {entry.user_name ?? <span className="text-muted-foreground">Sistema</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

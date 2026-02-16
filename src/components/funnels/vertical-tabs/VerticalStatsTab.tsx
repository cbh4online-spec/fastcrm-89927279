import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVerticalTemplateStats } from "@/hooks/useVerticalFunnelManager";
import { BarChart3 } from "lucide-react";

interface Props {
  templateSlug: string;
}

export function VerticalStatsTab({ templateSlug }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: stats = [], isLoading } = useVerticalTemplateStats(templateSlug, dateFrom || undefined, dateTo || undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Secção</TableHead>
              <TableHead>Page Views (All)</TableHead>
              <TableHead>Page Views (Unique)</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">A carregar...</TableCell>
              </TableRow>
            ) : stats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <BarChart3 className="h-10 w-10" />
                    <span className="font-medium">Sem dados de analytics</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              stats.map((s) => (
                <TableRow key={s.section}>
                  <TableCell className="font-medium capitalize">{s.section}</TableCell>
                  <TableCell>{s.views}</TableCell>
                  <TableCell>{s.uniqueViews}</TableCell>
                  <TableCell>{s.submissions}</TableCell>
                  <TableCell>{s.rate.toFixed(1)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

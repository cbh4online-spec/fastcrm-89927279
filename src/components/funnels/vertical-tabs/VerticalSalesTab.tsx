import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useVerticalTemplateSales } from "@/hooks/useVerticalFunnelManager";
import { Download, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

interface Props {
  templateId: string;
}

export function VerticalSalesTab({ templateId }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: sales = [], isLoading } = useVerticalTemplateSales(templateId, dateFrom || undefined, dateTo || undefined);

  const exportCSV = () => {
    const header = "Customer,Email,Product,Transaction ID,Amount,Date\n";
    const rows = sales.map((s) =>
      `"${s.customer_name}","${s.customer_email || ""}","${s.product_name || ""}","${s.transaction_id || ""}",${s.amount},"${s.purchase_date}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
        {sales.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A carregar...</TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <ShoppingCart className="h-10 w-10" />
                    <span className="font-medium">Sem vendas registadas</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.customer_name}</TableCell>
                  <TableCell>{s.customer_email || "-"}</TableCell>
                  <TableCell>{s.product_name || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{s.transaction_id || "-"}</TableCell>
                  <TableCell>€{Number(s.amount).toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(s.purchase_date), "dd/MM/yyyy")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

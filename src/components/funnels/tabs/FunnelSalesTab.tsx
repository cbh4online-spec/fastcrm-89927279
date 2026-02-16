import { useState } from "react";
import { format, subDays } from "date-fns";
import { CalendarIcon, Download, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useFunnelSales } from "@/hooks/useFunnels";
import { pt } from "date-fns/locale";

interface FunnelSalesTabProps {
  funnelId: string;
}

export function FunnelSalesTab({ funnelId }: FunnelSalesTabProps) {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: sales = [] } = useFunnelSales(funnelId, dateFrom, dateTo);

  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
          <ul className="list-disc list-inside space-y-1">
            <li>Todas as vendas deste funil são registadas aqui automaticamente.</li>
            <li>Esta página mostra dados de vendas associados ao funil.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-end gap-3">
        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border-0 p-0 h-auto w-auto text-sm"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border-0 p-0 h-auto w-auto text-sm"
          />
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <Button variant="outline" size="icon">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Product name</TableHead>
              <TableHead>Transaction Id</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Purchase Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <PackageX className="h-10 w-10" />
                    <span>No Data</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.customer_name || "-"}</TableCell>
                  <TableCell>{sale.customer_email || "-"}</TableCell>
                  <TableCell>{sale.product_name || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{sale.transaction_id || "-"}</TableCell>
                  <TableCell>€{Number(sale.amount).toFixed(2)}</TableCell>
                  <TableCell>{sale.funnel_steps?.name || "-"}</TableCell>
                  <TableCell>{format(new Date(sale.purchase_date), "dd MMM yyyy, HH:mm", { locale: pt })}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

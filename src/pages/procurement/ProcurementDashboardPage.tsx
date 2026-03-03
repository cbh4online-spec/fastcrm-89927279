import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ProcurementKPIs } from "@/components/procurement/ProcurementKPIs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePurchaseOrders, useSupplierInvoices } from "@/hooks/useProcurement";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ProcurementDashboardPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: orders = [] } = usePurchaseOrders(currentWorkspace?.id);
  const { data: invoices = [] } = useSupplierInvoices(currentWorkspace?.id);

  // Group orders by supplier for bar chart
  const bySupplier = (orders as any[]).reduce((acc: Record<string, number>, o: any) => {
    const sName = o.supplier?.name || "N/A";
    acc[sName] = (acc[sName] || 0) + (Number(o.total_amount) || 0);
    return acc;
  }, {});
  const supplierData = Object.entries(bySupplier).map(([n, v]) => ({ name: n, value: v as number })).sort((a, b) => b.value - a.value).slice(0, 5);

  // Group orders by status for pie chart
  const byStatus = (orders as any[]).reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard")}</h1>
        <ProcurementKPIs />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Top Fornecedores</CardTitle></CardHeader>
            <CardContent>
              {supplierData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={supplierData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => `€${v.toFixed(2)}`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-sm">Sem dados</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Encomendas por Estado</CardTitle></CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-sm">Sem dados</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

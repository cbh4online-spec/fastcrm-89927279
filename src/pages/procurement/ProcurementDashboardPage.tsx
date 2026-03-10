import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ProcurementKPIs } from "@/components/procurement/ProcurementKPIs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePurchaseOrders, useSupplierInvoices } from "@/hooks/useProcurement";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, FileText, ShoppingCart, ArrowRight } from "lucide-react";

const STATUS_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ProcurementDashboardPage() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { data: orders = [] } = usePurchaseOrders(currentWorkspace?.id);
  const { data: invoices = [] } = useSupplierInvoices(currentWorkspace?.id);

  const hasData = (orders as any[]).length > 0 || (invoices as any[]).length > 0;

  const bySupplier = (orders as any[]).reduce((acc: Record<string, number>, o: any) => {
    const sName = o.supplier?.name || "N/A";
    acc[sName] = (acc[sName] || 0) + (Number(o.total_amount) || 0);
    return acc;
  }, {});
  const supplierData = Object.entries(bySupplier).map(([n, v]) => ({ name: n, value: v as number })).sort((a, b) => b.value - a.value).slice(0, 5);

  const byStatus = (orders as any[]).reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <PageHeader title={t("dashboard")} />
        <ProcurementKPIs />
        
        {!hasData ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">{t("dashboardEmptyTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("dashboardEmptyDesc")}</p>
                <div className="flex flex-col items-start gap-3 max-w-sm mx-auto text-left mt-6">
                  <div className="flex items-center gap-3 w-full">
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{t("getStartedStep1")}</span>
                    <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/procurement/suppliers")}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{t("getStartedStep2")}</span>
                    <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/procurement/requests")}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <ShoppingCart className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{t("getStartedStep3")}</span>
                    <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/procurement/orders")}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">{t("topSuppliers")}</CardTitle></CardHeader>
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
                ) : <p className="text-muted-foreground text-sm">{t("noData")}</p>}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">{t("ordersByStatus")}</CardTitle></CardHeader>
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
                ) : <p className="text-muted-foreground text-sm">{t("noData")}</p>}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
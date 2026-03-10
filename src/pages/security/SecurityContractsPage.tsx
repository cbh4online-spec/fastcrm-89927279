import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityContracts } from "@/hooks/security/useSecurityContracts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const contractStatusColor: Record<string, string> = {
  draft: "secondary",
  active: "default",
  expired: "destructive",
  suspended: "outline",
  terminated: "secondary",
};

export default function SecurityContractsPage() {
  const { t } = useTranslation("security");
  const { contracts, isLoading } = useSecurityContracts();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = contracts.filter((c: any) => {
    const sys = c.security_systems as any;
    const site = sys?.security_installation_sites as any;
    return [c.contract_type, site?.site_name, c.contract_status]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("contracts")}</h1>
          </div>
          <Button onClick={() => navigate("/dashboard/security/contracts/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("addNew")}
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("noContracts")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((c: any) => {
              const sys = c.security_systems as any;
              const site = sys?.security_installation_sites as any;
              return (
                <Card
                  key={c.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/dashboard/security/contracts/${c.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{site?.site_name || "Contrato"}</p>
                      <p className="text-sm text-muted-foreground">
                        {t(`contractType${c.contract_type?.charAt(0).toUpperCase()}${c.contract_type?.slice(1)}` as any) || c.contract_type}
                        {c.start_date && ` · ${format(new Date(c.start_date), "dd/MM/yyyy")}`}
                        {c.end_date && ` → ${format(new Date(c.end_date), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <Badge variant={(contractStatusColor[c.contract_status] || "secondary") as any}>
                      {t(`contractStatus${c.contract_status?.charAt(0).toUpperCase()}${c.contract_status?.slice(1)}` as any) || c.contract_status}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityClients } from "@/hooks/security/useSecurityClients";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Search, Building2, User, Home } from "lucide-react";
import { useState } from "react";
import { SecurityClientDialog } from "@/components/security/SecurityClientDialog";

const clientTypeIcon: Record<string, any> = {
  particular: User,
  empresa: Building2,
  condominio: Home,
};

const statusColor: Record<string, string> = {
  active: "default",
  inactive: "secondary",
  prospect: "outline",
};

export default function SecurityClientsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filters: any = {};
  if (typeFilter !== "all") filters.client_type = typeFilter;

  const { clients, isLoading } = useSecurityClients(filters);

  const filtered = clients.filter((c: any) =>
    [c.name, c.nif, c.trade_name, c.primary_email, c.primary_phone, c.fiscal_locality]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("clients")}</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newClient")}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="particular">{t("clientTypeParticular")}</SelectItem>
              <SelectItem value="empresa">{t("clientTypeCompany")}</SelectItem>
              <SelectItem value="condominio">{t("clientTypeCondominium")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("noClients")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("noClientsDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client: any) => {
              const TypeIcon = clientTypeIcon[client.client_type] || User;
              return (
                <Card
                  key={client.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/dashboard/security/clients/${client.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t(`clientType${client.client_type.charAt(0).toUpperCase()}${client.client_type.slice(1)}` as any)}
                          {client.nif && ` · NIF: ${client.nif}`}
                          {client.fiscal_locality && ` · ${client.fiscal_locality}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {client.primary_phone && (
                        <span className="text-xs text-muted-foreground hidden md:inline">{client.primary_phone}</span>
                      )}
                      <Badge variant={(statusColor[client.status] || "secondary") as any}>
                        {t(`clientStatus${client.status.charAt(0).toUpperCase()}${client.status.slice(1)}` as any) || client.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <SecurityClientDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}

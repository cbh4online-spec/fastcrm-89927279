import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecuritySystems } from "@/hooks/security/useSecuritySystems";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Camera, Plus, Search } from "lucide-react";
import { useState } from "react";
import { SecuritySystemDialog } from "@/components/security/SecuritySystemDialog";

const systemTypeBadge: Record<string, string> = {
  cctv: "CCTV",
  intrusion: "Intrusão",
  sadi: "SADI",
  access_control: "Acessos",
  mixed: "Misto",
};

const statusColor: Record<string, string> = {
  draft: "secondary",
  por_validar: "outline",
  active: "default",
  inactive: "secondary",
  under_maintenance: "outline",
  suspended: "destructive",
  archived: "secondary",
};

export default function SecuritySystemsPage() {
  const { t } = useTranslation("security");
  const { systems, isLoading } = useSecuritySystems();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = systems.filter((s: any) =>
    [s.main_brand, s.main_model, (s.security_installation_sites as any)?.site_name]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("systems")}</h1>
          </div>
          <Button onClick={() => navigate("/dashboard/security/systems/new")} className="gap-2">
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
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("noSystems")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((sys: any) => (
              <Card
                key={sys.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/dashboard/security/systems/${sys.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {(sys.security_installation_sites as any)?.site_name || "Local não definido"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[sys.main_brand, sys.main_model].filter(Boolean).join(" ")}
                      {(sys.security_installation_sites as any)?.locality && ` — ${(sys.security_installation_sites as any).locality}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{systemTypeBadge[sys.system_type] || sys.system_type}</Badge>
                    <Badge variant={(statusColor[sys.status] || "secondary") as any}>
                      {t(`systemStatus${sys.status?.charAt(0).toUpperCase()}${sys.status?.slice(1)}` as any) || sys.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityEquipmentCatalog } from "@/hooks/security/useSecurityEquipment";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cpu, Plus, Search } from "lucide-react";
import { useState } from "react";
import { SecurityEquipmentDialog } from "@/components/security/SecurityEquipmentDialog";

export default function SecurityEquipmentPage() {
  const { t } = useTranslation("security");
  const { items, isLoading } = useSecurityEquipmentCatalog();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = items.filter((i: any) =>
    [i.brand, i.model, i.reference, i.category]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("catalog")}</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
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
              <Cpu className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum equipamento no catálogo</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("brand")}</TableHead>
                    <TableHead>{t("model")}</TableHead>
                    <TableHead>{t("reference")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.brand}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="font-mono text-xs">{item.reference || "—"}</TableCell>
                      <TableCell>{item.category || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={item.active !== false ? "default" : "secondary"}>
                          {item.active !== false ? t("active") : t("inactive")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
      <SecurityEquipmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}

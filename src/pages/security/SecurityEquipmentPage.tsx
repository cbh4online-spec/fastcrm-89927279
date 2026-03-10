import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityEquipmentCatalog } from "@/hooks/security/useSecurityEquipment";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cpu, Plus, Search, Package, Camera, HardDrive, Radio, Shield, Cable, Box } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SecurityEquipmentDialog } from "@/components/security/SecurityEquipmentDialog";

const categoryIcons: Record<string, any> = {
  camera: Camera,
  recorder: HardDrive,
  sensor: Radio,
  detector: Radio,
  central: Shield,
  accessory: Box,
  cable: Cable,
  other: Package,
};

const categoryLabels: Record<string, string> = {
  camera: "Câmara",
  recorder: "Gravador",
  sensor: "Sensor",
  detector: "Detetor",
  central: "Central",
  accessory: "Acessório",
  cable: "Cablagem",
  other: "Outro",
};

export default function SecurityEquipmentPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { items, isLoading } = useSecurityEquipmentCatalog();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = items.filter((i: any) => {
    const matchSearch = [i.brand, i.model, i.reference, i.category, i.subtype]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || i.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // KPIs
  const totalItems = items.length;
  const activeItems = items.filter((i: any) => i.active !== false).length;
  const categories = [...new Set(items.map((i: any) => i.category).filter(Boolean))];
  const brands = [...new Set(items.map((i: any) => i.brand).filter(Boolean))];
  const withSpecs = items.filter((i: any) => i.technical_specs_json && Object.keys(i.technical_specs_json).length > 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Catálogo Técnico</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar Equipamento
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{activeItems}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-xs text-muted-foreground">Categorias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{brands.length}</p>
              <p className="text-xs text-muted-foreground">Marcas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{withSpecs}</p>
              <p className="text-xs text-muted-foreground">Com Specs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar marca, modelo, referência..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="camera">Câmaras</SelectItem>
              <SelectItem value="recorder">Gravadores</SelectItem>
              <SelectItem value="sensor">Sensores</SelectItem>
              <SelectItem value="detector">Detetores</SelectItem>
              <SelectItem value="central">Centrais</SelectItem>
              <SelectItem value="accessory">Acessórios</SelectItem>
              <SelectItem value="cable">Cablagem</SelectItem>
              <SelectItem value="other">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Cpu className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum equipamento encontrado</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Adicionar Equipamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Subtipo</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item: any) => {
                    const CatIcon = categoryIcons[item.category] || Package;
                    const specsCount = item.technical_specs_json ? Object.keys(item.technical_specs_json).length : 0;
                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/dashboard/security/equipment/${item.id}`)}
                      >
                        <TableCell>
                          <CatIcon className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium">{item.brand}</TableCell>
                        <TableCell>{item.model}</TableCell>
                        <TableCell className="font-mono text-xs">{item.reference || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[item.category] || item.category || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.subtype || "—"}</TableCell>
                        <TableCell>
                          {specsCount > 0 ? (
                            <Badge variant="secondary" className="text-[10px]">{specsCount} specs</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.active !== false ? "default" : "secondary"}>
                            {item.active !== false ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

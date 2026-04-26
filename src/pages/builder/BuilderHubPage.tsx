import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useBuilderAssets,
  useDeleteBuilderAsset,
} from "@/modules/builder/hooks/useBuilderAssets";
import { BUILDER_ASSET_TYPES, type BuilderAssetType } from "@/modules/builder/types";
import { CreateBuilderAssetDialog } from "@/modules/builder/components/CreateBuilderAssetDialog";

type FilterType = BuilderAssetType | "all";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export default function BuilderHubPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: assets, isLoading, error } = useBuilderAssets(filter);
  const del = useDeleteBuilderAsset();

  const filtered = useMemo(() => {
    if (!assets) return [];
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [assets, search]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Mover "${name}" para o lixo?`)) return;
    try {
      await del.mutateAsync(id);
      toast({ title: "Asset removido", description: `"${name}" foi arquivado.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Falha ao remover", description: msg, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>HTML Builder Studio · FastCRM</title>
        <meta
          name="description"
          content="Cria sites, landings, funis, formulários e newsletters a partir de HTML, templates ou IA."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              HTML Builder Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cria sites, landings, funis, formulários e newsletters num só sítio.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="lg" className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Novo asset
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="flex-1">
            <TabsList className="w-full md:w-auto flex-wrap h-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {BUILDER_ASSET_TYPES.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conteúdo */}
        {error ? (
          <Card className="border-destructive/30">
            <CardContent className="py-8 flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Erro ao carregar assets</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "Tenta novamente."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {search ? "Nenhum resultado encontrado" : "Ainda não há assets"}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {search
                    ? "Tenta outra pesquisa ou limpa o filtro."
                    : "Cria o teu primeiro site, landing, funil, formulário ou newsletter."}
                </p>
              </div>
              {!search && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Criar primeiro asset
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((asset) => {
              const typeMeta = BUILDER_ASSET_TYPES.find((t) => t.value === asset.type);
              return (
                <Card
                  key={asset.id}
                  className="group transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{asset.name}</CardTitle>
                        <CardDescription className="truncate">/{asset.slug}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/dashboard/builder/${asset.id}`}>
                              <ExternalLink className="h-4 w-4 mr-2" /> Abrir editor
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(asset.id, asset.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Mover para lixo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {typeMeta?.label ?? asset.type}
                      </Badge>
                      <Badge
                        variant={STATUS_VARIANT[asset.status] ?? "outline"}
                        className="text-xs capitalize"
                      >
                        {asset.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link
                      to={`/dashboard/builder/${asset.id}`}
                      className="block aspect-[16/10] rounded-md border bg-muted/40 overflow-hidden relative"
                    >
                      {asset.thumbnail_url ? (
                        // eslint-disable-next-line jsx-a11y/alt-text
                        <img
                          src={asset.thumbnail_url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          Sem pré-visualização
                        </div>
                      )}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-3">
                      Atualizado {new Date(asset.updated_at).toLocaleDateString("pt-PT")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateBuilderAssetDialog open={createOpen} onOpenChange={setCreateOpen} />
    </DashboardLayout>
  );
}

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BUILDER_ASSET_TYPES, type BuilderAsset } from "@/modules/builder/types";
import { BuilderPreviewFrame } from "@/modules/builder/components/BuilderPreviewFrame";

export default function BuilderAssetEditorPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["builder-asset", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("builder_assets")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as BuilderAsset | null;
    },
    enabled: !!id,
  });

  return (
    <DashboardLayout>
      <Helmet>
        <title>{data?.name ? `${data.name} · Builder` : "Builder"} · FastCRM</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/builder">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </div>
        ) : error || !data ? (
          <div className="flex items-center gap-3 text-destructive p-6 border border-destructive/30 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Asset não encontrado</p>
              <p className="text-sm text-muted-foreground">
                Pode ter sido removido ou não tens acesso.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {BUILDER_ASSET_TYPES.find((t) => t.value === data.type)?.label ?? data.type}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {data.status}
                </Badge>
                <span className="text-xs text-muted-foreground">/{data.slug}</span>
              </div>
            </div>

            <div className="h-[calc(100vh-280px)] min-h-[500px]">
              <BuilderPreviewFrame html={data.html} />
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Edição inline e versioning estarão disponíveis na Fase 2.
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

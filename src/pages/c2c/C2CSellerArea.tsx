import { useNavigate } from "react-router-dom";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMySellerProfile } from "@/hooks/useC2CSellers";
import { useSellerAnalytics } from "@/hooks/useSellerAnalytics";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Package, ShoppingBag, TrendingUp, Star, Plus, BarChart3,
  Zap, MessageSquare, ExternalLink, Copy, UserCircle, CheckCircle2,
  Clock, XCircle, AlertTriangle, Store
} from "lucide-react";

const statusConfig = {
  approved: { label: "Aprovado", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  suspended: { label: "Suspenso", icon: AlertTriangle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function C2CSellerArea() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const workspaceSlug = currentWorkspace?.slug;

  const { data: seller, isLoading: sellerLoading } = useMySellerProfile(workspaceId);
  const { data: analytics, isLoading: analyticsLoading } = useSellerAnalytics(workspaceId);

  const isLoading = sellerLoading || analyticsLoading;

  const publicProfileUrl = seller && workspaceSlug
    ? `${getPublicBaseUrl()}/c2c/${workspaceSlug}/seller/${seller.user_id}`
    : null;

  const copyLink = () => {
    if (publicProfileUrl) {
      navigator.clipboard.writeText(publicProfileUrl);
      toast.success("Link copiado!");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not a seller — show CTA
  if (!seller) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Começa a vender no Marketplace</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Regista-te como vendedor para publicar anúncios, receber ofertas e gerir as tuas vendas.
            </p>
            <Button onClick={() => navigate(`/c2c/${workspaceSlug}/sell`)} size="lg">
              <Plus className="h-4 w-4 mr-2" /> Registar como Vendedor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[seller.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const quickActions = [
    { label: "Novo Anúncio", icon: Plus, href: "/dashboard/c2c/my-listings", variant: "default" as const },
    { label: "Meus Anúncios", icon: Package, href: "/dashboard/c2c/my-listings", variant: "outline" as const },
    { label: "Mensagens", icon: MessageSquare, href: "/dashboard/c2c/messages", variant: "outline" as const },
    { label: "Analytics", icon: BarChart3, href: "/dashboard/c2c/analytics", variant: "outline" as const },
    { label: "Impulsionar", icon: Zap, href: "/dashboard/c2c/boost", variant: "outline" as const },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <UserCircle className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{seller.display_name}</h1>
                {seller.is_verified && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verificado
                  </Badge>
                )}
                <Badge variant="outline" className={status.className}>
                  <StatusIcon className="h-3 w-3 mr-1" /> {status.label}
                </Badge>
              </div>
              {seller.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{seller.bio}</p>
              )}
              {seller.location && (
                <p className="text-xs text-muted-foreground mt-1">📍 {seller.location}</p>
              )}
            </div>
            {publicProfileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Ver Perfil Público
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {analytics && (
        <KPIGrid columns={4}>
          <KPICard
            title="Anúncios Ativos"
            value={analytics.activeListings}
            icon={<Package className="h-4 w-4" />}
            variant="primary"
          />
          <KPICard
            title="Total Vendas"
            value={analytics.totalSales}
            icon={<ShoppingBag className="h-4 w-4" />}
            variant="success"
          />
          <KPICard
            title="Receita Líquida"
            value={`${analytics.sellerEarnings.toFixed(2)}€`}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="success"
          />
          <KPICard
            title="Rating"
            value={analytics.avgRating > 0 ? `${analytics.avgRating.toFixed(1)} ⭐` : "—"}
            icon={<Star className="h-4 w-4" />}
            variant="warning"
            description={analytics.totalReviews > 0 ? `${analytics.totalReviews} avaliações` : undefined}
          />
        </KPIGrid>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="h-auto py-3 flex-col gap-1.5"
                  onClick={() => navigate(action.href)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Public Link */}
      {publicProfileUrl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Link do Perfil Público</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Partilha este link nas redes sociais para atrair compradores ao teu perfil.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md truncate">
                {publicProfileUrl}
              </code>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

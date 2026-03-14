import { useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMySellerProfile } from "@/hooks/useC2CSellers";
import { useMarketplaceAdmin } from "@/hooks/useMarketplace";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExternalLink, Copy, Link2 } from "lucide-react";

interface PublicLinkItem {
  id: string;
  label: string;
  description: string;
  url: string;
}

export default function C2CPublicLinksManager() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const workspaceSlug = currentWorkspace?.slug;
  const { data: seller } = useMySellerProfile(workspaceId);
  const { data: marketplaceConfig } = useMarketplaceAdmin(workspaceId);
  const marketplaceSlug = marketplaceConfig?.slug || workspaceSlug;

  const links = useMemo<PublicLinkItem[]>(() => {
    if (!marketplaceSlug) return [];

    const base = getPublicBaseUrl();
    const list: PublicLinkItem[] = [
      {
        id: "marketplace",
        label: "Marketplace público",
        description: "Página principal do marketplace para compradores.",
        url: `${base}/marketplace/${marketplaceSlug}`,
      },
      {
        id: "seller-signup",
        label: "Registo de vendedor",
        description: "Link para candidatura de novos vendedores.",
        url: `${base}/marketplace/${marketplaceSlug}/sell`,
      },
      {
        id: "sponsor",
        label: "Portal de patrocinadores",
        description: "Página para patrocinadores e promoções.",
        url: `${base}/marketplace/${marketplaceSlug}/sponsor`,
      },
    ];

    if (seller?.user_id) {
      list.push({
        id: "seller-profile",
        label: "Perfil público do vendedor",
        description: "Perfil público do vendedor autenticado neste workspace.",
        url: `${base}/marketplace/${marketplaceSlug}/seller/${seller.user_id}`,
      });
    }

    return list;
  }, [marketplaceSlug, seller?.user_id]);

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Links Públicos do Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Gere e partilhe os links públicos para vendedores, clientes e parceiros.
        </p>
      </div>

      {!marketplaceSlug ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Selecione um workspace para gerar os links públicos do marketplace.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {links.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  {item.label}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={item.url} readOnly />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(item.url)}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </Button>
                  <Button size="sm" asChild>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

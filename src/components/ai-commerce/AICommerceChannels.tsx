import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { commerceApiBaseUrl, useCommerceFeeds } from "@/hooks/useAICommerce";
import type { FeedChannel } from "@/lib/ai-commerce/types";

const CHANNELS: { channel: FeedChannel; label: string; description: string }[] = [
  {
    channel: "openai",
    label: "OpenAI / ChatGPT",
    description:
      "Catálogo em JSON com contexto de recomendação, exclusões e FAQ para agentes de compra.",
  },
  {
    channel: "google",
    label: "Google Merchant",
    description: "Feed XML com identificação (marca, GTIN, MPN), preço, disponibilidade e imagens.",
  },
  {
    channel: "meta",
    label: "Meta Commerce",
    description: "Feed CSV compatível com catálogos do Facebook e Instagram.",
  },
];

const ENDPOINTS = [
  ["GET /products", "Lista de produtos publicados para IA, com paginação e filtros."],
  ["GET /products/{slug}", "Detalhe de um produto."],
  ["GET /products/{slug}/variants", "Variantes disponíveis."],
  ["GET /categories", "Categorias com produtos publicados."],
  ["GET /feed?token=…", "Feed do canal no formato configurado."],
];

export function AICommerceChannels() {
  const { data: feeds } = useCommerceFeeds();
  const base = commerceApiBaseUrl();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {CHANNELS.map((c) => {
          const channelFeeds = (feeds || []).filter((f) => f.channel === c.channel);
          const active = channelFeeds.filter((f) => f.is_active).length;
          return (
            <Card key={c.channel}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{c.label}</CardTitle>
                  <Badge variant={active > 0 ? "default" : "outline"}>
                    {active > 0 ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{c.description}</p>
                <p>
                  {channelFeeds.length} feed(s) configurado(s), {active} ativo(s).
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Commerce API</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(base);
                toast.success("URL base copiado");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
              Copiar URL base
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <code className="block break-all rounded-md bg-muted p-2 text-xs">{base}</code>
          <ul className="space-y-2">
            {ENDPOINTS.map(([route, description]) => (
              <li key={route} className="rounded-md border p-2">
                <code className="text-xs font-medium">{route}</code>
                <p className="text-xs text-muted-foreground">{description}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            A API expõe apenas produtos com AI Commerce ativo e publicados. Custos, margens,
            fornecedores e stock exato nunca são devolvidos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Image, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Props {
  affiliateCode: string;
  baseUrl: string;
}

const QUICK_LINKS = [
  { label: "Página de Preços", path: "/pricing" },
  { label: "Landing Page", path: "/" },
  { label: "Funcionalidades", path: "/#features" },
  { label: "Registo", path: "/signup" },
];

const SOCIAL_TEMPLATES = [
  {
    platform: "LinkedIn",
    text: "🚀 Descobri uma ferramenta incrível para gestão de vendas e CRM. O FastCRM tem tudo: pipeline visual, automações, IA integrada e muito mais. Experimenta gratuitamente: {LINK}",
  },
  {
    platform: "Instagram",
    text: "Se procuras um CRM moderno e eficiente, recomendo o @fastcrm 💼\n\nPipeline visual, automações inteligentes e dashboard de receita.\n\nLink na bio: {LINK}",
  },
  {
    platform: "Email",
    text: "Olá!\n\nQueria recomendar-te o FastCRM — uma plataforma completa de CRM e vendas que tenho usado com excelentes resultados.\n\nExperimenta aqui: {LINK}\n\nQualquer dúvida, diz!",
  },
  {
    platform: "WhatsApp",
    text: "Olá! 👋 Estou a usar o FastCRM para gerir vendas e clientes e é fantástico. Tens de experimentar: {LINK}",
  },
];

export function AffiliateMaterialsCenter({ affiliateCode, baseUrl }: Props) {
  const buildLink = (path: string) => {
    const url = `${baseUrl}${path}`;
    return url.includes("?") ? `${url}&aff=${affiliateCode}` : `${url}?aff=${affiliateCode}`;
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Centro de Materiais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="links">
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="links" className="flex-1"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Links Rápidos</TabsTrigger>
            <TabsTrigger value="social" className="flex-1"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-2 mt-3">
            {QUICK_LINKS.map(l => {
              const link = buildLink(l.path);
              return (
                <div key={l.path} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{l.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">{link}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => copy(link)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="social" className="space-y-3 mt-3">
            {SOCIAL_TEMPLATES.map(t => {
              const text = t.text.replace("{LINK}", buildLink("/pricing"));
              return (
                <div key={t.platform} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{t.platform}</Badge>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copy(text)}>
                      <Copy className="h-3 w-3 mr-1" /> Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{text}</p>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
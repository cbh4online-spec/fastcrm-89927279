import { useState } from "react";
import { ArrowLeft, Globe, Eye, EyeOff, Copy, Check, BarChart3 } from "lucide-react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useBioPage, usePublishBioPage } from "@/hooks/useBioPages";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { BioBlockEditor } from "./BioBlockEditor";
import { BioSettingsTab } from "./tabs/BioSettingsTab";
import { BioAnalyticsTab } from "./tabs/BioAnalyticsTab";

interface BioPageBuilderProps {
  pageId: string;
  onBack: () => void;
}

export function BioPageBuilder({ pageId, onBack }: BioPageBuilderProps) {
  const { data: page } = useBioPage(pageId);
  const publishPage = usePublishBioPage();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState("blocks");
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${getPublicBaseUrl()}/bio/${currentWorkspace?.slug}/${page?.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!page) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-primary hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{page.name}</h1>
            <Badge variant={page.status === "live" ? "default" : "secondary"}>
              {page.status === "live" ? "Live" : "Draft"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {page.status === "live" && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(`/bio/${currentWorkspace?.slug}/${page.slug}`, "_blank")}>
                <Globe className="h-4 w-4 mr-1" /> Ver Página
              </Button>
            </>
          )}
          <Button
            variant={page.status === "live" ? "outline" : "default"}
            size="sm"
            onClick={() => publishPage.mutate({ id: page.id, status: page.status === "live" ? "draft" : "live" })}
          >
            {page.status === "live" ? <><EyeOff className="h-4 w-4 mr-1" /> Despublicar</> : <><Eye className="h-4 w-4 mr-1" /> Publicar</>}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="blocks">Blocos</TabsTrigger>
          <TabsTrigger value="settings">Definições</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Analíticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks">
          <BioBlockEditor pageId={pageId} page={page} />
        </TabsContent>
        <TabsContent value="settings">
          <BioSettingsTab pageId={pageId} />
        </TabsContent>
        <TabsContent value="analytics">
          <BioAnalyticsTab pageId={pageId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

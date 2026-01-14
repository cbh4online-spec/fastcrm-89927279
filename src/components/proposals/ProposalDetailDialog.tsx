import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Eye,
  Send,
  Copy,
  ExternalLink,
  History,
  Activity,
  Loader2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { ProposalPreview } from "./ProposalPreview";
import {
  useProposal,
  useProposalVersions,
  useProposalActivity,
  usePublishProposal,
} from "@/hooks/useProposals";
import type { ProposalStatus } from "@/types/proposal";

interface ProposalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
}

const statusLabels: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  accepted: "Aceita",
  expired: "Expirada",
  rejected: "Rejeitada",
};

export function ProposalDetailDialog({
  open,
  onOpenChange,
  proposalId,
}: ProposalDetailDialogProps) {
  const [tab, setTab] = useState<"preview" | "versions" | "activity">("preview");

  const { data: proposal, isLoading } = useProposal(proposalId);
  const { data: versions } = useProposalVersions(proposalId);
  const { data: activity } = useProposalActivity(proposalId);
  const publishProposal = usePublishProposal();

  const getPublicUrl = (slug: string) => {
    return `${window.location.origin}/p/${slug}`;
  };

  const handleCopyLink = () => {
    if (proposal) {
      navigator.clipboard.writeText(getPublicUrl(proposal.slug));
      toast.success("Link copiado!");
    }
  };

  const handlePublish = async () => {
    if (proposal) {
      await publishProposal.mutateAsync(proposal.id);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!proposal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <DialogTitle>{proposal.title}</DialogTitle>
              <Badge>{statusLabels[proposal.status]}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {proposal.status === "draft" && (
                <Button onClick={handlePublish} disabled={publishProposal.isPending}>
                  {publishProposal.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Publicar
                </Button>
              )}
              {proposal.status === "published" && (
                <>
                  <Button variant="outline" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(getPublicUrl(proposal.slug), "_blank")
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4 border-y">
          <div>
            <p className="text-sm text-muted-foreground">Oportunidade</p>
            <p className="font-medium">{proposal.opportunity?.title || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-medium">
              {proposal.opportunity?.lead?.name || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="font-medium">
              {proposal.price
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: proposal.currency,
                  }).format(proposal.price)
                : "-"}
            </p>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) =>
            setTab(v as "preview" | "versions" | "activity")
          }
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Visualização
            </TabsTrigger>
            <TabsTrigger value="versions">
              <History className="h-4 w-4 mr-2" />
              Versões ({versions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Atividade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              <ProposalPreview
                title={proposal.title}
                blocks={proposal.content_blocks}
                variables={proposal.variables}
                ctaText={proposal.cta_text}
                ctaColor={proposal.cta_color}
                price={proposal.price}
                currency={proposal.currency}
                showCta={false}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="versions" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {versions?.map((version) => (
                  <Card key={version.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Versão {version.version}</p>
                        <p className="text-sm text-muted-foreground">
                          {version.change_summary}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(version.created_at), "dd/MM/yyyy HH:mm", {
                          locale: pt,
                        })}
                      </p>
                    </div>
                  </Card>
                ))}
                {(!versions || versions.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma versão registrada.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {activity?.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{log.action}</p>
                        {log.details && (
                          <p className="text-sm text-muted-foreground">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                          locale: pt,
                        })}
                      </p>
                    </div>
                  </Card>
                ))}
                {(!activity || activity.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma atividade registrada.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

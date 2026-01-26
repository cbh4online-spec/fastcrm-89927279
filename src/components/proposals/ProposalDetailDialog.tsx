import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  Send,
  Copy,
  ExternalLink,
  History,
  Activity,
  Loader2,
  FileText,
  Monitor,
  Smartphone,
  Building2,
  User,
  Calendar,
  Euro,
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
import { cn } from "@/lib/utils";

interface ProposalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
}

const statusConfig: Record<ProposalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicada", variant: "default", className: "bg-blue-500 hover:bg-blue-600" },
  accepted: { label: "Aceita", variant: "default", className: "bg-green-500 hover:bg-green-600" },
  expired: { label: "Expirada", variant: "destructive" },
  rejected: { label: "Rejeitada", variant: "destructive" },
};

export function ProposalDetailDialog({
  open,
  onOpenChange,
  proposalId,
}: ProposalDetailDialogProps) {
  const [tab, setTab] = useState<"preview" | "versions" | "activity">("preview");
  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");

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

  const formatCurrency = (value: number | null, currency?: string) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency || "EUR",
    }).format(value);
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

  const statusInfo = statusConfig[proposal.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
          {/* Top Bar with Title and Actions */}
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge 
                    variant={statusInfo.variant} 
                    className={cn("font-medium", statusInfo.className)}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold text-foreground truncate">
                  {proposal.title}
                </h2>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {proposal.status === "draft" && (
                  <Button 
                    onClick={handlePublish} 
                    disabled={publishProposal.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
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
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
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
          </div>

          {/* Info Cards Row */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Opportunity */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Oportunidade</span>
                </div>
                <p className="font-medium text-sm truncate">
                  {proposal.opportunity?.title || "-"}
                </p>
              </div>

              {/* Client */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Cliente</span>
                </div>
                <p className="font-medium text-sm truncate">
                  {proposal.opportunity?.lead?.name || "-"}
                </p>
              </div>

              {/* Value */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Euro className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Valor</span>
                </div>
                <p className="font-semibold text-sm text-primary">
                  {formatCurrency(proposal.price, proposal.currency)}
                </p>
              </div>

              {/* Created Date */}
              <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Criada em</span>
                </div>
                <p className="font-medium text-sm">
                  {format(new Date(proposal.created_at), "dd MMM yyyy", { locale: pt })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              setTab(v as "preview" | "versions" | "activity")
            }
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                <TabsTrigger 
                  value="preview"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualização
                </TabsTrigger>
                <TabsTrigger 
                  value="versions"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                >
                  <History className="h-4 w-4 mr-2" />
                  Versões ({versions?.length || 0})
                </TabsTrigger>
                <TabsTrigger 
                  value="activity"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Atividade
                </TabsTrigger>
              </TabsList>

              {/* Device Toggle */}
              {tab === "preview" && (
                <div className="flex items-center gap-1 bg-muted rounded-full p-1">
                  <Button
                    variant={deviceView === "desktop" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDeviceView("desktop")}
                    className={cn(
                      "rounded-full h-7 px-3 text-xs",
                      deviceView === "desktop" && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Monitor className="h-3.5 w-3.5 mr-1.5" />
                    Desktop
                  </Button>
                  <Button
                    variant={deviceView === "mobile" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDeviceView("mobile")}
                    className={cn(
                      "rounded-full h-7 px-3 text-xs",
                      deviceView === "mobile" && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                    Mobile
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="preview" className="flex-1 min-h-0 mt-0 p-6 bg-muted/20">
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

            <TabsContent value="versions" className="flex-1 min-h-0 mt-0 p-6">
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

            <TabsContent value="activity" className="flex-1 min-h-0 mt-0 p-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

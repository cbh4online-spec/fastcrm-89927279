import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Send, 
  MoreHorizontal, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Play,
  Pause,
  Copy,
  Mail
} from 'lucide-react';
import { useMarketingCampaigns, useDeleteCampaign, useSendCampaign, useCreateCampaign } from '@/hooks/useMarketingCampaigns';
import { toast } from 'sonner';
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS, calculateCampaignStats } from '@/types/marketing';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CampaignFormDialog } from './CampaignFormDialog';
import { CampaignDetailDialog } from './CampaignDetailDialog';
import type { MarketingCampaign } from '@/types/marketing';

interface MarketingCampaignsListProps {
  onCreateNew: () => void;
}

export function MarketingCampaignsList({ onCreateNew }: MarketingCampaignsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useMarketingCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const sendCampaign = useSendCampaign();
  const createCampaign = useCreateCampaign();

  const handleDuplicate = async (campaign: MarketingCampaign) => {
    try {
      await createCampaign.mutateAsync({
        name: `${campaign.name} (cópia)`,
        subject: campaign.subject,
        previewText: campaign.previewText,
        fromName: campaign.fromName,
        replyTo: campaign.replyTo,
        bodyHtml: campaign.bodyHtml,
        bodyText: campaign.bodyText,
        templateId: campaign.templateId,
        segmentId: campaign.segmentId,
      });
      toast.success('Campanha duplicada com sucesso');
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error('Erro ao duplicar campanha');
    }
  };

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (campaign: MarketingCampaign) => {
    setSelectedCampaign(campaign);
    setShowEditDialog(true);
  };

  const handleView = (campaign: MarketingCampaign) => {
    setSelectedCampaign(campaign);
    setShowDetailDialog(true);
  };

  const handleDelete = (id: string) => {
    setCampaignToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (campaignToDelete) {
      await deleteCampaign.mutateAsync(campaignToDelete);
      setShowDeleteDialog(false);
      setCampaignToDelete(null);
    }
  };

  const handleSend = async (campaign: MarketingCampaign) => {
    if (campaign.status !== 'draft') return;
    await sendCampaign.mutateAsync(campaign.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">A carregar campanhas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Campanhas
              </CardTitle>
              <CardDescription>
                Gerir as tuas campanhas de email marketing
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar campanhas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {searchQuery ? 'Nenhuma campanha encontrada' : 'Ainda não criaste nenhuma campanha'}
              </p>
              {!searchQuery && (
                <Button onClick={onCreateNew} className="mt-4">
                  <Send className="h-4 w-4 mr-2" />
                  Criar Primeira Campanha
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => {
                const stats = calculateCampaignStats(campaign);
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{campaign.name}</span>
                        <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status]}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {campaign.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {format(new Date(campaign.createdAt), "d MMM yyyy", { locale: pt })}
                        {campaign.scheduledAt && (
                          <> · Agendada para {format(new Date(campaign.scheduledAt), "d MMM yyyy 'às' HH:mm", { locale: pt })}</>
                        )}
                      </p>
                    </div>

                    {campaign.status === 'sent' && (
                      <div className="hidden md:flex items-center gap-6 mx-4 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{campaign.sentCount}</div>
                          <div className="text-xs text-muted-foreground">Enviados</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{stats.openRate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Abertura</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{stats.clickRate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Cliques</div>
                        </div>
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(campaign)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        {campaign.status === 'draft' && (
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSend(campaign)}>
                              <Play className="h-4 w-4 mr-2" />
                              Enviar Agora
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(campaign)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CampaignFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        campaign={selectedCampaign}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedCampaign(null);
        }}
      />

      {/* Detail Dialog */}
      <CampaignDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        campaign={selectedCampaign}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha e todos os seus dados serão permanentemente eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

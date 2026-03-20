import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CampaignReportExportProps {
  campaignId?: string;
}

interface CampaignData {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  complained_count: number;
  unsubscribed_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export function CampaignReportExport({ campaignId }: CampaignReportExportProps) {
  const { currentWorkspace } = useWorkspace();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!currentWorkspace?.id) return;
    setIsGenerating(true);

    try {
      // Fetch campaign data
      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('id', campaignId);
      } else {
        query = query.limit(20);
      }

      const { data: campaigns, error } = await query;
      if (error) throw error;
      if (!campaigns || campaigns.length === 0) {
        toast.error('Sem campanhas para exportar');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatorio de Email Marketing', 14, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Gerado a: ${new Date().toLocaleDateString('pt-PT')}`, 14, 30);
      doc.text(`Workspace: ${currentWorkspace.name || 'N/A'}`, 14, 36);

      let yPos = 46;

      if (campaignId && campaigns.length === 1) {
        // Single campaign detailed report
        const c = campaigns[0] as CampaignData;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(c.name, 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(`Assunto: ${c.subject || 'N/A'}`, 14, yPos);
        yPos += 6;
        doc.text(`Estado: ${c.status}`, 14, yPos);
        yPos += 6;
        doc.text(`Enviada: ${c.started_at ? new Date(c.started_at).toLocaleDateString('pt-PT') : 'N/A'}`, 14, yPos);
        yPos += 12;

        // KPI boxes
        const total = c.total_recipients || 1;
        const kpis = [
          { label: 'Destinatarios', value: String(c.total_recipients) },
          { label: 'Enviados', value: String(c.sent_count) },
          { label: 'Entregues', value: `${c.delivered_count} (${((c.delivered_count / total) * 100).toFixed(1)}%)` },
          { label: 'Abertos', value: `${c.opened_count} (${((c.opened_count / total) * 100).toFixed(1)}%)` },
          { label: 'Clicados', value: `${c.clicked_count} (${((c.clicked_count / total) * 100).toFixed(1)}%)` },
          { label: 'Bounces', value: `${c.bounced_count} (${((c.bounced_count / total) * 100).toFixed(1)}%)` },
          { label: 'Spam', value: String(c.complained_count) },
          { label: 'Cancelados', value: String(c.unsubscribed_count) },
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Metrica', 'Valor']],
          body: kpis.map((k) => [k.label, k.value]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
        });

        // Fetch top links
        const { data: clicks } = await supabase
          .from('campaign_link_clicks')
          .select('link_url, link_label')
          .eq('campaign_id', campaignId)
          .limit(100);

        if (clicks && clicks.length > 0) {
          const linkCounts: Record<string, { url: string; label: string; count: number }> = {};
          clicks.forEach((cl: any) => {
            const key = cl.link_url;
            if (!linkCounts[key]) linkCounts[key] = { url: cl.link_url, label: cl.link_label || '', count: 0 };
            linkCounts[key].count++;
          });

          const sortedLinks = Object.values(linkCounts).sort((a, b) => b.count - a.count);

          const finalY = (doc as any).lastAutoTable?.finalY || yPos + 40;

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Top Links Clicados', 14, finalY + 12);

          autoTable(doc, {
            startY: finalY + 16,
            head: [['Link', 'Cliques']],
            body: sortedLinks.slice(0, 10).map((l) => [l.url.substring(0, 60), String(l.count)]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            margin: { left: 14, right: 14 },
          });
        }
      } else {
        // Multiple campaigns summary
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(`Resumo de ${campaigns.length} Campanhas`, 14, yPos);
        yPos += 10;

        const tableData = campaigns.map((c: any) => {
          const total = c.total_recipients || 1;
          return [
            c.name?.substring(0, 25) || 'N/A',
            c.status,
            String(c.total_recipients || 0),
            `${((c.opened_count / total) * 100).toFixed(1)}%`,
            `${((c.clicked_count / total) * 100).toFixed(1)}%`,
            `${((c.bounced_count / total) * 100).toFixed(1)}%`,
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Campanha', 'Estado', 'Destinat.', 'Abert.', 'Cliques', 'Bounces']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 50 },
          },
        });

        // Totals
        const totals = campaigns.reduce(
          (acc: any, c: any) => ({
            recipients: acc.recipients + (c.total_recipients || 0),
            sent: acc.sent + (c.sent_count || 0),
            opened: acc.opened + (c.opened_count || 0),
            clicked: acc.clicked + (c.clicked_count || 0),
          }),
          { recipients: 0, sent: 0, opened: 0, clicked: 0 }
        );

        const finalY = (doc as any).lastAutoTable?.finalY || yPos + 40;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Totais Agregados', 14, finalY + 12);

        autoTable(doc, {
          startY: finalY + 16,
          head: [['Metrica', 'Total']],
          body: [
            ['Total Destinatarios', String(totals.recipients)],
            ['Total Enviados', String(totals.sent)],
            ['Total Aberturas', String(totals.opened)],
            ['Total Cliques', String(totals.clicked)],
            ['Taxa Media de Abertura', totals.recipients ? `${((totals.opened / totals.recipients) * 100).toFixed(1)}%` : '0%'],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `FastCRM - Pagina ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      const fileName = campaignId
        ? `relatorio-campanha-${new Date().toISOString().slice(0, 10)}.pdf`
        : `relatorio-marketing-${new Date().toISOString().slice(0, 10)}.pdf`;

      doc.save(fileName);
      toast.success('Relatório PDF gerado com sucesso');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Exportar Relatório
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {campaignId
            ? 'Gera um relatório detalhado desta campanha em PDF'
            : 'Gera um relatório agregado de todas as campanhas recentes'}
        </p>
        <Button onClick={generatePDF} disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A gerar...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

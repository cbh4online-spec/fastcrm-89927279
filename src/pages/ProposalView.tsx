import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ProposalView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchProposal = async () => {
      const { data, error } = await supabase
        .from("fastcrm_proposals" as any)
        .select("proposal_html, company_name")
        .eq("id", id)
        .single();

      if (!error && data) {
        setHtml((data as any).proposal_html);
        setCompanyName((data as any).company_name);
      }
      setLoading(false);
    };

    fetchProposal();
  }, [id]);

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      const iframe = document.getElementById("proposal-frame") as HTMLIFrameElement;
      if (!iframe?.contentDocument?.body) return;

      const canvas = await html2canvas(iframe.contentDocument.body, {
        backgroundColor: "#0a0e1a",
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Proposta-FastCRM-${companyName.replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,4%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!html) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,4%)] flex items-center justify-center text-[hsl(210,40%,98%)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Proposta não encontrada</h1>
          <p className="text-[hsl(210,40%,98%)/0.5]">O link pode ter expirado ou ser inválido.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Proposta FastCRM — {companyName}</title>
      </Helmet>
      <div className="min-h-screen bg-[hsl(222,47%,4%)]">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[hsl(222,47%,6%)] border-b border-[hsl(210,40%,98%)/0.08] px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-[hsl(210,40%,98%)/0.7]">Proposta Estratégica — {companyName}</span>
          <Button
            onClick={handleDownloadPdf}
            disabled={generating}
            size="sm"
            className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            {generating ? "A gerar..." : "Download PDF"}
          </Button>
        </div>

        {/* Proposal content */}
        <iframe
          id="proposal-frame"
          srcDoc={html}
          className="w-full border-0"
          style={{ minHeight: "calc(100vh - 56px)" }}
          title="Proposta FastCRM"
        />
      </div>
    </>
  );
}

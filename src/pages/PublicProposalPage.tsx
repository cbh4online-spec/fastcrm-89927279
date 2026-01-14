import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Proposal } from "@/types/proposal";

export default function PublicProposalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    if (slug) {
      loadProposal();
      trackView();
    }
  }, [slug]);

  const loadProposal = async () => {
    const { data, error } = await supabase
      .from("proposals")
      .select(`*, opportunity:opportunities(id, title, value, lead:leads(id, name, email))`)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error) {
      console.error("Error loading proposal:", error);
    } else {
      setProposal(data as unknown as Proposal);
    }
    setLoading(false);
  };

  const trackView = async () => {
    // Get proposal info
    const { data: prop } = await supabase
      .from("proposals")
      .select("id, workspace_id, views_count, template_id")
      .eq("slug", slug)
      .single();
    
    if (prop) {
      // Increment views count directly
      await supabase
        .from("proposals")
        .update({ views_count: (prop.views_count || 0) + 1 })
        .eq("id", prop.id);

      // Log activity
      await supabase.from("proposal_activity_logs").insert({
        proposal_id: prop.id,
        workspace_id: prop.workspace_id,
        action: "viewed",
        user_agent: navigator.userAgent,
      } as never);

      // Track analytics
      await supabase.from("proposal_analytics").insert({
        workspace_id: prop.workspace_id,
        proposal_id: prop.id,
        template_id: prop.template_id,
        event_type: "view",
        metadata: { user_agent: navigator.userAgent },
      } as never);
    }
  };

  const handleCheckout = async () => {
    if (!proposal) return;
    setCheckoutLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("proposal-checkout", {
        body: { proposalId: proposal.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      toast.error(`Erro ao iniciar pagamento: ${(error as Error).message}`);
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Proposta não encontrada</h1>
          <p className="text-muted-foreground">
            Esta proposta não existe ou não está mais disponível.
          </p>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "success" || proposal.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pagamento Confirmado!</h1>
          <p className="text-muted-foreground mb-4">
            Obrigado por aceitar nossa proposta. Entraremos em contato em breve.
          </p>
          <Badge className="bg-green-500">Proposta Aceita</Badge>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "canceled") {
    toast.info("Pagamento cancelado. Você pode tentar novamente.");
  }

  const isExpired = proposal.expires_at && new Date(proposal.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Proposta Expirada</h1>
          <p className="text-muted-foreground">
            Esta proposta não está mais disponível. Entre em contato conosco para mais informações.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProposalPreview
        title={proposal.title}
        blocks={proposal.content_blocks}
        variables={proposal.variables}
        ctaText={proposal.cta_text}
        ctaColor={proposal.cta_color}
        price={proposal.price}
        currency={proposal.currency}
        showCta={true}
        onCtaClick={handleCheckout}
      />
      
      {checkoutLoading && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Redirecionando para pagamento...</p>
          </div>
        </div>
      )}
    </div>
  );
}

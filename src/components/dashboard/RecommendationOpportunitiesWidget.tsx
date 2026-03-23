import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RecOpportunity {
  id: string;
  score: number;
  reason: string | null;
  confidence: string;
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  product_id: string;
  entityName: string;
  entityType: string;
  entityId: string;
  productName: string;
}

export function RecommendationOpportunitiesWidget() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const workspaceId = currentWorkspace?.id;

  const { data: opportunities, isLoading } = useQuery<RecOpportunity[]>({
    queryKey: ["dashboard-rec-opportunities", workspaceId],
    queryFn: async () => {
      // Use raw rpc since product_recommendations may not be in generated types yet
      const { data, error } = await (supabase as any)
        .from("product_recommendations")
        .select("id, score, reason, confidence, strategy, contact_id, company_id, lead_id, product_id")
        .eq("workspace_id", workspaceId!)
        .eq("status", "pending")
        .eq("confidence", "high")
        .gt("score", 70)
        .gt("expires_at", new Date().toISOString())
        .order("score", { ascending: false })
        .limit(5);

      if (error || !data?.length) return [];

      const recs = data as any[];
      const contactIds = recs.filter(d => d.contact_id).map(d => d.contact_id);
      const companyIds = recs.filter(d => d.company_id).map(d => d.company_id);
      const leadIds = recs.filter(d => d.lead_id).map(d => d.lead_id);
      const productIds = recs.map(d => d.product_id);

      const [contacts, companies, leads, products] = await Promise.all([
        contactIds.length
          ? supabase.from("contacts").select("id, first_name, last_name").in("id", contactIds).then(r => r.data ?? [])
          : Promise.resolve([] as any[]),
        companyIds.length
          ? supabase.from("companies").select("id, name").in("id", companyIds).then(r => r.data ?? [])
          : Promise.resolve([] as any[]),
        leadIds.length
          ? supabase.from("leads").select("id, name").in("id", leadIds).then(r => r.data ?? [])
          : Promise.resolve([] as any[]),
        supabase.from("products").select("id, name, base_price").in("id", productIds).then(r => r.data ?? []),
      ]);

      const contactMap = new Map(contacts.map(c => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()]));
      const companyMap = new Map(companies.map(c => [c.id, c.name]));
      const leadMap = new Map(leads.map(l => [l.id, l.name]));
      const productMap = new Map(products.map(p => [p.id, p.name]));

      return recs.map(rec => {
        const entityName = rec.contact_id
          ? contactMap.get(rec.contact_id) ?? "Contacto"
          : rec.company_id
          ? companyMap.get(rec.company_id) ?? "Empresa"
          : leadMap.get(rec.lead_id) ?? "Lead";
        const entityType = rec.contact_id ? "contact" : rec.company_id ? "company" : "lead";
        const entityId = rec.contact_id ?? rec.company_id ?? rec.lead_id;

        return {
          id: rec.id,
          score: rec.score,
          reason: rec.reason,
          confidence: rec.confidence,
          contact_id: rec.contact_id,
          company_id: rec.company_id,
          lead_id: rec.lead_id,
          product_id: rec.product_id,
          entityName: entityName as string,
          entityType,
          entityId,
          productName: (productMap.get(rec.product_id) ?? "Produto") as string,
        };
      });
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 15,
  });

  const handleClick = (entityType: string, entityId: string) => {
    const routes: Record<string, string> = {
      contact: `/dashboard/contacts/${entityId}`,
      company: `/dashboard/companies/${entityId}`,
      lead: `/dashboard/leads/${entityId}`,
    };
    navigate(routes[entityType] ?? "/dashboard");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Oportunidades IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))
        ) : !opportunities?.length ? (
          <p className="text-xs text-muted-foreground py-2">
            Sem oportunidades de alta confiança de momento.
          </p>
        ) : (
          opportunities.map((opp) => (
            <button
              key={opp.id}
              onClick={() => handleClick(opp.entityType, opp.entityId)}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {opp.entityName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {opp.entityName}
                  <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                  {opp.productName}
                </p>
                {opp.reason && (
                  <p className="text-[10px] text-muted-foreground truncate">{opp.reason}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {Math.round(opp.score)}
              </Badge>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

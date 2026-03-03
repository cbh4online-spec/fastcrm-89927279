import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useCreateRenewalContract, useCreateRenewalItem } from "@/hooks/useRenewals";
import { toast } from "sonner";
import type { Proposal } from "@/types/proposal";
import type { RenewalItemType } from "@/types/renewal";

interface ProposalToRenewalCTAProps {
  proposal: Proposal;
  proposalItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    cost_price?: number;
    description?: string;
    product_id?: string | null;
    product?: {
      id: string;
      name: string;
      category?: string | null;
    } | null;
  }>;
}

// Map product categories to renewal item types
const CATEGORY_TO_RENEWAL_TYPE: Record<string, RenewalItemType> = {
  domain: "domain",
  domains: "domain",
  domínio: "domain",
  domínios: "domain",
  license: "software_license",
  licenses: "software_license",
  licença: "software_license",
  licenças: "software_license",
  software: "software_license",
  hours: "hours_pack",
  horas: "hours_pack",
  "pack horas": "hours_pack",
  "hours_pack": "hours_pack",
  retainer: "retainer",
  manutenção: "retainer",
  maintenance: "retainer",
  subscription: "subscription",
  subscrição: "subscription",
};

function detectItemType(item: { name: string; product?: { category?: string | null } | null }): RenewalItemType | null {
  const category = item.product?.category?.toLowerCase() || "";
  const name = item.name.toLowerCase();

  // Check category first
  for (const [key, type] of Object.entries(CATEGORY_TO_RENEWAL_TYPE)) {
    if (category.includes(key)) return type;
  }
  // Then check name
  for (const [key, type] of Object.entries(CATEGORY_TO_RENEWAL_TYPE)) {
    if (name.includes(key)) return type;
  }
  return null;
}

export function ProposalToRenewalCTA({ proposal, proposalItems = [] }: ProposalToRenewalCTAProps) {
  const navigate = useNavigate();
  const createContract = useCreateRenewalContract();
  const createItem = useCreateRenewalItem();
  const [isCreating, setIsCreating] = useState(false);

  // Only show for accepted proposals
  if (proposal.status !== "accepted") return null;

  // Find items that can be renewal items
  const renewableItems = proposalItems
    .map(item => ({ ...item, renewalType: detectItemType(item) }))
    .filter(item => item.renewalType !== null);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const contract = await createContract.mutateAsync({
        company_id: proposal.company_id || undefined,
        contact_id: proposal.contact_id || undefined,
        source_type: "proposal",
        source_id: proposal.id,
        status: "active",
        billing_type: "invoice",
        currency: proposal.currency || "EUR",
        start_date: new Date().toISOString().split("T")[0],
        renewal_interval: "yearly",
        auto_renew: true,
      });

      // Create items
      for (const item of renewableItems) {
        const metaJson: Record<string, unknown> = {};
        if (item.renewalType === "hours_pack") {
          metaJson.hours_included = item.quantity;
          metaJson.hours_remaining = item.quantity;
        }

        await createItem.mutateAsync({
          contract_id: contract.id,
          item_type: item.renewalType!,
          product_id: item.product_id || undefined,
          name: item.name,
          qty: item.quantity,
          unit_price: item.unit_price,
          pricing_model: "fixed",
          renewal_interval: "yearly",
          next_renewal_date: (() => {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            return d.toISOString().split("T")[0];
          })(),
          meta_json: metaJson,
        });
      }

      toast.success("Contrato de renovação criado com sucesso!");
      navigate(`/dashboard/renewals/${contract.id}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar contrato de renovação");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCreate}
      disabled={isCreating}
      className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
    >
      {isCreating ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-1" />
      )}
      <span className="hidden md:inline">Criar Renovação</span>
    </Button>
  );
}

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import type { Proposal } from "@/types/proposal";

export interface ProposalToRentalCTAProps {
  proposal: Proposal;
  proposalItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    description?: string;
    product_id?: string | null;
  }>;
}

export const RENTAL_PREFILL_KEY = "rental:prefillFromProposal";

export function ProposalToRentalCTA({ proposal, proposalItems = [] }: ProposalToRentalCTAProps) {
  const navigate = useNavigate();

  if (proposal.status !== "accepted") return null;

  const handleClick = () => {
    if (!proposal.company_id) {
      toast.error("A proposta não tem empresa cliente associada.");
      return;
    }
    const payload = {
      proposal_id: proposal.id,
      end_client_company_id: proposal.company_id,
      notes: `Origem: proposta ${proposal.title}`,
      items: proposalItems.map((i) => ({
        product_id: i.product_id ?? null,
        description: i.description || i.name,
        quantity: Number(i.quantity || 1),
        unit_price: Number(i.unit_price || 0),
        serial_numbers: [""],
        track_serials: false,
      })),
    };
    try {
      sessionStorage.setItem(RENTAL_PREFILL_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    navigate("/dashboard/rentals/new");
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
    >
      <Truck className="h-4 w-4 mr-1" />
      <span className="hidden md:inline">Criar Contrato Renting</span>
    </Button>
  );
}

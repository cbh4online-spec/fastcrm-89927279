import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  User,
  Target,
  ExternalLink,
  Mail,
  Phone,
  MessageSquare,
  MoreHorizontal,
  Copy,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import type { Proposal } from "@/types/proposal";

interface ProposalQuickLinksProps {
  proposal: Proposal;
  variant?: "compact" | "full";
  onCreateTask?: () => void;
  onDuplicate?: () => void;
}

export function ProposalQuickLinks({
  proposal,
  variant = "compact",
  onCreateTask,
  onDuplicate,
}: ProposalQuickLinksProps) {
  const navigate = useNavigate();

  // Get client info
  const clientName = proposal.company?.name || proposal.contact?.name || proposal.opportunity?.lead?.name;
  const clientEmail = proposal.company?.email || proposal.contact?.email || proposal.opportunity?.lead?.email;
  const hasCompany = !!proposal.company?.id;
  const hasContact = !!proposal.contact?.id;
  const hasOpportunity = !!proposal.opportunity?.id;
  const hasLead = !!proposal.opportunity?.lead?.id;

  // Navigation handlers
  const handleNavigateToOpportunity = () => {
    if (proposal.opportunity?.id) {
      navigate(`/dashboard/opportunities/${proposal.opportunity.id}`);
    }
  };

  const handleNavigateToClient = () => {
    if (proposal.company?.id) {
      navigate(`/dashboard/companies/${proposal.company.id}`);
    } else if (proposal.contact?.id) {
      navigate(`/dashboard/contacts/${proposal.contact.id}`);
    }
  };

  const handleNavigateToLead = () => {
    if (proposal.opportunity?.lead?.id) {
      navigate(`/dashboard/crm/leads/${proposal.opportunity.lead.id}`);
    }
  };

  // Action handlers
  const handleSendEmail = () => {
    if (clientEmail) {
      window.open(`mailto:${clientEmail}?subject=${encodeURIComponent(`Re: ${proposal.title}`)}`);
    }
  };

  const handleWhatsApp = () => {
    // Would need phone number - for now just show toast
    // This would need to be enhanced with actual phone number from contact/company
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {hasOpportunity && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNavigateToOpportunity}
              >
                <Target className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver Oportunidade</TooltipContent>
          </Tooltip>
        )}

        {(hasCompany || hasContact) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNavigateToClient}
              >
                {hasCompany ? (
                  <Building2 className="h-3.5 w-3.5" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver Ficha CRM</TooltipContent>
          </Tooltip>
        )}

        {clientEmail && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSendEmail}
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar Email</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasOpportunity && (
              <DropdownMenuItem onClick={handleNavigateToOpportunity}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Ver Oportunidade
              </DropdownMenuItem>
            )}
            {(hasCompany || hasContact) && (
              <DropdownMenuItem onClick={handleNavigateToClient}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Ficha CRM
              </DropdownMenuItem>
            )}
            {hasLead && (
              <DropdownMenuItem onClick={handleNavigateToLead}>
                <User className="h-4 w-4 mr-2" />
                Ver Lead
              </DropdownMenuItem>
            )}
            {(hasOpportunity || hasCompany || hasContact || hasLead) && (
              <DropdownMenuSeparator />
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar Proposta
              </DropdownMenuItem>
            )}
            {onCreateTask && (
              <DropdownMenuItem onClick={onCreateTask}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Criar Tarefa
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Full variant
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasOpportunity && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNavigateToOpportunity}
          className="gap-1"
        >
          <Target className="h-4 w-4" />
          Oportunidade
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Button>
      )}

      {(hasCompany || hasContact) && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNavigateToClient}
          className="gap-1"
        >
          {hasCompany ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
          Ficha CRM
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Button>
      )}

      {clientEmail && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendEmail}
          className="gap-1"
        >
          <Mail className="h-4 w-4" />
          Email
        </Button>
      )}

      {onCreateTask && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateTask}
          className="gap-1"
        >
          <CheckSquare className="h-4 w-4" />
          Criar Tarefa
        </Button>
      )}

      {onDuplicate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDuplicate}
          className="gap-1"
        >
          <Copy className="h-4 w-4" />
          Duplicar
        </Button>
      )}
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreditProposals, useDeleteCreditProposal } from "../hooks/useCreditProposals";
import { CreateProposalDialog } from "./CreateProposalDialog";
import { ProposalAIAnalysis } from "./ProposalAIAnalysis";
import { 
  CREDIT_TYPE_LABELS, 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUS_COLORS,
  CreditType,
  ProposalStatus,
  CreditProposal
} from "../types";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Trash2,
  Brain,
  Filter,
  Home,
  User,
  Building2,
  Car
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const CREDIT_TYPE_ICONS: Record<CreditType, typeof Home> = {
  habitacao: Home,
  pessoal: User,
  empresarial: Building2,
  automovel: Car,
};

export function CreditProposalsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedProposal, setSelectedProposal] = useState<CreditProposal | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  const { data: proposals = [], isLoading } = useCreditProposals({
    search: search || undefined,
    status: statusFilter !== "all" ? [statusFilter as ProposalStatus] : undefined,
    credit_type: typeFilter !== "all" ? typeFilter as CreditType : undefined,
  });

  const deleteProposal = useDeleteCreditProposal();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem a certeza que quer eliminar esta proposta?")) {
      await deleteProposal.mutateAsync(id);
    }
  };

  const handleAIAnalysis = (proposal: CreditProposal) => {
    setSelectedProposal(proposal);
    setShowAIAnalysis(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar propostas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(PROPOSAL_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(CREDIT_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CreateProposalDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposta
          </Button>
        </CreateProposalDialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referência</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Montante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>IA Score</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : proposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma proposta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                proposals.map((proposal) => {
                  const TypeIcon = CREDIT_TYPE_ICONS[proposal.credit_type as CreditType] || User;
                  return (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-mono text-sm">
                        {proposal.reference_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {proposal.entity_type === "company" ? (
                              <Building2 className="w-4 h-4 text-primary" />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <span className="font-medium">{proposal.entity_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {CREDIT_TYPE_LABELS[proposal.credit_type as CreditType]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(proposal.amount_requested)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={PROPOSAL_STATUS_COLORS[proposal.status as ProposalStatus]}
                        >
                          {PROPOSAL_STATUS_LABELS[proposal.status as ProposalStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {proposal.ai_viability_score ? (
                          <div className="flex items-center gap-1">
                            <Brain className="w-3 h-3 text-primary" />
                            <span className="text-sm font-medium">
                              {proposal.ai_viability_score}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(proposal.created_at), "dd MMM yyyy", { locale: pt })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAIAnalysis(proposal)}>
                              <Brain className="h-4 w-4 mr-2" />
                              Análise IA
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(proposal.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AI Analysis Sheet */}
      {selectedProposal && (
        <ProposalAIAnalysis
          proposal={selectedProposal}
          open={showAIAnalysis}
          onClose={() => {
            setShowAIAnalysis(false);
            setSelectedProposal(null);
          }}
        />
      )}
    </div>
  );
}

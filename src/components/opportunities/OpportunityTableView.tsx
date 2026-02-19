import { useState } from "react";
import { Opportunity } from "@/types/opportunity";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MoreHorizontal, 
  User, 
  Building2, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DealScore, getCategoryColors, getCategoryLabel } from "@/hooks/useDealScores";

interface OpportunityTableViewProps {
  opportunities: Opportunity[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onOpportunityClick: (opportunity: Opportunity) => void;
  onMarkAsWon: (id: string) => void;
  onMarkAsLost: (id: string) => void;
  scoresMap?: Map<string, DealScore>;
}


export function OpportunityTableView({
  opportunities,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpportunityClick,
  onMarkAsWon,
  onMarkAsLost,
  scoresMap,
}: OpportunityTableViewProps) {
  const [scoreSortDir, setScoreSortDir] = useState<"asc" | "desc" | null>(null);

  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Ganho</Badge>;
      case "lost":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Perdido</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Aberto</Badge>;
    }
  };

  const getTemperatureColor = (temp: string | null) => {
    switch (temp) {
      case "hot": return "bg-red-500";
      case "warm": return "bg-amber-500";
      case "cold": return "bg-blue-500";
      default: return "bg-muted";
    }
  };

  const sortedOpportunities = scoreSortDir && scoresMap
    ? [...opportunities].sort((a, b) => {
        const sa = scoresMap.get(a.id)?.close_score ?? -1;
        const sb = scoresMap.get(b.id)?.close_score ?? -1;
        return scoreSortDir === "desc" ? sb - sa : sa - sb;
      })
    : opportunities;

  const allSelected = opportunities.length > 0 && selectedIds.length === opportunities.length;

  const handleScoreSort = () => {
    setScoreSortDir((prev) =>
      prev === null ? "desc" : prev === "desc" ? "asc" : null
    );
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Oportunidade</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-center">Prob.</TableHead>
            <TableHead className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs font-medium gap-1"
                onClick={handleScoreSort}
              >
                <ArrowUpDown className="w-3 h-3" />
                Score
                {scoreSortDir && (
                  <span className="text-primary">{scoreSortDir === "desc" ? "↓" : "↑"}</span>
                )}
              </Button>
            </TableHead>
            <TableHead>Data Fecho</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOpportunities.map((opp) => {
            const score = scoresMap?.get(opp.id);
            return (
              <TableRow
                key={opp.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  selectedIds.includes(opp.id) && "bg-muted/30"
                )}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(opp.id)}
                    onCheckedChange={() => onSelect(opp.id)}
                  />
                </TableCell>
                <TableCell 
                  className="font-medium" 
                  onClick={() => onOpportunityClick(opp)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", getTemperatureColor(opp.ai_temperature))} />
                    <span className="hover:text-primary">{opp.title}</span>
                    {opp.ai_next_action && (
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {opp.contact?.name || opp.lead?.name ? (
                    <div className="flex items-center gap-1 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {opp.contact?.name || opp.lead?.name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {opp.company?.name || opp.contact?.company ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {opp.company?.name || opp.contact?.company}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {opp.stage && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: opp.stage.color }}
                      />
                      <span className="text-sm">{opp.stage.name}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(opp.value), opp.currency)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {opp.probability}%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {score ? (
                    <div className="flex items-center justify-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold", getCategoryColors(score.category))}
                      >
                        {Math.round(score.close_score)} · {getCategoryLabel(score.category)}
                      </Badge>
                      {score.urgency === "critical" && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {opp.expected_close_date ? (
                    <span className="text-sm">
                      {format(new Date(opp.expected_close_date), "d MMM yyyy", { locale: pt })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(opp.status)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpportunityClick(opp)}>
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {opp.status === "open" && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onMarkAsWon(opp.id)}
                            className="text-green-600"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar como ganho
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onMarkAsLost(opp.id)}
                            className="text-red-600"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Marcar como perdido
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {opportunities.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                Nenhuma oportunidade encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

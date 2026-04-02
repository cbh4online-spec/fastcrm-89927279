import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MatchResolverRow } from "./MatchResolverRow";

interface ImportPreviewTableProps {
  rows: any[];
  onMatchUpdate: (rowId: string, productId: string) => void;
  workspaceId: string;
}

function matchMethodLabel(method: string | null): string {
  const labels: Record<string, string> = {
    exact_supplier_sku: "SKU Fornecedor",
    exact_barcode: "Barcode",
    exact_alias: "Alias",
    exact_internal_sku: "SKU Interno",
    exact_name: "Nome Exato",
    fuzzy_name: "Nome Fuzzy",
    manual: "Manual",
    locked_link_reuse: "Link Bloqueado",
  };
  return method ? labels[method] || method : "-";
}

function confidenceBadge(confidence: number | null) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const variant = pct >= 90 ? "default" : pct >= 70 ? "secondary" : "destructive";
  return <Badge variant={variant} className="text-[10px]">{pct}%</Badge>;
}

export function ImportPreviewTable({ rows, onMatchUpdate, workspaceId }: ImportPreviewTableProps) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground py-4">Sem linhas para mostrar.</p>;
  }

  return (
    <div className="border rounded-lg overflow-auto max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Produto / SKU</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead className="text-right">Preço Unit.</TableHead>
            <TableHead className="text-right">PVP</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Conf.</TableHead>
            <TableHead>Erro</TableHead>
            <TableHead>Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const norm = row.normalized_json || {};
            const hasPriceWarning = row.pricing_status === "warning";
            const isDuplicate = !!row.duplicate_key;

            return (
              <TableRow
                key={row.id}
                className={
                  row.error_text ? "bg-destructive/5" :
                  hasPriceWarning ? "bg-yellow-500/5" :
                  isDuplicate ? "bg-orange-500/5" : ""
                }
              >
                <TableCell className="text-xs text-muted-foreground">{row.row_index + 1}</TableCell>
                <TableCell className="text-sm font-medium max-w-[200px] truncate">
                  {norm.product_name || norm.supplier_sku || "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{norm.barcode || "-"}</TableCell>
                <TableCell className="text-right text-sm font-mono">
                  {row.computed_unit_price != null ? `€${Number(row.computed_unit_price).toFixed(2)}` : "-"}
                </TableCell>
                <TableCell className="text-right text-sm font-mono">
                  {row.computed_rrp_price != null ? `€${Number(row.computed_rrp_price).toFixed(2)}` : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    row.match_status === "matched" ? "default" :
                    row.match_status === "needs_review" ? "destructive" :
                    row.match_status === "unmatched" ? "secondary" : "outline"
                  }>
                    {row.match_status === "matched" ? "Associado" :
                     row.match_status === "needs_review" ? "Revisão" :
                     row.match_status === "unmatched" ? "Sem match" : row.match_status}
                  </Badge>
                  {isDuplicate && <Badge variant="outline" className="ml-1 text-[10px]">Dup</Badge>}
                  {hasPriceWarning && <Badge variant="outline" className="ml-1 text-[10px] text-yellow-600">Preço</Badge>}
                </TableCell>
                <TableCell className="text-xs">
                  {matchMethodLabel(row.match_method)}
                </TableCell>
                <TableCell>
                  {confidenceBadge(row.match_confidence)}
                </TableCell>
                <TableCell className="text-xs text-destructive max-w-[150px] truncate">
                  {row.error_text || row.validation_error_text || ""}
                </TableCell>
                <TableCell>
                  {(row.match_status === "unmatched" || row.match_status === "needs_review") && (
                    <MatchResolverRow
                      rowId={row.id}
                      productName={norm.product_name || ""}
                      workspaceId={workspaceId}
                      onMatch={onMatchUpdate}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MatchResolverRow } from "./MatchResolverRow";

interface ImportPreviewTableProps {
  rows: any[];
  onMatchUpdate: (rowId: string, productId: string) => void;
  workspaceId: string;
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
            <TableHead>Erro</TableHead>
            <TableHead>Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const norm = row.normalized_json || {};
            return (
              <TableRow key={row.id} className={row.error_text ? "bg-destructive/5" : ""}>
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
                    row.match_status === "needs_review" ? "destructive" : "secondary"
                  }>
                    {row.match_status === "matched" ? "Associado" :
                     row.match_status === "needs_review" ? "Erro" : "Sem match"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-destructive max-w-[150px] truncate">
                  {row.error_text || ""}
                </TableCell>
                <TableCell>
                  {row.match_status === "unmatched" && (
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

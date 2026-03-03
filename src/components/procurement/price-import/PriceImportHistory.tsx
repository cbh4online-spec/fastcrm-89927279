import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export function PriceImportHistory() {
  const { currentWorkspace } = useWorkspace();
  const [imports, setImports] = useState<any[]>([]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    supabase
      .from("supplier_price_imports" as any)
      .select("*, suppliers(name)")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setImports((data as any) || []));
  }, [currentWorkspace?.id]);

  if (!imports.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold mb-3">Histórico de Importações</h3>
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Ficheiro</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map((imp) => (
              <TableRow key={imp.id}>
                <TableCell className="text-sm">
                  {format(new Date(imp.created_at), "dd/MM/yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-sm">{(imp.suppliers as any)?.name || "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{imp.file_name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{imp.pricing_mode}</Badge></TableCell>
                <TableCell>
                  <Badge variant={imp.status === "committed" ? "default" : imp.status === "failed" ? "destructive" : "secondary"}>
                    {imp.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {imp.stats_json && typeof imp.stats_json === "object" ? (
                    <span>
                      {imp.stats_json.matched ?? imp.stats_json.total_matched ?? 0} matched / {imp.stats_json.total ?? imp.stats_json.errors ?? 0} total
                    </span>
                  ) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

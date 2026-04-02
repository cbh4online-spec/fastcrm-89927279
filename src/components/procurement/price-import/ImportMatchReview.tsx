import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportPreviewTable } from "./ImportPreviewTable";

interface ImportMatchReviewProps {
  previewRows: any[];
  stats: { total: number; matched: number; unmatched: number; errors: number; duplicates: number } | null;
  onMatchUpdate: (rowId: string, productId: string) => void;
  onFilterChange: (filter: string | undefined) => void;
  workspaceId: string;
}

export function ImportMatchReview({ previewRows, stats, onMatchUpdate, onFilterChange, workspaceId }: ImportMatchReviewProps) {
  const [tab, setTab] = useState("all");

  const handleTabChange = (value: string) => {
    setTab(value);
    const filterMap: Record<string, string | undefined> = {
      all: undefined,
      matched: "matched",
      unmatched: "unmatched",
      needs_review: "needs_review",
      duplicates: "duplicates",
      errors: "errors",
    };
    onFilterChange(filterMap[value]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Revisão de Matching</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              Todos <Badge variant="outline" className="ml-1 text-[10px]">{stats?.total ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="matched">
              Matched <Badge variant="outline" className="ml-1 text-[10px] bg-emerald-500/10">{stats?.matched ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unmatched">
              Sem Match <Badge variant="outline" className="ml-1 text-[10px]">{stats?.unmatched ?? 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="needs_review">
              Revisão <Badge variant="outline" className="ml-1 text-[10px] bg-yellow-500/10">{stats?.errors ?? 0}</Badge>
            </TabsTrigger>
            {(stats?.duplicates ?? 0) > 0 && (
              <TabsTrigger value="duplicates">
                Duplicados <Badge variant="outline" className="ml-1 text-[10px]">{stats?.duplicates ?? 0}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={tab} className="mt-0">
            <ImportPreviewTable
              rows={previewRows}
              onMatchUpdate={onMatchUpdate}
              workspaceId={workspaceId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

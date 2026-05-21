import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight } from "lucide-react";
import type { Workspace } from "@/contexts/WorkspaceContext";

interface Props {
  workspaces: Workspace[];
  onSelect: (id: string) => void;
}

export function ExistingWorkspacesList({ workspaces, onSelect }: Props) {
  if (!workspaces.length) return null;
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">As tuas organizações</div>
      <div className="space-y-2">
        {workspaces.map((w) => (
          <button
            type="button"
            key={w.id}
            onClick={() => onSelect(w.id)}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary hover:bg-accent/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{w.name}</div>
              <Badge variant="outline" className="capitalize mt-1">{w.role}</Badge>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

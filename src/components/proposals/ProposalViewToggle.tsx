import { Button } from "@/components/ui/button";
import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProposalViewToggleProps {
  viewMode: "internal" | "client";
  onChange: (mode: "internal" | "client") => void;
}

export function ProposalViewToggle({ viewMode, onChange }: ProposalViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
      <Button
        variant={viewMode === "internal" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("internal")}
        className={cn(
          "rounded-full h-7 px-3 text-xs",
          viewMode === "internal" && "bg-primary text-primary-foreground"
        )}
      >
        <Building2 className="h-3.5 w-3.5 mr-1.5" />
        Gestão
      </Button>
      <Button
        variant={viewMode === "client" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("client")}
        className={cn(
          "rounded-full h-7 px-3 text-xs",
          viewMode === "client" && "bg-primary text-primary-foreground"
        )}
      >
        <Users className="h-3.5 w-3.5 mr-1.5" />
        Documento
      </Button>
    </div>
  );
}

import { useActivePipeline } from "@/hooks/usePipelines";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";

interface PipelineSelectorProps {
  className?: string;
  showIcon?: boolean;
}

export function PipelineSelector({ className, showIcon = true }: PipelineSelectorProps) {
  const { activeId, setActiveId, pipelines } = useActivePipeline();

  if (!pipelines.length) return null;

  return (
    <Select value={activeId ?? undefined} onValueChange={setActiveId}>
      <SelectTrigger className={className ?? "h-9 w-[220px]"}>
        {showIcon && <GitBranch className="h-4 w-4 mr-2 text-muted-foreground" />}
        <SelectValue placeholder="Selecionar pipeline" />
      </SelectTrigger>
      <SelectContent>
        {pipelines.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2">
              <span>{p.name}</span>
              {p.is_default && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  padrão
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

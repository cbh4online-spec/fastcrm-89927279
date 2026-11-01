import { Link } from "react-router-dom";
import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRetainerBadge } from "@/hooks/useRetainers";

/** Mostra a avença a que o projeto/ticket está ligado, com ligação para ela. */
export function RetainerLinkBadge({ kind, id }: { kind: "project" | "ticket"; id?: string }) {
  const { data } = useRetainerBadge(kind, id);
  if (!data) return null;
  return (
    <Badge variant="outline" className="gap-1">
      <Timer className="h-3 w-3" aria-hidden />
      <Link to={`/dashboard/retainers/${data.id}`} className="hover:underline">Avença: {data.name}</Link>
    </Badge>
  );
}

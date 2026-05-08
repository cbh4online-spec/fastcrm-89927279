import { Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  potentialReferral?: boolean;
  potentialRecruitment?: boolean;
  className?: string;
}

export function LeadChefClientPotentialBadge({ potentialReferral, potentialRecruitment, className }: Props) {
  if (!potentialReferral && !potentialRecruitment) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {potentialReferral && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
          <Users className="h-3 w-3" /> Potencial referência
        </span>
      )}
      {potentialRecruitment && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
          <Sparkles className="h-3 w-3" /> Potencial recrutamento
        </span>
      )}
    </div>
  );
}

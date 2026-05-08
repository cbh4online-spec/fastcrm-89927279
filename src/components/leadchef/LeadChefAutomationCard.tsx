import { Switch } from "@/components/ui/switch";
import type { LeadChefAutomationRule } from "@/types/leadchefTemplates";
import type { LeadChefAutomationDefault } from "@/utils/leadchef/templates";

type RuleLike = LeadChefAutomationRule | (LeadChefAutomationDefault & { id?: string });

interface Props {
  rule: RuleLike;
  onToggle: (enabled: boolean) => void;
  isPending?: boolean;
}

export function LeadChefAutomationCard({ rule, onToggle, isPending }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
        {rule.description && (
          <p className="text-xs text-slate-600 mt-0.5">{rule.description}</p>
        )}
        <p className="text-[11px] text-slate-400 mt-2">
          Trigger: {rule.trigger_type} · Ação: {rule.action_type}
        </p>
      </div>
      <Switch
        checked={Boolean(rule.is_enabled)}
        onCheckedChange={onToggle}
        disabled={isPending}
      />
    </div>
  );
}

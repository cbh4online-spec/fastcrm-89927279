import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEADCHEF_TEMPLATE_CATEGORY_LABELS } from "@/utils/leadchef/templates";
import type { LeadChefMessageTemplate } from "@/types/leadchefTemplates";

interface Props {
  templates: LeadChefMessageTemplate[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  preferredCategory?: string;
}

export function LeadChefMessageTemplatePicker({
  templates, selectedId, onChange, preferredCategory,
}: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, LeadChefMessageTemplate[]>();
    for (const t of templates) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    // Reorder to put preferred category first
    const entries = Array.from(map.entries());
    if (preferredCategory) {
      entries.sort((a, b) =>
        a[0] === preferredCategory ? -1 : b[0] === preferredCategory ? 1 : 0
      );
    }
    return entries;
  }, [templates, preferredCategory]);

  return (
    <Select value={selectedId ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Escolher template" />
      </SelectTrigger>
      <SelectContent className="max-h-[60vh]">
        <SelectItem value="__none__">Sem template (escrever do zero)</SelectItem>
        {grouped.map(([cat, items]) => (
          <div key={cat} className="py-1">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-slate-400">
              {LEADCHEF_TEMPLATE_CATEGORY_LABELS[cat as keyof typeof LEADCHEF_TEMPLATE_CATEGORY_LABELS] ?? cat}
            </p>
            {items.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

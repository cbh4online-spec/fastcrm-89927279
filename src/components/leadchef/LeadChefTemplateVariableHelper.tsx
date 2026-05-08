import { LEADCHEF_TEMPLATE_VARIABLES, LEADCHEF_TEMPLATE_VARIABLE_LABELS } from "@/utils/leadchef/templateRenderer";

interface Props {
  onInsert: (v: string) => void;
}

export function LeadChefTemplateVariableHelper({ onInsert }: Props) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-700 mb-2">Variáveis disponíveis</p>
      <div className="flex flex-wrap gap-1.5">
        {LEADCHEF_TEMPLATE_VARIABLES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(v)}
            className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700"
            title={LEADCHEF_TEMPLATE_VARIABLE_LABELS[v]}
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

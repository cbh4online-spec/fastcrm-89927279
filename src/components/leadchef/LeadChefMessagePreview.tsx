interface Props {
  text: string;
}

export function LeadChefMessagePreview({ text }: Props) {
  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
      <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wide mb-1">
        Pré-visualização
      </p>
      <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">
        {text || <span className="italic text-slate-400">Sem conteúdo</span>}
      </p>
    </div>
  );
}

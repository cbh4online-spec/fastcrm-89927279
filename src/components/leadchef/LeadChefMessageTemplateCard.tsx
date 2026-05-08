import { Pencil, Copy, Power, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LEADCHEF_TEMPLATE_CATEGORY_LABELS } from "@/utils/leadchef/templates";
import type { LeadChefMessageTemplate } from "@/types/leadchefTemplates";

interface Props {
  template: LeadChefMessageTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete?: () => void;
}

export function LeadChefMessageTemplateCard({
  template, onEdit, onDuplicate, onToggleActive, onDelete,
}: Props) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{template.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px]">
              {LEADCHEF_TEMPLATE_CATEGORY_LABELS[template.category] ?? template.category}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">
              {template.channel}
            </Badge>
            {template.is_default && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">
                Padrão
              </Badge>
            )}
            {!template.is_active && (
              <Badge variant="outline" className="text-[10px] text-slate-500">
                Inativo
              </Badge>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-600 line-clamp-3 whitespace-pre-line">
        {template.body}
      </p>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicar
        </Button>
        <Button size="sm" variant="outline" onClick={onToggleActive}>
          <Power className="h-3.5 w-3.5 mr-1.5" />
          {template.is_active ? "Desativar" : "Ativar"}
        </Button>
        {onDelete && !template.is_default && (
          <Button size="sm" variant="ghost" className="text-rose-600" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}

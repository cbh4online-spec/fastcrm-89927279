import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { LeadChefMobileShell } from "@/components/leadchef/LeadChefMobileShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { LeadChefMessageTemplateCard } from "@/components/leadchef/LeadChefMessageTemplateCard";
import { LeadChefAutoPostDemoSettings } from "@/components/leadchef/LeadChefAutoPostDemoSettings";
import { LeadChefMessageTemplateEditorSheet } from "@/components/leadchef/LeadChefMessageTemplateEditorSheet";
import { LeadChefTemplatesEmptyState } from "@/components/leadchef/LeadChefTemplatesEmptyState";
import { useLeadChefMessageTemplates } from "@/hooks/leadchef/useLeadChefMessageTemplates";
import { useUpdateLeadChefMessageTemplate } from "@/hooks/leadchef/useUpdateLeadChefMessageTemplate";
import { useCreateLeadChefMessageTemplate } from "@/hooks/leadchef/useCreateLeadChefMessageTemplate";
import { useDeleteLeadChefMessageTemplate } from "@/hooks/leadchef/useDeleteLeadChefMessageTemplate";
import { useInstallLeadChefDefaultTemplates } from "@/hooks/leadchef/useInstallLeadChefDefaultTemplates";
import {
  LEADCHEF_TEMPLATE_CATEGORIES,
  LEADCHEF_TEMPLATE_CATEGORY_LABELS,
} from "@/utils/leadchef/templates";
import type { LeadChefMessageTemplate } from "@/types/leadchefTemplates";

export default function LeadChefTemplatesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LeadChefMessageTemplate | null>(null);

  const { data: templates = [], isLoading, isError } = useLeadChefMessageTemplates({
    search,
    category: category === "all" ? undefined : category,
  });

  const update = useUpdateLeadChefMessageTemplate();
  const create = useCreateLeadChefMessageTemplate();
  const del = useDeleteLeadChefMessageTemplate();
  const install = useInstallLeadChefDefaultTemplates();

  const grouped = useMemo(() => {
    const m = new Map<string, LeadChefMessageTemplate[]>();
    for (const t of templates) {
      const arr = m.get(t.category) ?? [];
      arr.push(t);
      m.set(t.category, arr);
    }
    return Array.from(m.entries());
  }, [templates]);

  const onEdit = (t: LeadChefMessageTemplate) => {
    setEditing(t);
    (window as any).__lcLastTplId = null;
    setEditorOpen(true);
  };

  const onNew = () => {
    setEditing(null);
    (window as any).__lcLastTplId = null;
    setEditorOpen(true);
  };

  const onDuplicate = async (t: LeadChefMessageTemplate) => {
    const copy = await create.mutateAsync({
      name: `${t.name} (cópia)`,
      category: t.category,
      channel: t.channel,
      body: t.body,
      is_active: true,
    });
    if (copy) {
      setEditing(copy as LeadChefMessageTemplate);
      (window as any).__lcLastTplId = null;
      setEditorOpen(true);
    }
  };

  return (
    <LeadChefMobileShell title="Templates" subtitle="Mensagens rápidas para WhatsApp e follow-up.">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome ou conteúdo…"
            className="pl-9"
          />
        </div>
        <Button onClick={onNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {LEADCHEF_TEMPLATE_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>{LEADCHEF_TEMPLATE_CATEGORY_LABELS[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-600">
          Não foi possível carregar os templates.
        </div>
      ) : templates.length === 0 ? (
        <LeadChefTemplatesEmptyState
          onInstallDefaults={() => install.mutate()}
          isInstalling={install.isPending}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <section key={cat} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">
                {LEADCHEF_TEMPLATE_CATEGORY_LABELS[cat as keyof typeof LEADCHEF_TEMPLATE_CATEGORY_LABELS] ?? cat}
              </h2>
              {items.map((t) => (
                <LeadChefMessageTemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => onEdit(t)}
                  onDuplicate={() => onDuplicate(t)}
                  onToggleActive={() =>
                    update.mutate({ id: t.id, is_active: !t.is_active })
                  }
                  onDelete={() => {
                    if (confirm("Eliminar este template?")) del.mutate(t.id);
                  }}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      <LeadChefMessageTemplateEditorSheet
        open={editorOpen}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) (window as any).__lcLastTplId = null;
        }}
        template={editing}
      />
    </LeadChefMobileShell>
  );
}

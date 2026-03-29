import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEbookTemplates, useUpdateEbookTemplate, useDuplicateEbookTemplate } from "@/hooks/useEbookTemplates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Copy, Eye, EyeOff, ArrowLeft, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CATEGORY_LABELS } from "@/types/ebook-templates";
import type { EbookTemplate } from "@/types/ebook-templates";
import { TemplatePreviewModal } from "@/components/ebooks/templates/TemplatePreviewModal";

export default function EbookTemplatesAdminPage() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useEbookTemplates();
  const updateTemplate = useUpdateEbookTemplate();
  const duplicateTemplate = useDuplicateEbookTemplate();
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<EbookTemplate | null>(null);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/ebooks")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                Gestão de Templates
              </h1>
              <p className="text-sm text-muted-foreground">{templates.length} templates disponíveis</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border border-border/40 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Template</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Categoria</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Páginas</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Estado</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {[t.style_tokens.primaryColor, t.style_tokens.accentColor].map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-full border border-border/30" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[t.category] || t.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.page_layouts.length}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.is_system_template ? "secondary" : "outline"} className="text-[10px]">
                        {t.is_system_template ? "Sistema" : "Workspace"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px]">
                        {t.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewTemplate(t)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTemplate.mutate(t.id)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {!t.is_system_template && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateTemplate.mutate({ id: t.id, is_active: !t.is_active })}
                          >
                            {t.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TemplatePreviewModal
          template={previewTemplate}
          open={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => {}}
          onDuplicate={(tmpl) => duplicateTemplate.mutate(tmpl.id)}
        />
      </div>
    </DashboardLayout>
  );
}

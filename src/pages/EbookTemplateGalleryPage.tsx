import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEbookTemplates, useDuplicateEbookTemplate } from "@/hooks/useEbookTemplates";
import { useCreateEbook } from "@/hooks/useEbooks";
import { useBulkCreateEbookPages } from "@/hooks/useEbookPages";
import { TemplateCard } from "@/components/ebooks/templates/TemplateCard";
import { TemplateGalleryFilters } from "@/components/ebooks/templates/TemplateGalleryFilters";
import { TemplatePreviewModal } from "@/components/ebooks/templates/TemplatePreviewModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import type { EbookTemplate, LayoutKey } from "@/types/ebook-templates";

export default function EbookTemplateGalleryPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EbookTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: templates = [], isLoading } = useEbookTemplates(
    selectedCategory ? { category: selectedCategory } : undefined
  );
  const createEbook = useCreateEbook();
  const bulkCreatePages = useBulkCreateEbookPages();
  const duplicateTemplate = useDuplicateEbookTemplate();

  const filtered = templates.filter(t => {
    if (selectedUseCase && !t.use_cases.includes(selectedUseCase)) return false;
    return true;
  });

  const handleUseTemplate = async (template: EbookTemplate) => {
    setCreating(true);
    try {
      const ebook = await createEbook.mutateAsync({
        title: template.default_content.bookTitle || template.name,
        subtitle: template.default_content.subTitle,
        author_name: template.default_content.authorName,
      });

      const pages = template.page_layouts.map((layoutKey, i) => ({
        ebook_id: ebook.id,
        page_order: i,
        page_type: layoutKey.includes("cover") ? "cover" : layoutKey.includes("chapter") ? "chapter" : "content",
        layout_key: layoutKey as LayoutKey,
        content: template.default_content as Record<string, unknown>,
        is_locked: false,
      }));

      await bulkCreatePages.mutateAsync(pages);

      const { supabase } = await import("@/integrations/supabase/client");
      await (supabase as any).from("ebooks").update({
        template_id: template.id,
        global_styles: template.style_tokens,
      }).eq("id", ebook.id);

      toast.success("eBook criado a partir do template!");
      navigate("/dashboard/ebooks");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Galeria de Templates"
          description="Escolha um template para começar o seu eBook"
          count={filtered.length}
          actions={[
            {
              label: "Voltar",
              icon: <ArrowLeft className="h-4 w-4" />,
              onClick: () => navigate("/dashboard/ebooks"),
              variant: "ghost",
            },
          ]}
        />

        {/* Filters */}
        <TemplateGalleryFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedUseCase={selectedUseCase}
          onUseCaseChange={setSelectedUseCase}
        />

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum template encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onPreview={setPreviewTemplate}
                onUse={handleUseTemplate}
                onDuplicate={(tmpl) => duplicateTemplate.mutate(tmpl.id)}
              />
            ))}
          </div>
        )}

        {creating && (
          <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">A criar eBook...</p>
            </div>
          </div>
        )}

        <TemplatePreviewModal
          template={previewTemplate}
          open={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={handleUseTemplate}
          onDuplicate={(tmpl) => duplicateTemplate.mutate(tmpl.id)}
        />
      </div>
    </DashboardLayout>
  );
}

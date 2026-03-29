import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EbooksList } from "@/components/ebooks/EbooksList";
import { EbookEditor } from "@/components/ebooks/EbookEditor";
import { EbookWizard } from "@/components/ebooks/EbookWizard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BookOpen, Sparkles, LayoutGrid, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function EbooksPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <DashboardLayout>
      {showWizard ? (
        <EbookWizard
          onComplete={(id) => { setShowWizard(false); setSelectedId(id); }}
          onCancel={() => setShowWizard(false)}
        />
      ) : selectedId ? (
        <EbookEditor ebookId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <>
          <EbooksList
            onSelectEbook={setSelectedId}
            onOpenWizard={() => setShowCreateModal(true)}
          />

          {/* Create eBook modal — choose method */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="max-w-lg">
              <h2 className="text-lg font-semibold text-foreground">Criar novo eBook</h2>
              <p className="text-sm text-muted-foreground">Escolha como quer começar</p>
              <div className="grid grid-cols-1 gap-3 mt-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 justify-start gap-4 text-left"
                  onClick={() => {
                    setShowCreateModal(false);
                    navigate("/dashboard/ebooks/templates");
                  }}
                >
                  <LayoutGrid className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <span className="font-medium text-sm">Usar Template</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Escolha entre templates profissionais pré-desenhados</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 justify-start gap-4 text-left"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowWizard(true);
                  }}
                >
                  <Sparkles className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <span className="font-medium text-sm">Assistente IA</span>
                    <p className="text-xs text-muted-foreground mt-0.5">A IA gera a estrutura e conteúdo do eBook</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 justify-start gap-4 text-left"
                  onClick={() => {
                    setShowCreateModal(false);
                    // Quick create blank
                    import("@/hooks/useEbooks").then(({ useCreateEbook }) => {
                      // handled by EbooksList which already has blank create
                    });
                    setShowWizard(false);
                    setSelectedId(null);
                  }}
                >
                  <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-medium text-sm">Do Zero</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Comece com um eBook em branco</p>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </DashboardLayout>
  );
}

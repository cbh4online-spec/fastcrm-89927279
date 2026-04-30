import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Trash2, ArrowRight, Clock, ScanText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

type DraftRow = {
  id: string;
  file_name: string | null;
  file_type: string | null;
  processing_status: string | null;
  wizard_last_saved_at: string | null;
  created_at: string;
  wizard_state: { step?: number; sheet?: { name?: string } } | null;
};

export default function ProductOCRDrafts() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_ocr_documents")
      .select("id, file_name, file_type, processing_status, wizard_last_saved_at, created_at, wizard_state")
      .eq("workspace_id", currentWorkspace.id)
      .is("product_id", null)
      .order("wizard_last_saved_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Não foi possível carregar rascunhos.");
      console.error(error);
    } else {
      setRows((data ?? []) as unknown as DraftRow[]);
    }
    setLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Eliminar este rascunho? Esta ação é irreversível.")) return;
    const { error } = await supabase.from("product_ocr_documents").delete().eq("id", id);
    if (error) {
      toast.error("Falha ao eliminar.");
    } else {
      toast.success("Rascunho eliminado.");
      setRows((r) => r.filter((x) => x.id !== id));
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Rascunhos OCR de Produtos | FastCRM</title>
      </Helmet>
      <div className="container mx-auto py-6 px-4 max-w-5xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rascunhos OCR</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Documentos cuja criação de produto ficou por concluir. Recupera o trabalho sem voltar a gastar créditos.
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard/products/ocr-create")} className="gap-2">
            <ScanText className="h-4 w-4" /> Novo OCR
          </Button>
        </header>

        {loading ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">A carregar…</Card>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Sem rascunhos pendentes</p>
            <p className="text-sm text-muted-foreground mt-1">Quando começares uma criação por OCR e a interromperes, aparece aqui.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const ts = r.wizard_last_saved_at ?? r.created_at;
              const step = r.wizard_state?.step ?? 1;
              const guessName = r.wizard_state?.sheet?.name || r.file_name || "Documento sem nome";
              return (
                <Card key={r.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{guessName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary">Passo {step}/6</Badge>
                        {r.processing_status && (
                          <Badge variant="outline" className="text-xs">{r.processing_status}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          guardado {formatDistanceToNow(new Date(ts), { locale: pt, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/dashboard/products/ocr-create?doc=${r.id}`)}
                      className="gap-1"
                    >
                      Continuar <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Eliminar rascunho">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

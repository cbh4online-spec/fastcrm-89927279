import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SaftExportTab() {
  const { currentWorkspace } = useWorkspace();
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!currentWorkspace?.id) return;
    setIsExporting(true);

    try {
      const { data, error } = await supabase.functions.invoke("saft-export", {
        body: {
          workspaceId: currentWorkspace.id,
          startDate,
          endDate,
        },
      });

      if (error) throw error;

      // data is the XML string
      let xmlContent: string;
      if (typeof data === "string") {
        xmlContent = data;
      } else if (data instanceof Blob) {
        xmlContent = await data.text();
      } else {
        xmlContent = JSON.stringify(data);
      }

      // Download as XML file
      const blob = new Blob([xmlContent], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SAFT-PT_${startDate}_${endDate}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Ficheiro SAF-T exportado com sucesso");
    } catch (err) {
      toast.error("Erro na exportação: " + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportação SAF-T (PT)
          </CardTitle>
          <CardDescription>
            Gere o ficheiro SAF-T para comunicação à Autoridade Tributária portuguesa.
            O ficheiro inclui todos os documentos emitidos (exceto rascunhos) no período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Formato: SAF-T PT v1.04_01 (Portaria nº 302/2016)
            </span>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting || !startDate || !endDate}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar SAF-T
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

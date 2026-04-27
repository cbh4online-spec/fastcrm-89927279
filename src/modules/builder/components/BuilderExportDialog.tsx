import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Download, FileCode2, Package } from "lucide-react";
import { toast } from "sonner";
import {
  exportAssetAsHtml,
  exportAssetAsZip,
  triggerBlobDownload,
  type ExportZipOptions,
} from "../lib/exportZip";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  html: string;
}

type Mode = "html" | "zip";

export function BuilderExportDialog({ open, onOpenChange, name, html }: Props) {
  const [mode, setMode] = useState<Mode>("zip");
  const [assetMode, setAssetMode] = useState<ExportZipOptions["assetMode"]>("download");
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      if (mode === "html") {
        const { blob, filename } = exportAssetAsHtml(name, html);
        triggerBlobDownload(blob, filename);
        toast.success("HTML exportado", { description: filename });
      } else {
        const result = await exportAssetAsZip({ name, html, assetMode });
        triggerBlobDownload(result.blob, result.filename);
        const sizeKb = (result.totalBytes / 1024).toFixed(1);
        const detail =
          assetMode === "keep"
            ? `${result.filename} · ${sizeKb} KB`
            : `${result.filename} · ${sizeKb} KB · ${result.assetsProcessed} assets${
                result.assetsFailed > 0 ? ` (${result.assetsFailed} falharam)` : ""
              }`;
        toast.success("ZIP exportado", { description: detail });
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("Falha ao exportar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar asset</DialogTitle>
          <DialogDescription>
            Faz download do HTML ou de um pacote ZIP estático para alojares onde quiseres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Formato</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid grid-cols-2 gap-2 mt-2">
              <label
                className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === "html" ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value="html" className="mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <FileCode2 className="h-3.5 w-3.5" /> HTML único
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Um só ficheiro <code>.html</code> standalone.
                  </p>
                </div>
              </label>
              <label
                className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  mode === "zip" ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value="zip" className="mt-0.5" />
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    <Package className="h-3.5 w-3.5" /> Pacote ZIP
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    HTML + opção de embutir assets externos.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {mode === "zip" && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assets externos</Label>
              <RadioGroup
                value={assetMode}
                onValueChange={(v) => setAssetMode(v as ExportZipOptions["assetMode"])}
                className="space-y-2 mt-2"
              >
                <label className="flex items-start gap-2 p-2.5 rounded-md border cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value="keep" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Manter URLs</div>
                    <p className="text-xs text-muted-foreground">
                      Imagens e fontes ficam apontadas aos URLs originais. Mais rápido, exige rede.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2.5 rounded-md border cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value="download" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Descarregar para /assets</div>
                    <p className="text-xs text-muted-foreground">
                      Imagens e fontes são descarregadas para uma pasta dentro do ZIP. Auto-suficiente e organizado.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2.5 rounded-md border cursor-pointer hover:bg-muted/40">
                  <RadioGroupItem value="inline" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Embutir em data-URL</div>
                    <p className="text-xs text-muted-foreground">
                      Tudo num só HTML (ZIP só com 1 ficheiro). Pode ficar grande.
                    </p>
                  </div>
                </label>
              </RadioGroup>
              <p className="text-[11px] text-muted-foreground mt-2">
                Limite de 5 MB por asset. Recursos com CORS bloqueado serão saltados (ficam como URL).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

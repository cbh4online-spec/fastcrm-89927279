import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  onFile: (file: File) => void;
  uploading?: boolean;
}

export function SafTUploader({ onFile, uploading }: Props) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xml")) {
      alert("O ficheiro deve ser um XML SAF-T PT.");
      return;
    }
    setFile(f);
    onFile(f);
  }, [onFile]);

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-colors ${drag ? "border-primary bg-primary/5" : "border-border"}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFile(e.dataTransfer.files?.[0] ?? null);
      }}
    >
      <div className="flex flex-col items-center text-center gap-3">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Arraste o ficheiro SAF-T PT (.xml) para aqui</p>
          <p className="text-sm text-muted-foreground">ou clique para selecionar (máx. 50 MB)</p>
        </div>
        <input
          id="saft-file"
          type="file"
          accept=".xml,application/xml,text/xml"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <Button asChild variant="outline" disabled={uploading}>
          <label htmlFor="saft-file" className="cursor-pointer">Escolher ficheiro</label>
        </Button>

        {file && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span>{file.name}</span>
            <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

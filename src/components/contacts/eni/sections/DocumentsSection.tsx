import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Upload, Trash2, Download, Plus, File, Calendar } from "lucide-react";
import { useContactDocuments } from "../useContactData";
import { DOCUMENT_TYPES, ContactDocument } from "../ENIContactTypes";
import { cn } from "@/lib/utils";

interface DocumentsSectionProps {
  contactId: string;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsSection({ contactId }: DocumentsSectionProps) {
  const { documents, isLoading, uploadDocument, deleteDocument } = useContactDocuments(contactId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!documentType) {
        // Auto-detect type based on extension
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "pdf") setDocumentType("Contrato");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) return;
    
    await uploadDocument.mutateAsync({
      file: selectedFile,
      documentType,
      notes: notes || undefined,
    });

    setIsDialogOpen(false);
    setSelectedFile(null);
    setDocumentType("");
    setNotes("");
  };

  const handleDelete = async (docId: string) => {
    await deleteDocument.mutateAsync(docId);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Documentos
            </CardTitle>
            <CardDescription>Contratos, acordos e comprovativos.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ficheiro *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {selectedFile ? selectedFile.name : "Selecionar ficheiro"}
                  </Button>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas sobre o documento..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={!selectedFile || !documentType || uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? "A carregar..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem documentos</p>
            <p className="text-xs">Clique em Adicionar para carregar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentRow key={doc.id} document={doc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentRow({ 
  document, 
  onDelete 
}: { 
  document: ContactDocument; 
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{document.file_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {document.document_type}
            </Badge>
            <span>{formatFileSize(document.file_size)}</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(document.created_at).toLocaleDateString("pt-PT")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {document.file_url && (
          <Button variant="ghost" size="icon" asChild>
            <a href={document.file_url} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Documento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza? O ficheiro será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(document.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

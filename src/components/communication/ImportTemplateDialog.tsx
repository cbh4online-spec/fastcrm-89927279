import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { name: string; subject: string; body: string }) => void;
}

export function ImportTemplateDialog({ open, onOpenChange, onImport }: ImportTemplateDialogProps) {
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName('');
    setName('');
    setSubject('');
    setBody('');
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const baseName = file.name.replace(/\.(docx|txt|md)$/i, '');
    setName(baseName);
    setSubject(`${baseName}`);

    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const text = await file.text();
      setBody(text);
    } else {
      // For docx, read as text (basic extraction)
      const text = await file.text();
      // Try to extract readable content; if binary, show message
      if (text.includes('word/document.xml')) {
        setBody('⚠️ Ficheiro DOCX detectado. Cole o conteúdo do template abaixo manualmente, ou use um ficheiro .txt.');
      } else {
        setBody(text);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    onImport({ name, subject, body });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Template</DialogTitle>
          <DialogDescription>
            Carregue um ficheiro .txt ou cole o conteúdo do template para pré-preencher o formulário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!fileName ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              )}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste um ficheiro .txt ou clique para selecionar
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{fileName}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="import-name">Nome do Template</Label>
            <Input
              id="import-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pedido de Documentação"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="import-subject">Assunto</Label>
            <Input
              id="import-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="import-body">Conteúdo</Label>
            <Textarea
              id="import-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Cole aqui o conteúdo do template..."
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!name || !body}>
              Importar e Editar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Upload, Trash2, Download, Plus, File, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  'Contrato', 'Proposta', 'Fatura', 'Relatório', 'Certificado',
  'Apresentação', 'Manual', 'Licença', 'NDA', 'Outro',
];

interface EntityDocument {
  id: string;
  entity_type: string;
  entity_id: string;
  workspace_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useEntityDocuments(entityType: string, entityId: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const queryKey = ['entity-documents', entityType, entityId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('entity_documents' as any)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EntityDocument[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const upload = useMutation({
    mutationFn: async ({ file, documentType, notes }: { file: File; documentType: string; notes?: string }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const filePath = `${currentWorkspace.id}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('entity-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('entity-documents')
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('entity_documents' as any)
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          workspace_id: currentWorkspace.id,
          document_type: documentType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          notes: notes || null,
          uploaded_by: user?.id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Documento carregado com sucesso');
    },
    onError: () => toast.error('Erro ao carregar documento'),
  });

  const remove = useMutation({
    mutationFn: async (doc: EntityDocument) => {
      if (doc.file_url) {
        const path = doc.file_url.split('/entity-documents/')[1];
        if (path) await supabase.storage.from('entity-documents').remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase
        .from('entity_documents' as any)
        .delete()
        .eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Documento eliminado');
    },
    onError: () => toast.error('Erro ao eliminar documento'),
  });

  return { documents: query.data || [], isLoading: query.isLoading, upload, remove };
}

interface EntityDocumentsSectionProps {
  entityType: string;
  entityId: string;
}

export function EntityDocumentsSection({ entityType, entityId }: EntityDocumentsSectionProps) {
  const { documents, isLoading, upload, remove } = useEntityDocuments(entityType, entityId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!selectedFile || !documentType) return;
    await upload.mutateAsync({ file: selectedFile, documentType, notes: notes || undefined });
    setIsDialogOpen(false);
    setSelectedFile(null);
    setDocumentType('');
    setNotes('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Ficheiros
            </CardTitle>
            <CardDescription>Documentos e ficheiros associados</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de documento *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ficheiro *</Label>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }} className="hidden" />
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    {selectedFile ? selectedFile.name : 'Selecionar ficheiro'}
                  </Button>
                  {selectedFile && <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o documento" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpload} disabled={!selectedFile || !documentType || upload.isPending}>
                  {upload.isPending ? 'A carregar...' : 'Adicionar'}
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
            <p className="text-xs">Clique em Adicionar para carregar ficheiros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {doc.file_url && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
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
                        <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
                        <AlertDialogDescription>Tem a certeza que deseja eliminar este documento? Esta ação é irreversível.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(doc)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

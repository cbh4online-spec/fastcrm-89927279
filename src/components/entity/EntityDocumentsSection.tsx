import { useState, useRef, useMemo } from 'react';
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
import { FileText, Upload, Trash2, Download, Plus, File, Calendar, FolderPlus, Folder, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  folder: string | null;
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
    mutationFn: async ({ file, documentType, notes, folder }: { file: File; documentType: string; notes?: string; folder?: string | null }) => {
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
          folder: folder || null,
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

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
const PDF_EXTENSIONS = ['pdf'];
const PREVIEWABLE_EXTENSIONS = [...IMAGE_EXTENSIONS, ...PDF_EXTENSIONS];

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function DocumentRow({ doc, remove }: { doc: EntityDocument; remove: (doc: EntityDocument) => void }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const ext = getFileExtension(doc.file_name);
  const isPreviewable = PREVIEWABLE_EXTENSIONS.includes(ext);
  const isImage = IMAGE_EXTENSIONS.includes(ext);
  const isPdf = PDF_EXTENSIONS.includes(ext);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
          {isPreviewable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewOpen(!previewOpen)}
              title={previewOpen ? 'Fechar pré-visualização' : 'Pré-visualizar'}
            >
              {previewOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
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
                <AlertDialogAction onClick={() => remove(doc)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {previewOpen && doc.file_url && (
        <div className="mt-1 mx-3 mb-2 rounded-lg border border-border overflow-hidden bg-background">
          {isImage && (
            <img
              src={doc.file_url}
              alt={doc.file_name}
              className="max-h-[300px] w-full object-contain rounded-lg"
            />
          )}
          {isPdf && (
            <iframe
              src={doc.file_url}
              title={doc.file_name}
              className="w-full h-[400px] rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  );
}

function FolderGroup({ folderName, docs, remove }: { folderName: string; docs: EntityDocument[]; remove: (doc: EntityDocument) => void }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <Folder className="h-4 w-4 text-amber-500" />
        <span className="text-foreground">{folderName}</span>
        <span className="text-xs text-muted-foreground ml-auto">{docs.length} {docs.length === 1 ? 'ficheiro' : 'ficheiros'}</span>
      </button>
      {open && (
        <div className="pl-6 space-y-1">
          {docs.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} remove={(d) => remove(d)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface EntityDocumentsSectionProps {
  entityType: string;
  entityId: string;
}

export function EntityDocumentsSection({ entityType, entityId }: EntityDocumentsSectionProps) {
  const { documents, isLoading, upload, remove } = useEntityDocuments(entityType, entityId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive existing folders from documents
  const existingFolders = useMemo(() => {
    const folders = new Set<string>();
    documents.forEach(d => { if (d.folder) folders.add(d.folder); });
    return Array.from(folders).sort();
  }, [documents]);

  // Group documents
  const { rootDocs, folderGroups } = useMemo(() => {
    const root: EntityDocument[] = [];
    const groups: Record<string, EntityDocument[]> = {};
    documents.forEach(doc => {
      if (doc.folder) {
        if (!groups[doc.folder]) groups[doc.folder] = [];
        groups[doc.folder].push(doc);
      } else {
        root.push(doc);
      }
    });
    return { rootDocs: root, folderGroups: groups };
  }, [documents]);

  // Also include "empty" folders created via dialog (stored locally)
  const [localFolders, setLocalFolders] = useState<string[]>([]);
  const allFolderNames = useMemo(() => {
    const set = new Set([...existingFolders, ...localFolders]);
    return Array.from(set).sort();
  }, [existingFolders, localFolders]);

  const handleUpload = async () => {
    if (!selectedFile || !documentType) return;
    const folder = selectedFolder && selectedFolder !== '__root__' ? selectedFolder : undefined;
    await upload.mutateAsync({ file: selectedFile, documentType, notes: notes || undefined, folder });
    setIsDialogOpen(false);
    setSelectedFile(null);
    setDocumentType('');
    setNotes('');
    setSelectedFolder('');
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    setLocalFolders(prev => [...prev, folderName.trim()]);
    setFolderName('');
    setIsFolderDialogOpen(false);
    toast.success('Pasta criada');
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
          <div className="flex items-center gap-2">
            {/* Create Folder Dialog */}
            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <FolderPlus className="h-4 w-4" /> Pasta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Criar Pasta</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label>Nome da pasta</Label>
                  <Input
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Ex: Contratos 2026"
                    className="mt-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Upload Dialog */}
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
                  {allFolderNames.length > 0 && (
                    <div className="space-y-2">
                      <Label>Pasta destino</Label>
                      <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                        <SelectTrigger><SelectValue placeholder="Raiz (sem pasta)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__root__">Raiz (sem pasta)</SelectItem>
                          {allFolderNames.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 && localFolders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sem documentos</p>
            <p className="text-xs">Clique em Adicionar para carregar ficheiros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Folders */}
            {allFolderNames.map((fname) => {
              const docs = folderGroups[fname] || [];
              return <FolderGroup key={fname} folderName={fname} docs={docs} remove={(d) => remove.mutate(d)} />;
            })}
            {/* Root files */}
            {rootDocs.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} remove={(d) => remove.mutate(d)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

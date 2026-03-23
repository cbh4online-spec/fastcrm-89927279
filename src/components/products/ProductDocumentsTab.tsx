import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileText,
  BookOpen,
  Award,
  Video,
  Box,
  Upload,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  File,
  Globe,
  Lock,
  ExternalLink,
} from "lucide-react";

interface ProductDocumentsTabProps {
  product: {
    id: string;
    name: string;
    workspace_id: string;
  };
}

type DocType = "datasheet" | "manual" | "certificate" | "video" | "cad_file" | "other";
type Visibility = "internal" | "public";

const docTypeConfig: Record<DocType, { label: string; icon: typeof FileText; color: string }> = {
  datasheet: { label: "Ficha Técnica", icon: FileText, color: "text-blue-600" },
  manual: { label: "Manual", icon: BookOpen, color: "text-green-600" },
  certificate: { label: "Certificado", icon: Award, color: "text-amber-600" },
  video: { label: "Vídeo", icon: Video, color: "text-purple-600" },
  cad_file: { label: "Ficheiro CAD", icon: Box, color: "text-orange-600" },
  other: { label: "Outro", icon: File, color: "text-muted-foreground" },
};

const languageOptions = [
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
  { value: "de", label: "Alemão" },
  { value: "it", label: "Italiano" },
];

const allDocTypes: DocType[] = ["datasheet", "manual", "certificate", "video", "cad_file", "other"];

export function ProductDocumentsTab({ product }: ProductDocumentsTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newDocType, setNewDocType] = useState<DocType>("datasheet");
  const [newLanguage, setNewLanguage] = useState("pt");
  const [newVersion, setNewVersion] = useState("1.0");
  const [newVisibility, setNewVisibility] = useState<Visibility>("internal");
  const [newName, setNewName] = useState("");

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["product-documents", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_documents")
        .select("*")
        .eq("product_id", product.id)
        .order("type")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  // Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${product.workspace_id}/${product.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("product-documents")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-documents")
        .getPublicUrl(path);

      const docName = newName.trim() || file.name.replace(`.${ext}`, "");

      const { error: insertError } = await supabase
        .from("product_documents")
        .insert({
          workspace_id: product.workspace_id,
          product_id: product.id,
          type: newDocType,
          name: docName,
          url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          language: newLanguage,
          version: newVersion,
          visibility: newVisibility,
          sort_order: documents.filter((d: any) => d.type === newDocType).length,
        } as any);

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["product-documents", product.id] });
      toast.success("Documento carregado");
      setNewName("");
      setNewVersion("1.0");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar documento");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete document
  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      // Try to delete from storage
      try {
        const url = new URL(doc.url);
        const storagePath = url.pathname.split("/product-documents/")[1];
        if (storagePath) {
          await supabase.storage.from("product-documents").remove([decodeURIComponent(storagePath)]);
        }
      } catch { /* ignore storage delete errors */ }

      const { error } = await supabase
        .from("product_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-documents", product.id] });
      toast.success("Documento removido");
    },
    onError: () => toast.error("Erro ao remover documento"),
  });

  // Toggle visibility
  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: Visibility }) => {
      const { error } = await supabase
        .from("product_documents")
        .update({ visibility, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-documents", product.id] });
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const groupedDocs = allDocTypes.reduce<Record<string, any[]>>((acc, type) => {
    acc[type] = documents.filter((d: any) => d.type === type);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Carregar documento</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={newDocType} onValueChange={(v) => setNewDocType(v as DocType)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {allDocTypes.map((key) => {
                const { label, icon: Icon } = docTypeConfig[key];
                return (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={newLanguage} onValueChange={setNewLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Idioma" />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Versão (ex: 1.0)"
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
          />

          <Select value={newVisibility} onValueChange={(v) => setNewVisibility(v as Visibility)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> Interno
                </span>
              </SelectItem>
              <SelectItem value="public">
                <span className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" /> Público
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          placeholder="Nome do documento (opcional — usa o nome do ficheiro)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.mp4,.webm,.mov,.step,.iges,.stl,.dxf,.dwg,.zip"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            className="gap-2 flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "A carregar..." : "Selecionar ficheiro"}
          </Button>
        </div>
      </Card>

      <Separator />

      {/* Document list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">A carregar...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum documento</p>
          <p className="text-xs text-muted-foreground mt-1">Carregue fichas técnicas, manuais, certificados ou vídeos</p>
        </div>
      ) : (
        allDocTypes.map((type) => {
          const items = groupedDocs[type] || [];
          if (items.length === 0) return null;
          const { label, icon: Icon, color } = docTypeConfig[type];
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-semibold">{label}</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-1">
                {items.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                    <Icon className={`h-5 w-5 ${color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{languageOptions.find((l) => l.value === doc.language)?.label || doc.language}</span>
                        <span>•</span>
                        <span>v{doc.version}</span>
                        {doc.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Visibility badge */}
                    <button
                      onClick={() => toggleVisibility.mutate({
                        id: doc.id,
                        visibility: doc.visibility === "public" ? "internal" : "public",
                      })}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-muted transition-colors"
                      title={doc.visibility === "public" ? "Visível na loja — clicar para tornar interno" : "Apenas interno — clicar para tornar público"}
                    >
                      {doc.visibility === "public" ? (
                        <>
                          <Globe className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-600">Público</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Interno</span>
                        </>
                      )}
                    </button>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(doc.url, "_blank")}
                      title="Abrir"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteDoc.mutate(doc)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, BookOpen, Award, Video, Box, File, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StoreProductDocumentsProps {
  productId: string;
}

const docTypeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  datasheet: { label: "Ficha Técnica", icon: FileText },
  manual: { label: "Manual", icon: BookOpen },
  certificate: { label: "Certificado", icon: Award },
  video: { label: "Vídeo", icon: Video },
  cad_file: { label: "Ficheiro CAD", icon: Box },
  other: { label: "Documento", icon: File },
};

const langLabels: Record<string, string> = {
  pt: "PT", en: "EN", es: "ES", fr: "FR", de: "DE", it: "IT",
};

export function StoreProductDocuments({ productId }: StoreProductDocumentsProps) {
  const { data: documents } = useQuery({
    queryKey: ["store-product-documents", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_documents")
        .select("id, type, name, url, language, version, file_size")
        .eq("product_id", productId)
        .eq("visibility", "public")
        .order("type")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });

  if (!documents?.length) return null;

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-4">Documentação</h2>
      <div className="grid gap-2">
        {documents.map((doc: any) => {
          const config = docTypeConfig[doc.type] || docTypeConfig.other;
          const Icon = config.icon;
          return (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
            >
              <Icon className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {doc.name}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {config.label}
                  </Badge>
                  {doc.language && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {langLabels[doc.language] || doc.language}
                    </Badge>
                  )}
                  {doc.version && doc.version !== "1.0" && (
                    <span>v{doc.version}</span>
                  )}
                  {doc.file_size && <span>{formatSize(doc.file_size)}</span>}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

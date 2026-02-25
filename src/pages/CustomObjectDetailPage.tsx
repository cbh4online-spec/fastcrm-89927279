import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomObjects, useObjectRecords, useUpdateObjectRecord, useDeleteObjectRecord } from "@/hooks/useCustomObjects";
import { useCoreObjectFields } from "@/hooks/useCoreObjectFields";
import { InlineFieldEditor } from "@/components/objects/InlineFieldEditor";
import { RelationshipsPanel } from "@/components/objects/RelationshipsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getIconByName } from "@/lib/icons";
import { ChevronRight, Trash2, Loader2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function getRecordTitle(data: Record<string, unknown>): string {
  for (const key of ["name", "nome", "title", "titulo", "subject", "project_name", "product_name"]) {
    if (data[key] && typeof data[key] === "string") return data[key] as string;
  }
  const firstStr = Object.values(data).find((v) => typeof v === "string" && v.trim());
  return (firstStr as string) || "Sem nome";
}

export default function CustomObjectDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { data: customObjects, isLoading: loadingObjs } = useCustomObjects();
  const customObj = customObjects?.find((o) => o.slug === type);
  const { data: fields = [] } = useCoreObjectFields(customObj?.id || null);
  const { data: records = [] } = useObjectRecords(customObj?.id || null);
  const updateRecord = useUpdateObjectRecord();
  const deleteRecord = useDeleteObjectRecord();

  const record = records.find((r) => r.id === id);
  const recordData = (record?.data || {}) as Record<string, unknown>;

  if (loadingObjs) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!customObj || !record) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
          <p className="text-muted-foreground">Registo não encontrado</p>
          <Button variant="outline" onClick={() => navigate("/objects")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const IconComp = getIconByName(customObj.icon);
  const title = getRecordTitle(recordData);

  const handleFieldSave = (fieldSlug: string, value: unknown) => {
    const newData = { ...recordData, [fieldSlug]: value };
    updateRecord.mutate({
      id: record.id,
      object_id: customObj.id,
      data: newData,
    });
  };

  const handleDelete = () => {
    if (!confirm("Tem certeza que deseja eliminar este registo?")) return;
    deleteRecord.mutate(
      { id: record.id, object_id: customObj.id },
      { onSuccess: () => { navigate(`/objects/${customObj.slug}`); } }
    );
  };

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Link to="/objects" className="hover:text-foreground transition-colors">Objects</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/objects/${customObj.slug}`} className="hover:text-foreground transition-colors">{customObj.name}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{title}</span>
          </nav>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: customObj.color + "20" }}
              >
                <IconComp className="h-5 w-5" style={{ color: customObj.color }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{title}</h1>
                <p className="text-xs text-muted-foreground">{customObj.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </Button>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left — Fields (60%) */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Campos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Nenhum campo definido.</p>
                  ) : (
                    fields.map((field) => (
                      <div key={field.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                        <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-1.5 uppercase tracking-wider">
                          {field.name}
                        </span>
                        <div className="flex-1">
                          <InlineFieldEditor
                            value={recordData[field.slug]}
                            fieldType={field.field_type}
                            options={field.options?.options as string[] | undefined}
                            onSave={(v) => handleFieldSave(field.slug, v)}
                            placeholder="Clique para editar"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right — Relationships + Meta (40%) */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <RelationshipsPanel recordId={record.id} objectId={customObj.id} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h4 className="text-sm font-semibold">Metadados</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Criado em {format(new Date(record.created_at), "d MMM yyyy, HH:mm", { locale: pt })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Atualizado em {format(new Date(record.updated_at), "d MMM yyyy, HH:mm", { locale: pt })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}

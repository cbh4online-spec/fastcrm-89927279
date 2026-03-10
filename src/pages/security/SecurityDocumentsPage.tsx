import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { useSecurityDocuments } from "@/hooks/security/useSecurityDocuments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { SecurityDocumentCreateDialog } from "@/components/security/SecurityDocumentCreateDialog";

const statusColors: Record<string, string> = {
  draft: "secondary",
  por_validar: "outline",
  validated: "default",
  emitted: "default",
  signed: "default",
  archived: "secondary",
};

export default function SecurityDocumentsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filters: any = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (typeFilter !== "all") filters.document_type = typeFilter;

  const { documents, isLoading } = useSecurityDocuments(filters);

  const filtered = documents.filter((d: any) => {
    const site = (d.security_systems as any)?.security_installation_sites as any;
    return [d.document_type, site?.site_name, d.template_key]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });

  const docTypes = [
    { value: "installation_certificate", label: t("docTypeInstallationCert") },
    { value: "maintenance_certificate", label: t("docTypeMaintenanceCert") },
    { value: "conformity_declaration", label: t("docTypeConformity") },
    { value: "occurrence_book", label: t("docTypeOccurrenceBook") },
    { value: "technical_sheet", label: t("docTypeTechnicalSheet") },
    { value: "annex", label: t("docTypeAnnex") },
    { value: "other", label: t("docTypeOther") },
  ];

  const statuses = [
    { value: "draft", label: t("docStatusDraft") },
    { value: "por_validar", label: t("docStatusPorValidar") },
    { value: "validated", label: t("docStatusValidated") },
    { value: "emitted", label: t("docStatusEmitted") },
    { value: "signed", label: t("docStatusSigned") },
    { value: "archived", label: t("docStatusArchived") },
  ];

  const getTypeLabel = (type: string) => docTypes.find(d => d.value === type)?.label || type;
  const getStatusLabel = (status: string) => statuses.find(s => s.value === status)?.label || status;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">{t("documents")}</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("createDraft")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {docTypes.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {statuses.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("noDocuments")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((doc: any) => {
              const site = (doc.security_systems as any)?.security_installation_sites as any;
              return (
                <Card
                  key={doc.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/dashboard/security/documents/${doc.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{getTypeLabel(doc.document_type)}</p>
                        <span className="text-xs text-muted-foreground">v{doc.version_number || 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {site?.site_name || "—"}
                        {doc.created_at && ` · ${format(new Date(doc.created_at), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={(statusColors[doc.status] || "secondary") as any}>
                        {getStatusLabel(doc.status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <SecurityDocumentCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}

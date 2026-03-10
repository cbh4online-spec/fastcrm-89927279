import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useSecurityPartnerRequests } from "@/hooks/security/useSecurityPartnerRequests";
import { useSecurityPartners } from "@/hooks/security/useSecurityPartners";
import { Plus, ClipboardList, ArrowRight, Users, UserPlus, Search, Sparkles, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { SecurityPartnerRequestDialog } from "@/components/security/SecurityPartnerRequestDialog";
import { SecurityPartnerDialog } from "@/components/security/SecurityPartnerDialog";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-500/10 text-blue-600 border-blue-200",
  extracted: "bg-amber-500/10 text-amber-600 border-amber-200",
  needs_review: "bg-orange-500/10 text-orange-600 border-orange-200",
  validated: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  processing: Sparkles,
  extracted: Sparkles,
  needs_review: AlertTriangle,
  validated: CheckCircle,
  rejected: XCircle,
};

export default function SecurityPartnerRequestsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { requests, isLoading } = useSecurityPartnerRequests();
  const { partners, isLoading: partnersLoading } = useSecurityPartners();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // KPI counters
  const counts = useMemo(() => {
    const c = { total: requests.length, pending: 0, needsReview: 0, validated: 0, converted: 0 };
    requests.forEach((r: any) => {
      if (r.extraction_status === "pending") c.pending++;
      if (r.extraction_status === "needs_review") c.needsReview++;
      if (r.extraction_status === "validated") c.validated++;
      if (r.linked_security_lead_id) c.converted++;
    });
    return c;
  }, [requests]);

  // Filtered requests
  const filtered = useMemo(() => {
    let result = requests;
    if (statusFilter !== "all") {
      result = result.filter((r) => r.extraction_status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r: any) =>
        r.raw_text?.toLowerCase().includes(q) ||
        r.security_partners?.name?.toLowerCase().includes(q) ||
        (r.parsed_payload_json as any)?.client_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [requests, statusFilter, searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("partnerRequests")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("partnerRequestsDesc")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPartnerDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {t("addPartner")}
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("newPartnerRequest")}
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label={t("total")} value={counts.total} icon={ClipboardList} />
          <KpiCard label={t("statusPending")} value={counts.pending} icon={Clock} highlight={counts.pending > 0} />
          <KpiCard label={t("statusNeedsReview")} value={counts.needsReview} icon={AlertTriangle} highlight={counts.needsReview > 0} />
          <KpiCard label={t("statusValidated")} value={counts.validated} icon={CheckCircle} />
          <KpiCard label={t("reqConverted")} value={counts.converted} icon={ArrowRight} />
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search") + "..."}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="pending">{t("statusPending")}</SelectItem>
              <SelectItem value="processing">{t("statusProcessing")}</SelectItem>
              <SelectItem value="extracted">{t("statusExtracted")}</SelectItem>
              <SelectItem value="needs_review">{t("statusNeedsReview")}</SelectItem>
              <SelectItem value="validated">{t("statusValidated")}</SelectItem>
              <SelectItem value="rejected">{t("statusRejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              {t("partnerRequests")} ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-1.5">
              <Users className="h-4 w-4" />
              {t("partners")} ({partners.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            {filtered.length === 0 && !isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">{t("noPartnerRequests")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("noPartnerRequestsDesc")}</p>
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("newPartnerRequest")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((req) => {
                  const StatusIcon = STATUS_ICONS[req.extraction_status] || Clock;
                  const payload = req.parsed_payload_json as any;
                  const isConverted = !!(req as any).linked_security_lead_id;
                  return (
                    <Card
                      key={req.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`/dashboard/security/partner-requests/${req.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium truncate">
                                {payload?.client_name || (req as any).security_partners?.name || t("partner") + " —"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {req.source_channel}
                              </Badge>
                              <Badge className={`text-xs border ${STATUS_COLORS[req.extraction_status] || ""}`} variant="outline">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {t(`status${req.extraction_status.charAt(0).toUpperCase() + req.extraction_status.slice(1).replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())}` as any) || req.extraction_status}
                              </Badge>
                              {req.extraction_confidence != null && Number(req.extraction_confidence) > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {t("confidence")}: {Math.round(Number(req.extraction_confidence))}%
                                </Badge>
                              )}
                              {isConverted && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Lead
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate max-w-2xl">
                              {payload?.request_type && <span className="capitalize">{t(`type${payload.request_type.charAt(0).toUpperCase() + payload.request_type.slice(1)}` as any) || payload.request_type} · </span>}
                              {payload?.system_type && <span className="capitalize">{payload.system_type} · </span>}
                              {req.raw_text?.slice(0, 100)}...
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(req.created_at), "dd/MM HH:mm")}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="partners" className="mt-4">
            {partners.length === 0 && !partnersLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">{t("noPartners")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("noPartnersDesc")}</p>
                  <Button className="mt-4" onClick={() => setPartnerDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("addPartner")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map((partner) => (
                  <Card key={partner.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{partner.name}</h3>
                          {partner.partner_code && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t("partnerCode")}: {partner.partner_code}
                            </p>
                          )}
                          {partner.zone && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {partner.zone}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={partner.status === "active" ? "default" : "secondary"} className="text-xs">
                          {partner.status}
                        </Badge>
                      </div>
                      {partner.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{partner.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SecurityPartnerRequestDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <SecurityPartnerDialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen} />
    </DashboardLayout>
  );
}

function KpiCard({ label, value, icon: Icon, highlight }: { label: string; value: number; icon: any; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-destructive/30" : ""}>
      <CardContent className="p-3 text-center">
        <Icon className={`h-4 w-4 mx-auto mb-1 ${highlight ? "text-destructive" : "text-muted-foreground"}`} />
        <p className={`text-xl font-bold ${highlight ? "text-destructive" : ""}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

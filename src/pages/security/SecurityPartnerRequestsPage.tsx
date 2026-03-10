import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useSecurityPartnerRequests } from "@/hooks/security/useSecurityPartnerRequests";
import { useSecurityPartners } from "@/hooks/security/useSecurityPartners";
import { Plus, ClipboardList, ArrowRight, FileSearch, Users, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { SecurityPartnerRequestDialog } from "@/components/security/SecurityPartnerRequestDialog";
import { SecurityPartnerDialog } from "@/components/security/SecurityPartnerDialog";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-500",
  processing: "bg-blue-500",
  extracted: "bg-amber-500",
  needs_review: "bg-orange-500",
  validated: "bg-emerald-500",
  rejected: "bg-red-500",
};

export default function SecurityPartnerRequestsPage() {
  const { t } = useTranslation("security");
  const navigate = useNavigate();
  const { requests, isLoading } = useSecurityPartnerRequests();
  const { partners, isLoading: partnersLoading } = useSecurityPartners();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("partnerRequests")}</h1>
            <p className="text-sm text-muted-foreground">
              Pedidos informais de parceiros para processamento
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

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              {t("partnerRequests")} ({requests.length})
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-1.5">
              <Users className="h-4 w-4" />
              {t("partners")} ({partners.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            {requests.length === 0 && !isLoading ? (
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
              <div className="space-y-3">
                {requests.map((req) => (
                  <Card
                    key={req.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/dashboard/security/partner-requests/${req.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">
                              {(req as any).security_partners?.name || t("partner") + " —"}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {req.source_channel}
                            </Badge>
                            <Badge className={`text-xs text-white ${STATUS_COLORS[req.extraction_status] || "bg-gray-500"}`}>
                              {t(`status${req.extraction_status.charAt(0).toUpperCase() + req.extraction_status.slice(1).replace(/_([a-z])/g, (_, l) => l.toUpperCase())}` as any) || req.extraction_status}
                            </Badge>
                            {req.extraction_confidence != null && (
                              <Badge variant="outline" className="text-xs">
                                {t("confidence")}: {Math.round(Number(req.extraction_confidence))}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-xl">
                            {req.raw_text?.slice(0, 120)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(req.created_at), "dd/MM/yyyy HH:mm")}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

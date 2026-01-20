import { useState } from "react";
import { 
  Users, TrendingUp, Clock, CheckCircle2, XCircle, 
  ExternalLink, Instagram, BarChart3, Loader2, 
  UserPlus, Filter, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface GeneratedLead {
  id: string;
  created_at: string;
  status: string | null;
  crm_lead_id: string | null;
  profile: {
    id: string;
    username: string;
    full_name: string | null;
    profile_pic_url: string | null;
    followers_count: number | null;
  } | null;
  insight: {
    id: string;
    category_guess: string | null;
    specialty_guess: string | null;
    city_guess: string | null;
    lead_score: number | null;
  } | null;
  crm_lead: {
    id: string;
    name: string;
    status: string | null;
  } | null;
}

export function LeadsTab() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState("7");
  const [statusFilter, setStatusFilter] = useState("all");

  // Calculate date range
  const getDateRange = () => {
    const days = parseInt(periodFilter);
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), days));
    return { start, end };
  };

  // Fetch generated leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ["ig-generated-leads", currentWorkspace?.id, periodFilter, statusFilter],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { start, end } = getDateRange();

      let query = supabase
        .from("ig_generated_leads")
        .select(`
          id,
          created_at,
          status,
          crm_lead_id,
          profile:ig_profiles(
            id,
            username,
            full_name,
            profile_pic_url,
            followers_count
          ),
          insight:ig_ai_profile_insights(
            id,
            category_guess,
            specialty_guess,
            city_guess,
            lead_score
          ),
          crm_lead:leads(
            id,
            name,
            status
          )
        `)
        .eq("workspace_id", currentWorkspace.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GeneratedLead[];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Calculate stats
  const stats = {
    total: leads?.length || 0,
    converted: leads?.filter(l => l.status === "converted").length || 0,
    pending: leads?.filter(l => l.status === "pending" || !l.status).length || 0,
    avgScore: leads?.length 
      ? Math.round(leads.reduce((acc, l) => acc + (l.insight?.lead_score || 0), 0) / leads.length)
      : 0,
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "converted":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Convertido</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejeitado</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pendente</Badge>;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Leads Gerados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.converted}</p>
                <p className="text-xs text-muted-foreground">Convertidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgScore}</p>
                <p className="text-xs text-muted-foreground">Score Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="converted">Convertidos</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : leads && leads.length > 0 ? (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Profile Avatar */}
                    <Avatar 
                      className="h-14 w-14 cursor-pointer hover:ring-2 ring-primary transition-all"
                      onClick={() => lead.profile && window.open(`https://instagram.com/${lead.profile.username}`, "_blank")}
                    >
                      <AvatarImage src={lead.profile?.profile_pic_url || ""} />
                      <AvatarFallback>
                        {lead.profile?.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">
                          @{lead.profile?.username || "desconhecido"}
                        </span>
                        {getStatusBadge(lead.status)}
                        {lead.insight?.lead_score && (
                          <Badge variant="outline" className={getScoreColor(lead.insight.lead_score)}>
                            Score: {lead.insight.lead_score}
                          </Badge>
                        )}
                      </div>

                      {lead.profile?.full_name && (
                        <p className="text-sm text-muted-foreground">
                          {lead.profile.full_name}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        {lead.insight?.category_guess && (
                          <span>{lead.insight.category_guess}</span>
                        )}
                        {lead.insight?.specialty_guess && (
                          <span>• {lead.insight.specialty_guess}</span>
                        )}
                        {lead.insight?.city_guess && (
                          <span>• 📍 {lead.insight.city_guess}</span>
                        )}
                        {lead.profile?.followers_count && (
                          <span>• {formatNumber(lead.profile.followers_count)} seguidores</span>
                        )}
                      </div>

                      {/* CRM Lead link */}
                      {lead.crm_lead && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <span className="text-muted-foreground">Lead CRM: </span>
                          <button 
                            className="text-primary hover:underline font-medium"
                            onClick={() => navigate(`/dashboard/leads/${lead.crm_lead?.id}`)}
                          >
                            {lead.crm_lead.name}
                          </button>
                          {lead.crm_lead.status && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {lead.crm_lead.status}
                            </Badge>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Criado {format(new Date(lead.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => lead.profile && window.open(`https://instagram.com/${lead.profile.username}`, "_blank")}
                      >
                        <Instagram className="h-4 w-4" />
                      </Button>
                      {lead.crm_lead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/dashboard/leads/${lead.crm_lead?.id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem Leads Gerados</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Os leads criados a partir de perfis do Instagram aparecerão aqui.
              Pesquise perfis e clique em "Criar Lead" para começar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

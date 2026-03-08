import { Link } from "react-router-dom";
import { SmartCompany, NextActionType } from "@/hooks/useSmartCompanies";
import { TableCell, TableRow } from "@/components/ui/table";
import { stickyCheckboxStyles, stickyNameStyles } from "@/components/common/StickyTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Snowflake,
  Flame,
  ThermometerSun,
  Sparkles,
  AlertTriangle,
  Zap,
  ExternalLink,
  MoreHorizontal,
  Reply,
  FileSpreadsheet,
  Target,
  Settings2,
  Archive,
  Clock,
  Building2,
  Globe,
  Factory,
  Users,
  TrendingUp,
  Signal,
  Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { useTranslation } from "react-i18next";

interface SmartCompanyRowProps {
  company: SmartCompany;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
  columnOrder: string[];
}

const sourceColors: Record<string, string> = {
  referral: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  website: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  linkedin: "bg-blue-700/10 text-blue-700 border-blue-700/20",
  event: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  cold_outreach: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
};

const nextActionIcons: Record<NextActionType, React.ReactNode> = {
  reply_manual: <Reply className="w-3 h-3" />,
  send_template: <FileSpreadsheet className="w-3 h-3" />,
  create_opportunity: <Target className="w-3 h-3" />,
  activate_automation: <Settings2 className="w-3 h-3" />,
  archive: <Archive className="w-3 h-3" />,
  follow_up: <Clock className="w-3 h-3" />,
  schedule_meeting: <Clock className="w-3 h-3" />,
  research: <Globe className="w-3 h-3" />,
};

export function SmartCompanyRow({ 
  company, 
  isSelected, 
  onToggleSelect, 
  onAnalyze,
  isAnalyzing,
  columnOrder
}: SmartCompanyRowProps) {
  const { t } = useTranslation("crm");

  const temperatureConfig: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    cold: { label: t("temperatureCold"), emoji: "❄️", color: "text-blue-500", bg: "bg-blue-500/10" },
    warm: { label: t("temperatureWarm"), emoji: "🟡", color: "text-amber-500", bg: "bg-amber-500/10" },
    hot: { label: t("temperatureHot"), emoji: "🔥", color: "text-red-500", bg: "bg-red-500/10" },
  };

  const companyTypeLabels: Record<string, { label: string; color: string }> = {
    prospect: { label: t("companyTypeProspect"), color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    client: { label: t("companyTypeClient"), color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    partner: { label: t("companyTypePartner"), color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    competitor: { label: t("companyTypeCompetitor"), color: "bg-red-500/10 text-red-600 border-red-500/20" },
    vendor: { label: t("companyTypeVendor"), color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    unknown: { label: t("companyTypeUnknown"), color: "bg-muted text-muted-foreground" },
  };

  const nextActionLabels: Record<NextActionType, string> = {
    reply_manual: t("actionReplyManual"),
    send_template: t("actionSendTemplate"),
    create_opportunity: t("actionCreateOpportunity"),
    activate_automation: t("actionActivateAutomation"),
    archive: t("actionArchive"),
    follow_up: t("actionFollowUp"),
    schedule_meeting: t("actionScheduleMeeting"),
    research: t("actionResearch"),
  };

  const initials = company.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const tempConfig = temperatureConfig[company.ai_temperature] || temperatureConfig.cold;
  const typeConfig = companyTypeLabels[company.ai_company_type || "unknown"];
  const sourceKey = company.source?.toLowerCase() || "website";
  const sourceColor = sourceColors[sourceKey] || sourceColors.website;

  const formatSLA = () => {
    if (company.hoursSinceLastContact === null) return "—";
    if (company.hoursSinceLastContact < 1) return t("now");
    if (company.hoursSinceLastContact < 24) return `${Math.round(company.hoursSinceLastContact)}h`;
    return `${Math.round(company.hoursSinceLastContact / 24)}d`;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value}`;
  };

  const cellRenderers: Record<string, () => React.ReactNode> = {
    name: () => (
      <TableCell key="name" className={cn("min-w-[200px]", stickyNameStyles)}>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link to={`/dashboard/companies/${company.id}`} className="font-medium text-foreground hover:text-primary hover:underline truncate block">{company.name}</Link>
            {company.website && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" />
                <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
          </div>
        </div>
      </TableCell>
    ),
    industry: () => (
      <TableCell key="industry">
        {company.industry ? (
          <div className="flex items-center gap-1.5 text-sm"><Factory className="w-3 h-3 text-muted-foreground" /><span className="truncate max-w-[120px]">{company.industry}</span></div>
        ) : <span className="text-muted-foreground">—</span>}
      </TableCell>
    ),
    source: () => (
      <TableCell key="source"><Badge variant="outline" className={cn("text-xs capitalize", sourceColor)}>{company.source || "Website"}</Badge></TableCell>
    ),
    city: () => <TableCell key="city"><span className="text-sm">{company.city || "—"}</span></TableCell>,
    size: () => <TableCell key="size"><span className="text-sm">{company.size || "—"}</span></TableCell>,
    phone: () => <TableCell key="phone"><span className="text-sm">{company.phone || "—"}</span></TableCell>,
    email: () => (
      <TableCell key="email">
        {company.email ? <a href={`mailto:${company.email}`} className="text-sm text-primary hover:underline">{company.email}</a> : <span className="text-sm text-muted-foreground">—</span>}
      </TableCell>
    ),
    website: () => (
      <TableCell key="website">
        {company.website ? <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{company.website.replace(/^https?:\/\//, '')}</a> : <span className="text-sm text-muted-foreground">—</span>}
      </TableCell>
    ),
    temperature: () => (
      <TableCell key="temperature">
        <TooltipProvider><Tooltip><TooltipTrigger asChild>
          <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", tempConfig.bg, tempConfig.color)}>
            <span>{tempConfig.emoji}</span><span>{tempConfig.label}</span>
          </div>
        </TooltipTrigger><TooltipContent><p className="text-xs">{t("tempAutoClassification")}</p></TooltipContent></Tooltip></TooltipProvider>
      </TableCell>
    ),
    score: () => (
      <TableCell key="score">
        <TooltipProvider><Tooltip><TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", company.company_score >= 70 ? "bg-emerald-500" : company.company_score >= 40 ? "bg-amber-500" : "bg-muted-foreground")} style={{ width: `${company.company_score}%` }} />
            </div>
            <span className={cn("text-sm font-medium tabular-nums", company.company_score >= 70 ? "text-emerald-600" : company.company_score >= 40 ? "text-amber-600" : "text-muted-foreground")}>{company.company_score}</span>
          </div>
        </TooltipTrigger><TooltipContent><p className="text-xs">{t("scoreTooltip")}</p></TooltipContent></Tooltip></TooltipProvider>
      </TableCell>
    ),
    type: () => (
      <TableCell key="type"><Badge variant="outline" className={cn("text-xs", typeConfig.color)}><Building2 className="w-3 h-3 mr-1" />{typeConfig.label}</Badge></TableCell>
    ),
    next_action: () => (
      <TableCell key="next_action">
        {company.ai_next_action ? (
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs">
              {company.ai_next_action_type && nextActionIcons[company.ai_next_action_type] && <span className="text-primary">{nextActionIcons[company.ai_next_action_type]}</span>}
              <span className="text-muted-foreground truncate max-w-[140px]">
                {company.ai_next_action_type && nextActionLabels[company.ai_next_action_type] ? nextActionLabels[company.ai_next_action_type] : company.ai_next_action}
              </span>
            </div>
          </TooltipTrigger><TooltipContent>
            <p className="text-xs max-w-[200px]"><span className="font-medium">{t("nextActionTooltip")}</span><br />{company.ai_next_action}</p>
          </TooltipContent></Tooltip></TooltipProvider>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    ),
    sla: () => (
      <TableCell key="sla">
        <div className={cn("flex items-center gap-1 text-xs", company.slaBreach && "text-destructive font-medium")}>
          {company.slaBreach && <AlertTriangle className="w-3 h-3" />}
          <Clock className="w-3 h-3 text-muted-foreground" />
          {formatSLA()}
        </div>
      </TableCell>
    ),
    contacts_count: () => (
      <TableCell key="contacts_count">
        <div className="flex items-center gap-1 text-sm"><Users className="w-3 h-3 text-muted-foreground" /><span className={cn("tabular-nums", company.contactsCount > 0 ? "font-medium" : "text-muted-foreground")}>{company.contactsCount || 0}</span></div>
      </TableCell>
    ),
    opportunities_count: () => (
      <TableCell key="opportunities_count">
        <div className="flex items-center gap-1 text-sm"><Target className="w-3 h-3 text-muted-foreground" /><span className={cn("tabular-nums", company.opportunitiesCount > 0 ? "font-medium text-primary" : "text-muted-foreground")}>{company.opportunitiesCount || 0}</span></div>
      </TableCell>
    ),
    estimated_value: () => (
      <TableCell key="estimated_value"><span className="text-sm font-medium text-emerald-600">{company.estimated_value > 0 ? formatCurrency(company.estimated_value) : "—"}</span></TableCell>
    ),
    conversion_prob: () => (
      <TableCell key="conversion_prob">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${company.conversion_probability}%` }} /></div>
          <span className="text-xs text-muted-foreground tabular-nums">{company.conversion_probability}%</span>
        </div>
      </TableCell>
    ),
    employee_count: () => (
      <TableCell key="employee_count">
        {company.employee_count ? <div className="flex items-center gap-1 text-sm"><Users className="w-3 h-3 text-muted-foreground" />{company.employee_count}</div> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    ),
    annual_revenue: () => (
      <TableCell key="annual_revenue"><span className="text-sm">{company.annual_revenue > 0 ? formatCurrency(company.annual_revenue) : "—"}</span></TableCell>
    ),
    automation: () => (
      <TableCell key="automation">
        {company.automation_active ? <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20"><Zap className="w-3 h-3" />{t("automationActive")}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    ),
    google_rating: () => (
      <TableCell key="google_rating">
        {company.google_rating ? <div className="flex items-center gap-1 text-sm"><span className="text-amber-500">★</span><span className="font-medium">{company.google_rating.toFixed(1)}</span></div> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    ),
    social_presence: () => (
      <TableCell key="social_presence">
        <div className="flex items-center gap-1">
          {company.linkedin_url && <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>}
          {company.facebook_url && <a href={company.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg></a>}
          {company.instagram_url && <a href={company.instagram_url} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-700"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>}
          {!company.linkedin_url && !company.facebook_url && !company.instagram_url && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </TableCell>
    ),
    insight: () => (
      <TableCell key="insight">
        {company.ai_insight ? (
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[180px]">
              <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="truncate">{company.ai_insight}</span>
            </div>
          </TooltipTrigger><TooltipContent>
            <p className="text-xs max-w-[250px]"><span className="font-medium">{t("insightQuickSummary")}</span><br />{company.ai_insight}</p>
          </TooltipContent></Tooltip></TooltipProvider>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    ),
  };

  return (
    <TableRow className={cn("group transition-colors", isSelected && "bg-muted/50", company.slaBreach && "bg-destructive/5")}>
      <TableCell className={cn("w-[40px]", stickyCheckboxStyles)}>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>

      {columnOrder.map(colId => {
        const renderer = cellRenderers[colId];
        return renderer ? renderer() : null;
      })}

      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAnalyze} disabled={isAnalyzing}>
              <Sparkles className={cn("w-4 h-4", isAnalyzing && "animate-pulse")} />
            </Button>
          </TooltipTrigger><TooltipContent><p className="text-xs">{t("analyzeWithAI")}</p></TooltipContent></Tooltip></TooltipProvider>

          <Link to={`/dashboard/companies/${company.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="w-4 h-4" /></Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Reply className="w-4 h-4 mr-2" />{t("sendMessage")}</DropdownMenuItem>
              <DropdownMenuItem><Target className="w-4 h-4 mr-2" />{t("createOpportunity")}</DropdownMenuItem>
              <DropdownMenuItem><Settings2 className="w-4 h-4 mr-2" />{t("activateAutomation")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />{t("archive")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

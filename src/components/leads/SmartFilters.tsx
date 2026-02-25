import { useTranslation } from "react-i18next";
import { SmartFilterType, SmartLeadsFilters, LeadTemperature, LeadStatus } from "@/hooks/useSmartLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Flame, 
  Clock, 
  TrendingUp, 
  Zap, 
  Calendar,
  X,
  SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartFiltersProps {
  filters: SmartLeadsFilters;
  onFiltersChange: (filters: SmartLeadsFilters) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export function SmartFilters({ filters, onFiltersChange, showAdvanced, onToggleAdvanced }: SmartFiltersProps) {
  const { t } = useTranslation('crm');

  const smartFilters: Array<{ key: SmartFilterType; label: string; icon: React.ReactNode }> = [
    { key: "hot", label: t('smartFilterHotLeads'), icon: <Flame className="w-3 h-3" /> },
    { key: "no_response", label: t('smartFilterNoResponse'), icon: <Clock className="w-3 h-3" /> },
    { key: "high_intent", label: t('smartFilterHighIntent'), icon: <TrendingUp className="w-3 h-3" /> },
    { key: "automation_active", label: t('smartFilterAutomation'), icon: <Zap className="w-3 h-3" /> },
    { key: "today", label: t('smartFilterToday'), icon: <Calendar className="w-3 h-3" /> },
    { key: "this_week", label: t('smartFilterThisWeek'), icon: <Calendar className="w-3 h-3" /> },
  ];

  const activeFiltersCount = [
    filters.status && filters.status !== "all",
    filters.temperature && filters.temperature !== "all",
    filters.source && filters.source !== "all",
    filters.smartFilter,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onFiltersChange({
      search: filters.search,
      status: "all",
      temperature: "all",
      source: "all",
      smartFilter: undefined,
    });
  };

  return (
    <div className="space-y-3">
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchLeads')}
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as LeadStatus | "all" })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('col_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="new">{t('statusNew')}</SelectItem>
            <SelectItem value="in_progress">{t('statusInProgress')}</SelectItem>
            <SelectItem value="completed">{t('statusQualified')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Temperature filter */}
        <Select
          value={filters.temperature || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, temperature: value as LeadTemperature | "all" })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('col_temperature')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTemperatures')}</SelectItem>
            <SelectItem value="hot">🔥 {t('temperatureHot')}</SelectItem>
            <SelectItem value="warm">🟡 {t('temperatureWarm')}</SelectItem>
            <SelectItem value="cold">❄️ {t('temperatureCold')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select
          value={filters.source || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, source: value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('col_source')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allChannels')}</SelectItem>
            <SelectItem value="email">{t('channelEmail')}</SelectItem>
            <SelectItem value="whatsapp">{t('channelWhatsapp')}</SelectItem>
            <SelectItem value="instagram">{t('channelInstagram')}</SelectItem>
            <SelectItem value="form">{t('channelForm')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle advanced columns */}
        <Button
          variant={showAdvanced ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleAdvanced}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('advancedColumns')}
        </Button>

        {/* Clear filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-3 h-3" />
            {t('clearFilters', { count: activeFiltersCount })}
          </Button>
        )}
      </div>

      {/* Smart filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">{t('smartFiltersLabel')}</span>
        {smartFilters.map((sf) => (
          <Button
            key={sf.key}
            variant={filters.smartFilter === sf.key ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFiltersChange({ 
              ...filters, 
              smartFilter: filters.smartFilter === sf.key ? undefined : sf.key 
            })}
            className={cn(
              "h-7 text-xs gap-1.5",
              filters.smartFilter === sf.key && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {sf.icon}
            {sf.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

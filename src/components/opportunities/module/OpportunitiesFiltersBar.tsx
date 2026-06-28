import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Filter, ArrowUpDown, Flame, LayoutGrid, List } from "lucide-react";
import { ActiveFilterPills } from "../ActiveFilterPills";
import { OpportunitiesModuleState } from "./useOpportunitiesModule";

interface Props {
  state: OpportunitiesModuleState;
}

export function OpportunitiesFiltersBar({ state }: Props) {
  const { t } = useTranslation('crm');

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('searchOpportunities')}
              value={state.searchQuery}
              onChange={(e) => state.setSearchQuery(e.target.value)}
              className="h-11 rounded-full border-border bg-card pl-11 pr-4 shadow-sm"
            />
          </div>

          <Select value={state.statusFilter} onValueChange={(v) => state.setStatusFilter(v as any)}>
            <SelectTrigger className="h-11 rounded-full w-[150px] bg-card">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatusFilter')}</SelectItem>
              <SelectItem value="open">{t('openFilter')}</SelectItem>
              <SelectItem value="won">{t('wonFilter')}</SelectItem>
              <SelectItem value="lost">{t('lostFilter')}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={state.sortByScore ? "default" : "outline"}
            size="sm"
            className="h-11 rounded-full gap-2 px-4"
            onClick={() => state.setSortByScore((v: boolean) => !v)}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{t('score')}</span>
          </Button>

          <Button
            variant={state.hotDealsOnly ? "default" : "outline"}
            size="sm"
            className="h-11 rounded-full gap-2 px-4"
            onClick={() => state.setHotDealsOnly((v: boolean) => !v)}
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">{t('hotDeals')}</span>
            {state.hotCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                {state.hotCount}
              </Badge>
            )}
          </Button>
        </div>

        <Tabs value={state.viewMode} onValueChange={(v) => state.setViewMode(v as any)}>
          <TabsList className="h-11 rounded-full bg-muted p-1">
            <TabsTrigger value="kanban" className="rounded-full gap-2 px-4">
              <LayoutGrid className="w-4 h-4" />
              {t('kanban')}
            </TabsTrigger>
            <TabsTrigger value="list" className="rounded-full gap-2 px-4">
              <List className="w-4 h-4" />
              {t('list')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>


      {(state.activeViewConditions.length > 0 || state.sortByScore) && (
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          <ActiveFilterPills
            conditions={state.activeViewConditions}
            onRemove={(idx) => {
              if (!state.activeView) return;
              const newConditions = [...state.activeViewConditions];
              newConditions.splice(idx, 1);
              const newFilters = { ...(state.activeView.filters || {}), conditions: newConditions };
              state.updateView.mutate({ id: state.activeView.id, entity_type: "opportunities", updates: { filters: newFilters } });
            }}
            sortField={state.sortByScore ? "Score" : undefined}
            sortDir={state.sortByScore ? "desc" : undefined}
            onClearSort={() => state.setSortByScore(false)}
          />
        </div>
      )}
    </>
  );
}

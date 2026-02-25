import { useState, useMemo, useCallback } from "react";
import { applyFilters, FilterCondition } from "@/hooks/useFilterEngine";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSavedViews, useDeleteSavedView, useToggleFavorite, SavedView } from "@/hooks/useSavedViews";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Star,
  Plus,
  MoreHorizontal,
  Trash2,
  Building2,
  Users,
  DollarSign,
  FileText,
  PanelLeftClose,
  PanelLeft,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

const VIEW_DOT_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
  "bg-emerald-500", "bg-orange-500",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return VIEW_DOT_COLORS[Math.abs(hash) % VIEW_DOT_COLORS.length];
}

interface DealsSidebarProps {
  activeViewId: string | null;
  onSelectView: (view: SavedView | null) => void;
  onCreateView: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  opportunities?: any[];
}

const RECORDS_LINKS = [
  { key: "companies", icon: Building2, href: "/dashboard/companies" },
  { key: "contacts", icon: Users, href: "/dashboard/contacts" },
  { key: "deals", icon: DollarSign, href: "/dashboard/opportunities" },
  { key: "invoices", icon: FileText, href: "/dashboard/invoices" },
];

export function DealsSidebar({
  activeViewId,
  onSelectView,
  onCreateView,
  collapsed,
  onToggleCollapse,
  opportunities,
}: DealsSidebarProps) {
  const { t } = useTranslation("crm");
  const navigate = useNavigate();
  const { data: views } = useSavedViews("opportunities");
  const deleteView = useDeleteSavedView();
  const toggleFavorite = useToggleFavorite();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewsOpen, setViewsOpen] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);
  const [listsOpen, setListsOpen] = useState(true);

  const allViews = useMemo(() => views || [], [views]);
  const favorites = useMemo(() => allViews.filter((v) => v.is_favorite), [allViews]);
  const smartLists = useMemo(
    () => allViews.filter((v) => {
      const f = v.filters as any;
      return f && Array.isArray(f.conditions) && f.conditions.length > 0;
    }),
    [allViews]
  );

  const filteredViews = useMemo(() => {
    if (!searchQuery) return allViews;
    const q = searchQuery.toLowerCase();
    return allViews.filter((v) => v.name.toLowerCase().includes(q));
  }, [allViews, searchQuery]);

  const getListCount = useCallback((view: SavedView): number | null => {
    if (!opportunities) return null;
    const f = view.filters as any;
    const conditions: FilterCondition[] = f?.conditions || [];
    if (conditions.length === 0) return null;
    return applyFilters(opportunities as Record<string, unknown>[], conditions, "AND").length;
  }, [opportunities]);

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 border-r border-border bg-muted/20 flex flex-col items-center py-3 gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="w-5 h-px bg-border my-1" />
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", !activeViewId && "bg-accent")}
          onClick={() => onSelectView(null)}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
        {favorites.slice(0, 4).map((v) => (
          <Button
            key={v.id}
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", activeViewId === v.id && "bg-accent")}
            onClick={() => onSelectView(v)}
            title={v.name}
          >
            <div className={cn("w-2.5 h-2.5 rounded-full", hashColor(v.name))} />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-60 flex-shrink-0 border-r border-border bg-muted/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border">
        <h2 className="font-semibold text-sm text-foreground">{t("deals")}</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("sidebarSearchViews")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-1 pb-4 space-y-1">
          {/* Default "All Deals" */}
          <button
            className={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors hover:bg-accent/50",
              !activeViewId && "bg-accent text-accent-foreground font-medium"
            )}
            onClick={() => onSelectView(null)}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{t("sidebarAllDeals")}</span>
          </button>

          {/* VIEWS Section */}
          <Collapsible open={viewsOpen} onOpenChange={setViewsOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              {viewsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {t("sidebarViews")}
              <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">{allViews.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {filteredViews.map((view) => (
                <ViewItem
                  key={view.id}
                  view={view}
                  isActive={activeViewId === view.id}
                  onClick={() => onSelectView(view)}
                  onDelete={() => deleteView.mutate({ id: view.id, entity_type: "opportunities" })}
                  onToggleFavorite={() =>
                    toggleFavorite.mutate({ id: view.id, entity_type: "opportunities", is_favorite: !view.is_favorite })
                  }
                />
              ))}
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={onCreateView}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("sidebarCreateView")}
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* FAVORITES Section */}
          <Collapsible open={favoritesOpen} onOpenChange={setFavoritesOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              {favoritesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {t("sidebarFavorites")}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {favorites.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground italic">{t("sidebarNoFavorites")}</p>
              ) : (
                favorites.map((view) => (
                  <ViewItem
                    key={view.id}
                    view={view}
                    isActive={activeViewId === view.id}
                    onClick={() => onSelectView(view)}
                    onDelete={() => deleteView.mutate({ id: view.id, entity_type: "opportunities" })}
                    onToggleFavorite={() =>
                      toggleFavorite.mutate({ id: view.id, entity_type: "opportunities", is_favorite: false })
                    }
                    showStar
                  />
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* RECORDS Section */}
          <Collapsible open={recordsOpen} onOpenChange={setRecordsOpen}>
            <CollapsibleTrigger className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              {recordsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {t("sidebarRecords")}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {RECORDS_LINKS.map((link) => (
                <button
                  key={link.key}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(link.href)}
                >
                  <link.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{t(link.key)}</span>
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* LISTS Section */}
          <Collapsible open={listsOpen} onOpenChange={setListsOpen}>
              <CollapsibleTrigger className="w-full flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                {listsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {t("sidebarLists")}
                <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">{smartLists.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5">
                {smartLists.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground italic">{t("sidebarNoLists", "No lists yet")}</p>
                ) : (
                  smartLists.map((list) => {
                    const count = getListCount(list);
                    return (
                      <button
                        key={list.id}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors hover:bg-accent/50",
                          activeViewId === list.id && "bg-accent text-accent-foreground font-medium"
                        )}
                        onClick={() => onSelectView(list)}
                      >
                        {list.icon ? (
                          <span className="flex-shrink-0 text-sm">{list.icon}</span>
                        ) : (
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", hashColor(list.name))} />
                        )}
                        <span className="truncate flex-1">{list.name}</span>
                        {count !== null && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">{count}</Badge>
                        )}
                      </button>
                    );
                  })
                )}
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={onCreateView}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("sidebarCreateView")}
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {/* scroll to show all lists */}}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  {t("sidebarAllLists")}
                </button>
              </CollapsibleContent>
            </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}

function ViewItem({
  view,
  isActive,
  onClick,
  onDelete,
  onToggleFavorite,
  showStar,
}: {
  view: SavedView;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  showStar?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-accent/50 cursor-pointer",
        isActive && "bg-accent text-accent-foreground font-medium"
      )}
      onClick={onClick}
    >
      {showStar ? (
        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
      ) : view.icon ? (
        <span className="flex-shrink-0 text-sm">{view.icon}</span>
      ) : (
        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", hashColor(view.name))} />
      )}
      <span className="truncate flex-1">{view.name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
            <Star className="h-3.5 w-3.5 mr-2" />
            {view.is_favorite ? "Remover favorito" : "Favorito"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

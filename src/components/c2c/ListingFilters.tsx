import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X, MapPin, ArrowUpDown, Truck, Bookmark, BookmarkPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { C2CCategory, C2CListingFilters, C2CSortBy, C2CDeliveryMode } from "@/hooks/useC2CListings";
import { useSavedSearches } from "@/hooks/useC2CSavedSearches";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ListingFiltersProps {
  filters: C2CListingFilters;
  onFiltersChange: (filters: C2CListingFilters) => void;
  categories: C2CCategory[];
}

export function ListingFilters({ filters, onFiltersChange, categories }: ListingFiltersProps) {
  const { t } = useTranslation('marketplace');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { savedSearches, saveSearch, removeSearch } = useSavedSearches();
  const update = (patch: Partial<C2CListingFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  const activeFilterCount = [
    filters.category,
    filters.condition,
    filters.minPrice,
    filters.maxPrice,
    filters.location,
    filters.deliveryMode,
  ].filter(Boolean).length;

  const clearAll = () => onFiltersChange({ search: filters.search, sortBy: filters.sortBy });

  const handleSaveCurrentSearch = () => {
    const name = filters.search || t('savedSearchDefault');
    saveSearch(name, filters);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('searchInMarketplace')}
            value={filters.search || ""}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-10 h-11 text-base rounded-xl bg-muted/30 border-muted-foreground/20 focus:bg-background"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => update({ search: "" })}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Sort dropdown */}
        <Select
          value={filters.sortBy || "recent"}
          onValueChange={(v) => update({ sortBy: v as C2CSortBy })}
        >
          <SelectTrigger className="h-11 w-[140px] rounded-xl gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('sortRecent')}</SelectItem>
            <SelectItem value="price_asc">{t('sortPriceAsc')}</SelectItem>
            <SelectItem value="price_desc">{t('sortPriceDesc')}</SelectItem>
            <SelectItem value="popular">{t('sortPopular')}</SelectItem>
            <SelectItem value="recommended">{t('sortRecommended')}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showAdvanced ? "secondary" : "outline"}
          className="h-11 gap-1.5 rounded-xl relative"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{t('filters')}</span>
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Saved searches */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-11 rounded-xl gap-1.5">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">{t('savedSearches')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuLabel>{t('savedSearches')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSaveCurrentSearch} className="gap-2">
              <BookmarkPlus className="h-4 w-4" />
              {t('saveCurrentSearch')}
            </DropdownMenuItem>
            {savedSearches.length > 0 && <DropdownMenuSeparator />}
            {savedSearches.map((s) => (
              <DropdownMenuItem key={s.id} className="flex items-center justify-between">
                <button
                  className="flex-1 text-left truncate"
                  onClick={() => onFiltersChange(s.filters)}
                >
                  {s.name}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSearch(s.id); }}
                  className="ml-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))}
            {savedSearches.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                {t('noSavedSearches')}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
          <Button
            variant={!filters.category ? "default" : "outline"}
            size="sm"
            className="rounded-full text-xs shrink-0 snap-start"
            onClick={() => update({ category: undefined })}
          >
            {t('allCategories')}
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              variant={filters.category === c.id ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs shrink-0 snap-start gap-1"
              onClick={() => update({ category: filters.category === c.id ? undefined : c.id })}
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </Button>
          ))}
        </div>
      )}

      {showAdvanced && (
        <div className="flex flex-wrap gap-3 items-end p-4 rounded-xl border bg-muted/20">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('condition')}</label>
            <Select
              value={filters.condition || "all"}
              onValueChange={(v) => update({ condition: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder={t('conditionAny')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('conditionAny')}</SelectItem>
                <SelectItem value="new">{t('conditionNew')}</SelectItem>
                <SelectItem value="like_new">{t('conditionLikeNew')}</SelectItem>
                <SelectItem value="used">{t('conditionUsed')}</SelectItem>
                <SelectItem value="for_parts">{t('conditionForParts')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('deliveryMode')}</label>
            <Select
              value={filters.deliveryMode || "all"}
              onValueChange={(v) => update({ deliveryMode: v === "all" ? undefined : v as C2CDeliveryMode })}
            >
              <SelectTrigger className="w-[160px] h-9">
                <Truck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder={t('deliveryAny')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('deliveryAny')}</SelectItem>
                <SelectItem value="shipping">{t('deliveryShipping')}</SelectItem>
                <SelectItem value="in_person">{t('deliveryInPerson')}</SelectItem>
                <SelectItem value="both">{t('deliveryBoth')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('minPrice')}</label>
            <Input
              type="number"
              placeholder="0€"
              className="w-[100px] h-9"
              value={filters.minPrice || ""}
              onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('maxPrice')}</label>
            <Input
              type="number"
              placeholder="∞"
              className="w-[100px] h-9"
              value={filters.maxPrice || ""}
              onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('location')}</label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('locationPlaceholder')}
                className="w-[140px] h-9 pl-8"
                value={filters.location || ""}
                onChange={(e) => update({ location: e.target.value || undefined })}
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearAll}>
              <X className="h-3.5 w-3.5 mr-1" />
              {t('clear')} ({activeFilterCount})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

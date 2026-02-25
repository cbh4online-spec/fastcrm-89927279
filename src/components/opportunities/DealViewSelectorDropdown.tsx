import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "cmdk";
import { useSavedViews, useCreateSavedView, useDeleteSavedView, SavedView } from "@/hooks/useSavedViews";
import { ChevronDown, LayoutGrid, Plus, MoreHorizontal, Trash2, Star, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const VIEW_DOT_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return VIEW_DOT_COLORS[Math.abs(hash) % VIEW_DOT_COLORS.length];
}

interface DealViewSelectorDropdownProps {
  activeViewId: string | null;
  onSelectView: (view: SavedView | null) => void;
  onCreateView: () => void;
}

export function DealViewSelectorDropdown({ activeViewId, onSelectView, onCreateView }: DealViewSelectorDropdownProps) {
  const { t } = useTranslation("crm");
  const { data: views } = useSavedViews("opportunities");
  const deleteView = useDeleteSavedView();
  const [open, setOpen] = useState(false);

  const activeView = views?.find((v) => v.id === activeViewId);
  const displayName = activeView?.name || t("sidebarAllDeals");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="gap-2 h-9 px-3 text-lg font-semibold text-foreground hover:bg-muted/60">
          {activeView?.icon ? (
            <span className="text-base">{activeView.icon}</span>
          ) : (
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          )}
          {displayName}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0 bg-popover z-50" sideOffset={4}>
        <Command className="bg-transparent">
          <div className="px-3 pt-3 pb-1">
            <CommandInput
              placeholder={t("sidebarSearchViews")}
              className="h-8 text-sm border border-border rounded-md px-3 w-full bg-background"
            />
          </div>
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              {t("noOpportunitiesFound")}
            </CommandEmpty>
            <CommandGroup>
              {/* All Deals */}
              <CommandItem
                onSelect={() => { onSelectView(null); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-md mx-1",
                  !activeViewId && "bg-accent"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm">{t("sidebarAllDeals")}</span>
              </CommandItem>

              {/* Views */}
              {views?.map((view) => (
                <CommandItem
                  key={view.id}
                  onSelect={() => { onSelectView(view); setOpen(false); }}
                  className={cn(
                    "group flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-md mx-1",
                    activeViewId === view.id && "bg-accent"
                  )}
                >
                  {view.icon ? (
                    <span className="flex-shrink-0 text-sm">{view.icon}</span>
                  ) : (
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", hashColor(view.name))} />
                  )}
                  <span className="flex-1 text-sm truncate">{view.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-popover z-[60]">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteView.mutate({ id: view.id, entity_type: "opportunities" });
                          if (activeViewId === view.id) onSelectView(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        {t("sidebarDeleteView")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <div className="p-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              onClick={() => { onCreateView(); setOpen(false); }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("sidebarCreateView")}
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Building2, Users, DollarSign, FileText, Plus, Handshake, Building } from "lucide-react";
import { useSavedViews, SavedView } from "@/hooks/useSavedViews";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectView?: (view: SavedView) => void;
  onCreateDeal?: () => void;
}

const NAV_ITEMS = [
  { label: "companies", icon: Building2, href: "/dashboard/companies" },
  { label: "contacts", icon: Users, href: "/dashboard/contacts" },
  { label: "deals", icon: DollarSign, href: "/dashboard/opportunities" },
  { label: "invoices", icon: FileText, href: "/dashboard/invoices" },
  { label: "sidebarUsers", icon: Users, href: "/dashboard" },
  { label: "sidebarWorkspaces", icon: Building, href: "/dashboard" },
  { label: "sidebarPartners", icon: Handshake, href: "/dashboard" },
];

export function CommandPalette({ open, onOpenChange, onSelectView, onCreateDeal }: CommandPaletteProps) {
  const { t } = useTranslation("crm");
  const navigate = useNavigate();
  const { data: views } = useSavedViews("opportunities");

  // Global ⌘K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("commandPaletteSearch", "Search or type a command...")} />
      <CommandList>
        <CommandEmpty>{t("noResults", "No results found.")}</CommandEmpty>

        <CommandGroup heading={t("navigation", "Navigation")}>
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.label}
              onSelect={() => {
                navigate(item.href);
                onOpenChange(false);
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {t(item.label)}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("actions", "Actions")}>
          <CommandItem
            onSelect={() => {
              onCreateDeal?.();
              onOpenChange(false);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("newOpportunity")}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              navigate("/dashboard/contacts");
              onOpenChange(false);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("newContact")}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              navigate("/dashboard/companies");
              onOpenChange(false);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("newCompany")}
          </CommandItem>
        </CommandGroup>

        {views && views.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("sidebarViews", "Views")}>
              {views.map((view) => (
                <CommandItem
                  key={view.id}
                  onSelect={() => {
                    onSelectView?.(view);
                    onOpenChange(false);
                  }}
                >
                  {view.icon ? (
                    <span className="mr-2 text-sm">{view.icon}</span>
                  ) : (
                    <div className="mr-2 w-3 h-3 rounded-full bg-primary/50" />
                  )}
                  {view.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

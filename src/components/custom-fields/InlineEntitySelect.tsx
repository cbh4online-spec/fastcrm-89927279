import { useState, useMemo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
}

interface InlineEntitySelectProps {
  label: string;
  icon?: ReactNode;
  value: string | null | undefined;
  displayValue?: string | null;
  secondaryInfo?: string | null;
  options: EntityOption[];
  onChange: (id: string | null) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function InlineEntitySelect({
  label,
  icon,
  value,
  displayValue,
  secondaryInfo,
  options,
  onChange,
  placeholder = "Selecionar...",
  isLoading,
}: InlineEntitySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(lowerSearch) ||
        opt.email?.toLowerCase().includes(lowerSearch) ||
        opt.phone?.includes(search)
    );
  }, [options, search]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-1 group">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-auto py-1 px-2 font-normal justify-between min-w-[180px] max-w-[280px]",
              !value && "text-muted-foreground"
            )}
          >
            <div className="flex flex-col items-start text-left truncate flex-1">
              {displayValue ? (
                <>
                  <span className="truncate font-medium">{displayValue}</span>
                  {secondaryInfo && (
                    <span className="text-xs text-muted-foreground truncate">
                      {secondaryInfo}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {value && (
                <X
                  className="h-3 w-3 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {search ? "Nenhum resultado encontrado" : "Sem opções disponíveis"}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 text-left rounded-md hover:bg-muted/50 transition-colors",
                      value === option.id && "bg-primary/10"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {option.name}
                      </div>
                      {(option.email || option.company || option.website) && (
                        <div className="text-xs text-muted-foreground truncate">
                          {option.email || option.company || option.website}
                        </div>
                      )}
                    </div>
                    {value === option.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          {value && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remover associação
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

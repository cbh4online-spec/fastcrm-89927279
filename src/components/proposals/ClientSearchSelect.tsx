import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Building2, User, Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import type { ClientType } from "./proposalConstants";

interface ClientOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
}

interface ClientSearchSelectProps {
  clientType: ClientType;
  value: string | null;
  onChange: (value: string | null, client: ClientOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientSearchSelect({
  clientType,
  value,
  onChange,
  placeholder = "Selecionar cliente...",
  disabled = false,
}: ClientSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { contacts, isLoading: loadingContacts } = useContacts();
  const { companies, isLoading: loadingCompanies } = useCompanies();

  const isLoading = clientType === "contact" ? loadingContacts : loadingCompanies;

  // Map data to common ClientOption format
  const options: ClientOption[] = useMemo(() => {
    if (clientType === "contact") {
      return (contacts || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        tax_id: c.tax_id,
        address: null, // Contacts may not have address field
      }));
    } else {
      return (companies || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        tax_id: c.tax_id,
        address: c.address,
      }));
    }
  }, [clientType, contacts, companies]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(searchLower) ||
        opt.email?.toLowerCase().includes(searchLower) ||
        opt.tax_id?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const selectedClient = options.find((opt) => opt.id === value);

  const handleSelect = (clientId: string) => {
    const client = options.find((opt) => opt.id === clientId);
    onChange(clientId, client || null);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null, null);
    setOpen(false);
    setSearch("");
  };

  const Icon = clientType === "company" ? Building2 : User;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {selectedClient ? (
              <span className="truncate">{selectedClient.name}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Pesquisar ${clientType === "contact" ? "contacto" : "empresa"}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">A carregar...</p>
              </div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>
                <div className="text-center py-4">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum {clientType === "contact" ? "contacto" : "empresa"} encontrado
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {value && (
                  <CommandItem
                    value="__clear__"
                    onSelect={handleClear}
                    className="text-muted-foreground"
                  >
                    <span>Limpar seleção</span>
                  </CommandItem>
                )}
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={handleSelect}
                    className="flex items-center gap-3"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{option.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {option.email && <span className="truncate">{option.email}</span>}
                        {option.tax_id && (
                          <>
                            <span>•</span>
                            <span>NIF: {option.tax_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

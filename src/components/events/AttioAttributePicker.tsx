import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus, Type, Hash, CheckSquare, Calendar, List, ListChecks,
  DollarSign, Activity, MapPin, Phone, Link, Mail, User, Database,
  ChevronRight, ArrowLeft, Search
} from "lucide-react";

const FIELD_TYPES = [
  { type: "text", label: "Texto", icon: Type },
  { type: "number", label: "Número", icon: Hash },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "date", label: "Data", icon: Calendar },
  { type: "select", label: "Select", icon: List },
  { type: "multi_select", label: "Multi-select", icon: ListChecks },
  { type: "currency", label: "Moeda", icon: DollarSign },
  { type: "status", label: "Status", icon: Activity },
  { type: "location", label: "Localização", icon: MapPin },
  { type: "phone", label: "Telefone", icon: Phone },
  { type: "url", label: "URL", icon: Link },
  { type: "email", label: "Email", icon: Mail },
  { type: "user", label: "Utilizador", icon: User },
  { type: "record", label: "Registo", icon: Database },
];

export interface AttributeField {
  id: string;
  name: string;
  field_type: string;
  count?: number;
}

interface AttioAttributePickerProps {
  existingFields: AttributeField[];
  onCreateField: (name: string, fieldType: string) => void;
  onSelectField?: (field: AttributeField) => void;
  trigger?: React.ReactNode;
}

export function AttioAttributePicker({
  existingFields,
  onCreateField,
  onSelectField,
  trigger,
}: AttioAttributePickerProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"list" | "types" | "naming">("list");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<typeof FIELD_TYPES[0] | null>(null);
  const [newFieldName, setNewFieldName] = useState("");

  const filtered = existingFields.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const fieldTypeIcon = (type: string) => {
    const ft = FIELD_TYPES.find((t) => t.type === type);
    return ft ? ft.icon : Type;
  };

  const handleCreate = () => {
    if (!newFieldName.trim() || !selectedType) return;
    onCreateField(newFieldName.trim(), selectedType.type);
    setNewFieldName("");
    setSelectedType(null);
    setPanel("list");
  };

  const resetAndClose = () => {
    setPanel("list");
    setSearch("");
    setSelectedType(null);
    setNewFieldName("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Atributo
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="flex min-h-[320px]">
          {/* Left: Type selection panel */}
          {(panel === "types" || panel === "naming") && (
            <div className="w-full border-r border-border">
              {panel === "types" && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                    <button onClick={() => setPanel("list")} className="text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-foreground">Tipo de atributo</span>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <div className="p-1.5">
                      {FIELD_TYPES.map((ft) => (
                        <button
                          key={ft.type}
                          onClick={() => { setSelectedType(ft); setPanel("naming"); }}
                          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          <ft.icon className="h-4 w-4 text-muted-foreground" />
                          {ft.label}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
              {panel === "naming" && selectedType && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                    <button onClick={() => setPanel("types")} className="text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <selectedType.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{selectedType.label}</span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nome do atributo</label>
                      <Input
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder={`Ex: ${selectedType.label} personalizado`}
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        className="h-9"
                      />
                    </div>
                    <Button onClick={handleCreate} disabled={!newFieldName.trim()} size="sm" className="w-full">
                      Criar atributo
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Right: Existing fields list */}
          {panel === "list" && (
            <div className="w-full">
              <div className="px-3 py-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar atributos..."
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="h-[240px]">
                <div className="p-1.5">
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2.5 py-4 text-center">Sem atributos</p>
                  )}
                  {filtered.map((f) => {
                    const Icon = fieldTypeIcon(f.field_type);
                    return (
                      <button
                        key={f.id}
                        onClick={() => { onSelectField?.(f); resetAndClose(); }}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-left text-foreground truncate">{f.name}</span>
                        {f.count !== undefined && (
                          <span className="text-xs text-muted-foreground">{f.count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="border-t border-border p-1.5">
                <button
                  onClick={() => setPanel("types")}
                  className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-sm text-primary hover:bg-accent transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="flex-1 text-left">Criar novo atributo</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

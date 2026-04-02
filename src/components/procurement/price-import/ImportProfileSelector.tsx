import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Star, Loader2 } from "lucide-react";
import { ImportProfile } from "@/hooks/useSupplierImportProfiles";

interface ImportProfileSelectorProps {
  profiles: ImportProfile[];
  loading: boolean;
  selectedProfileId: string | null;
  onSelect: (profileId: string | null) => void;
  onCreateNew: () => void;
}

export function ImportProfileSelector({ profiles, loading, selectedProfileId, onSelect, onCreateNew }: ImportProfileSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> A carregar perfis...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Perfil de Importação</Label>
      <div className="flex gap-2">
        <Select
          value={selectedProfileId || "__none__"}
          onValueChange={v => onSelect(v === "__none__" ? null : v)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sem perfil (configurar manualmente)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Sem perfil —</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                  {p.name}
                  <Badge variant="outline" className="text-[10px] ml-1">{p.pricing_mode}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={onCreateNew} title="Criar novo perfil">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {selectedProfileId && (
        <p className="text-xs text-muted-foreground">
          O perfil pré-preenche mapping, modo de pricing e opções. Pode ajustar antes de validar.
        </p>
      )}
    </div>
  );
}

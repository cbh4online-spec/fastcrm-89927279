import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMetaFieldMappings } from "@/hooks/useMetaLeads";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";

const commonMetaFields = [
  "email", "phone_number", "full_name", "first_name", "last_name",
  "company_name", "job_title", "city", "state", "zip_code", "country",
];

const crmFields = [
  { value: "name", label: "Nome" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "company_name", label: "Empresa" },
  { value: "job_title", label: "Cargo" },
  { value: "city", label: "Cidade" },
  { value: "state", label: "Estado/Distrito" },
  { value: "zip_code", label: "Código Postal" },
  { value: "country", label: "País" },
  { value: "notes", label: "Notas" },
  { value: "source_details", label: "Detalhes da origem" },
];

const transformRules = [
  { value: "direct", label: "Direto" },
  { value: "phone_normalize", label: "Normalizar telefone" },
  { value: "email_lowercase", label: "Email minúsculas" },
  { value: "name_capitalize", label: "Capitalizar nome" },
];

export function MetaFieldMappingEditor() {
  const { data: mappings = [], isLoading, upsertMapping } = useMetaFieldMappings();
  const [newMapping, setNewMapping] = useState({
    meta_field_name: "",
    crm_field_name: "",
    crm_entity: "contact",
    transform_rule: "direct",
  });

  const handleAdd = () => {
    if (!newMapping.meta_field_name || !newMapping.crm_field_name) return;
    upsertMapping.mutate({
      meta_field_name: newMapping.meta_field_name,
      crm_field_name: newMapping.crm_field_name,
      crm_entity: newMapping.crm_entity,
      transform_rule: newMapping.transform_rule,
      form_id: null,
    });
    setNewMapping({ meta_field_name: "", crm_field_name: "", crm_entity: "contact", transform_rule: "direct" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mapeamento de Campos</h2>
        <p className="text-sm text-muted-foreground">
          Configure como os campos dos formulários Meta são mapeados para o CRM
        </p>
      </div>

      {/* Add new mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Mapeamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Campo Meta</label>
              <Select value={newMapping.meta_field_name} onValueChange={(v) => setNewMapping((p) => ({ ...p, meta_field_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {commonMetaFields.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Campo CRM</label>
              <Select value={newMapping.crm_field_name} onValueChange={(v) => setNewMapping((p) => ({ ...p, crm_field_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {crmFields.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidade</label>
              <Select value={newMapping.crm_entity} onValueChange={(v) => setNewMapping((p) => ({ ...p, crm_entity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contacto</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="company">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Transformação</label>
              <Select value={newMapping.transform_rule} onValueChange={(v) => setNewMapping((p) => ({ ...p, transform_rule: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {transformRules.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!newMapping.meta_field_name || !newMapping.crm_field_name}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapeamentos Ativos ({mappings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
          {!isLoading && mappings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum mapeamento personalizado. Os campos comuns (email, phone, full_name) são mapeados automaticamente.
            </p>
          )}
          <div className="space-y-2">
            {mappings.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-4 text-sm">
                  <code className="px-2 py-0.5 bg-muted rounded text-xs">{m.meta_field_name}</code>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{m.crm_field_name}</span>
                  <span className="text-xs text-muted-foreground">({m.crm_entity})</span>
                  {m.transform_rule !== "direct" && (
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                      {transformRules.find((r) => r.value === m.transform_rule)?.label || m.transform_rule}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

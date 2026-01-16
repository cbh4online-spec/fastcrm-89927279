import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Sparkles,
  Settings2,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useManagedFields } from "@/hooks/useManagedFields";
import { FieldList } from "./FieldList";
import { CreateFieldDialog } from "./CreateFieldDialog";
import { AISuggestFieldsDialog } from "./AISuggestFieldsDialog";
import { 
  ENTITY_TYPE_LABELS, 
  ORIGIN_LABELS,
  type FieldEntityType, 
  type FieldOrigin 
} from "@/types/fieldManager";

export function FieldManagerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<FieldEntityType | "all">("all");
  const [selectedOrigin, setSelectedOrigin] = useState<FieldOrigin | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [preselectedEntity, setPreselectedEntity] = useState<FieldEntityType | undefined>();

  const { data: fields = [], isLoading } = useManagedFields(
    selectedEntity === "all" ? undefined : selectedEntity,
    showArchived
  );

  // Filter fields
  const filteredFields = fields.filter(field => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !field.name.toLowerCase().includes(query) &&
        !field.label.toLowerCase().includes(query) &&
        !field.internal_name.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Origin filter
    if (selectedOrigin !== "all" && field.origin !== selectedOrigin) {
      return false;
    }

    // Visibility filter
    if (visibilityFilter === "visible" && !field.is_visible) return false;
    if (visibilityFilter === "hidden" && field.is_visible) return false;

    // Archived filter
    if (!showArchived && field.is_archived) return false;

    return true;
  });

  // Group fields by entity
  const groupedFields = filteredFields.reduce((acc, field) => {
    const entity = field.entity_type;
    if (!acc[entity]) acc[entity] = [];
    acc[entity].push(field);
    return acc;
  }, {} as Record<FieldEntityType, typeof filteredFields>);

  const entityTypes: FieldEntityType[] = ['contact', 'company', 'opportunity', 'product', 'financial', 'proposal', 'document'];

  const handleCreateForEntity = (entity: FieldEntityType) => {
    setPreselectedEntity(entity);
    setCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestor de Campos</h2>
          <p className="text-muted-foreground">
            Gerencie campos personalizados, formatação e permissões para cada entidade do CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Sugerir com IA
          </Button>
          <Button onClick={() => {
            setPreselectedEntity(undefined);
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Campo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar campos..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Select value={selectedEntity} onValueChange={(v) => setSelectedEntity(v as FieldEntityType | "all")}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Entidades</SelectItem>
                {entityTypes.map(entity => (
                  <SelectItem key={entity} value={entity}>
                    {ENTITY_TYPE_LABELS[entity]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedOrigin} onValueChange={(v) => setSelectedOrigin(v as FieldOrigin | "all")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Origens</SelectItem>
                {Object.entries(ORIGIN_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as "all" | "visible" | "hidden")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Visibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="visible">Visíveis</SelectItem>
                <SelectItem value="hidden">Ocultos</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  A mostrar arquivados
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Mostrar arquivados
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{fields.length}</div>
            <p className="text-sm text-muted-foreground">Total de Campos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {fields.filter(f => f.origin === 'manual').length}
            </div>
            <p className="text-sm text-muted-foreground">Criados Manualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {fields.filter(f => f.origin === 'import').length}
            </div>
            <p className="text-sm text-muted-foreground">Via Importação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {fields.filter(f => f.origin === 'ai').length}
            </div>
            <p className="text-sm text-muted-foreground">Sugeridos por IA</p>
          </CardContent>
        </Card>
      </div>

      {/* Fields by Entity */}
      {selectedEntity === "all" ? (
        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            {entityTypes.map(entity => (
              <TabsTrigger 
                key={entity} 
                value={entity}
                className="flex-1 min-w-[120px]"
              >
                {ENTITY_TYPE_LABELS[entity]}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {groupedFields[entity]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {entityTypes.map(entity => (
            <TabsContent key={entity} value={entity}>
              <FieldList 
                fields={groupedFields[entity] || []} 
                entityType={entity}
                isLoading={isLoading}
                onCreateField={() => handleCreateForEntity(entity)}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <FieldList 
          fields={filteredFields} 
          entityType={selectedEntity}
          isLoading={isLoading}
          onCreateField={() => handleCreateForEntity(selectedEntity)}
        />
      )}

      <CreateFieldDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        preselectedEntity={preselectedEntity}
      />

      <AISuggestFieldsDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
      />
    </div>
  );
}

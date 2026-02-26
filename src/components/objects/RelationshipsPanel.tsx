import { useState } from "react";
import { useObjectRelationships, useCreateRelationship, useDeleteRelationship, ObjectRelationship } from "@/hooks/useObjectRelationships";
import { useCustomObjects, useObjectRecords } from "@/hooks/useCustomObjects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getIconByName } from "@/lib/icons";
import { Link2, Plus, X, Loader2, Unlink, User, Building2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Props {
  recordId: string;
  objectId?: string;
  entityType?: string;
}

// Core object definitions for relationship form
const CORE_OBJECTS = [
  { id: '__core_contacts', name: 'Contactos', table: 'contacts', nameField: 'name', icon: 'User', slug: 'contacts', routePrefix: '/dashboard/contacts' },
  { id: '__core_companies', name: 'Empresas', table: 'companies', nameField: 'name', icon: 'Building2', slug: 'companies', routePrefix: '/dashboard/companies' },
  { id: '__core_opportunities', name: 'Oportunidades', table: 'opportunities', nameField: 'title', icon: 'Target', slug: 'opportunities', routePrefix: '/dashboard/opportunities' },
];

// Map entityType to core object id for source resolution
const ENTITY_TYPE_TO_CORE_ID: Record<string, string> = {
  contact: '__core_contacts',
  company: '__core_companies',
  lead: '__core_contacts',
};

function getRecordDisplayName(data: Record<string, unknown> | undefined): string {
  if (!data) return "Sem nome";
  for (const key of ["name", "nome", "title", "titulo", "subject", "project_name", "product_name"]) {
    if (data[key] && typeof data[key] === "string") return data[key] as string;
  }
  const firstStr = Object.values(data).find((v) => typeof v === "string" && v.trim());
  return (firstStr as string) || "Sem nome";
}

function useCoreRecords(coreObjectId: string | null) {
  const coreDef = CORE_OBJECTS.find(c => c.id === coreObjectId);
  return useQuery({
    queryKey: ['core-records-for-rel', coreObjectId],
    queryFn: async () => {
      if (!coreDef) return [];
      const { data, error } = await supabase
        .from(coreDef.table as any)
        .select(`id, ${coreDef.nameField}`)
        .order(coreDef.nameField)
        .limit(200);
      if (error) throw error;
      return (data || []).map((r: any) => ({ id: r.id, name: r[coreDef.nameField] || 'Sem nome' }));
    },
    enabled: !!coreDef,
  });
}

export function RelationshipsPanel({ recordId, objectId, entityType }: Props) {
  const navigate = useNavigate();
  const { data: relationships = [], isLoading } = useObjectRelationships(recordId);
  const deleteRelationship = useDeleteRelationship();
  const [showAdd, setShowAdd] = useState(false);

  // Resolve effective objectId: use provided or derive from entityType
  const effectiveObjectId = objectId || (entityType ? ENTITY_TYPE_TO_CORE_ID[entityType] : undefined);

  // Group relationships by object type
  const grouped = relationships.reduce<Record<string, ObjectRelationship[]>>((acc, rel) => {
    const isSource = rel.source_record_id === recordId;
    const objName = isSource ? rel.target_object_name : rel.source_object_name;
    const key = objName || "Outros";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rel);
    return acc;
  }, {});

  const handleNavigate = (rel: ObjectRelationship) => {
    const isSource = rel.source_record_id === recordId;
    const linkedSlug = isSource ? rel.target_object_slug : rel.source_object_slug;
    const linkedRecordId = isSource ? rel.target_record_id : rel.source_record_id;
    
    // Check if it's a core object route
    const coreDef = CORE_OBJECTS.find(c => c.slug === linkedSlug);
    if (coreDef) {
      navigate(`${coreDef.routePrefix}/${linkedRecordId}`);
    } else if (linkedSlug) {
      navigate(`/objects/${linkedSlug}/${linkedRecordId}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Relações
        </h4>
        {effectiveObjectId && (
          <Popover open={showAdd} onOpenChange={setShowAdd}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <AddRelationshipForm
                recordId={recordId}
                objectId={effectiveObjectId}
                onDone={() => setShowAdd(false)}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : relationships.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhuma relação ainda.</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([objName, rels]) => (
            <div key={objName}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{objName}</p>
              <div className="space-y-1">
                {rels.map((rel) => {
                  const isSource = rel.source_record_id === recordId;
                  const linkedData = isSource ? rel.target_record_data : rel.source_record_data;
                  const linkedIcon = isSource ? rel.target_object_icon : rel.source_object_icon;
                  const IconComp = getIconByName(linkedIcon || "Package");

                  return (
                    <div key={rel.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group">
                      <IconComp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => handleNavigate(rel)}
                        className="text-sm text-foreground hover:underline truncate flex-1 text-left"
                      >
                        {getRecordDisplayName(linkedData)}
                      </button>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {rel.relationship_type === "related_to" ? "Relacionado" : rel.relationship_type === "parent_of" ? "Pai de" : rel.relationship_type === "child_of" ? "Filho de" : rel.relationship_type}
                      </Badge>
                      <button
                        onClick={() => deleteRelationship.mutate({ id: rel.id, recordId })}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-opacity duration-150"
                      >
                        <Unlink className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddRelationshipForm({ recordId, objectId, onDone }: { recordId: string; objectId: string; onDone: () => void }) {
  const { data: customObjects = [] } = useCustomObjects();
  const createRelationship = useCreateRelationship();
  const [targetObjectId, setTargetObjectId] = useState("");
  const [targetRecordId, setTargetRecordId] = useState("");
  const [relationType, setRelationType] = useState("related_to");
  const [search, setSearch] = useState("");

  const isCoreTarget = targetObjectId.startsWith('__core_');
  const { data: coreRecords = [] } = useCoreRecords(isCoreTarget ? targetObjectId : null);
  const { data: customRecords = [] } = useObjectRecords(!isCoreTarget && targetObjectId ? targetObjectId : null);

  // Unified record list
  const allRecords = isCoreTarget
    ? coreRecords.filter(r => r.id !== recordId).map(r => ({ id: r.id, displayName: r.name }))
    : customRecords.filter(r => r.id !== recordId).map(r => ({ id: r.id, displayName: getRecordDisplayName(r.data as Record<string, unknown>) }));

  const filteredRecords = allRecords.filter((r) => {
    if (!search) return true;
    return r.displayName.toLowerCase().includes(search.toLowerCase());
  });

  // All available target objects: core + custom
  const allTargetObjects = [
    ...CORE_OBJECTS.filter(c => c.id !== objectId).map(c => ({ id: c.id, name: c.name })),
    ...customObjects.map(o => ({ id: o.id, name: o.name })),
  ];

  const handleCreate = () => {
    if (!targetObjectId || !targetRecordId) return;
    
    // For core objects, we need to resolve to a real UUID or use the core ID
    // The object_relationships table stores object IDs - for core objects we use the pseudo-ID
    createRelationship.mutate(
      {
        source_object_id: objectId,
        source_record_id: recordId,
        target_object_id: targetObjectId,
        target_record_id: targetRecordId,
        relationship_type: relationType,
      },
      { onSuccess: () => { onDone(); setTargetObjectId(""); setTargetRecordId(""); } }
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tipo de Objeto</Label>
        <Select value={targetObjectId} onValueChange={(v) => { setTargetObjectId(v); setTargetRecordId(""); setSearch(""); }}>
          <SelectTrigger className="h-8 text-xs mt-1">
            <SelectValue placeholder="Selecionar objeto..." />
          </SelectTrigger>
          <SelectContent>
            {allTargetObjects.map((obj) => (
              <SelectItem key={obj.id} value={obj.id}>{obj.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {targetObjectId && (
        <>
          <div>
            <Label className="text-xs">Registo</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="h-8 text-xs mt-1"
            />
            <div className="max-h-32 overflow-y-auto mt-1 space-y-0.5">
              {filteredRecords.slice(0, 20).map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => setTargetRecordId(rec.id)}
                  className={cn(
                    "w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors",
                    targetRecordId === rec.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                  )}
                >
                  {rec.displayName}
                </button>
              ))}
              {filteredRecords.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">Nenhum registo encontrado</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Tipo de Relação</Label>
            <Select value={relationType} onValueChange={setRelationType}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="related_to">Relacionado</SelectItem>
                <SelectItem value="parent_of">Pai de</SelectItem>
                <SelectItem value="child_of">Filho de</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            className="w-full text-xs"
            disabled={!targetRecordId || createRelationship.isPending}
            onClick={handleCreate}
          >
            {createRelationship.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Criar Relação
          </Button>
        </>
      )}
    </div>
  );
}

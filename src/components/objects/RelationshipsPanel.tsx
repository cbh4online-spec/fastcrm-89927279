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
import { Link2, Plus, X, Loader2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Props {
  recordId: string;
  objectId?: string;
  entityType?: string;
}

function getRecordDisplayName(data: Record<string, unknown> | undefined): string {
  if (!data) return "Sem nome";
  // Try common name fields
  for (const key of ["name", "nome", "title", "titulo", "subject", "project_name", "product_name"]) {
    if (data[key] && typeof data[key] === "string") return data[key] as string;
  }
  // Fallback to first string value
  const firstStr = Object.values(data).find((v) => typeof v === "string" && v.trim());
  return (firstStr as string) || "Sem nome";
}

export function RelationshipsPanel({ recordId, objectId, entityType }: Props) {
  const navigate = useNavigate();
  const { data: relationships = [], isLoading } = useObjectRelationships(recordId);
  const deleteRelationship = useDeleteRelationship();
  const [showAdd, setShowAdd] = useState(false);

  // Group relationships by object type
  const grouped = relationships.reduce<Record<string, ObjectRelationship[]>>((acc, rel) => {
    const isSource = rel.source_record_id === recordId;
    const objName = isSource ? rel.target_object_name : rel.source_object_name;
    const key = objName || "Outros";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rel);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Relações
        </h4>
        {objectId && (
          <Popover open={showAdd} onOpenChange={setShowAdd}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <AddRelationshipForm
                recordId={recordId}
                objectId={objectId}
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
                  const linkedSlug = isSource ? rel.target_object_slug : rel.source_object_slug;
                  const linkedRecordId = isSource ? rel.target_record_id : rel.source_record_id;
                  const linkedIcon = isSource ? rel.target_object_icon : rel.source_object_icon;
                  const IconComp = getIconByName(linkedIcon || "Package");

                  return (
                    <div key={rel.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group">
                      <IconComp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => linkedSlug && navigate(`/objects/${linkedSlug}/${linkedRecordId}`)}
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

  const { data: targetRecords = [] } = useObjectRecords(targetObjectId || null);

  const filteredRecords = targetRecords.filter((r) => {
    if (!search) return true;
    const data = r.data as Record<string, unknown>;
    return Object.values(data).some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()));
  });

  const handleCreate = () => {
    if (!targetObjectId || !targetRecordId) return;
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
            {customObjects.map((obj) => (
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
              {filteredRecords.slice(0, 20).map((rec) => {
                const data = rec.data as Record<string, unknown>;
                const name = getRecordDisplayName(data);
                return (
                  <button
                    key={rec.id}
                    onClick={() => setTargetRecordId(rec.id)}
                    className={cn(
                      "w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors",
                      targetRecordId === rec.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                    )}
                  >
                    {name}
                  </button>
                );
              })}
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

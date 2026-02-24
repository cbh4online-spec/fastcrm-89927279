import { useState } from "react";
import { useCustomObjects, useCreateCustomObject, useDeleteCustomObject, useObjectRecords, useCreateObjectRecord, useDeleteObjectRecord } from "@/hooks/useCustomObjects";
import { useCoreObjectFields, CoreObjectField } from "@/hooks/useCoreObjectFields";
import { CoreObjectView } from "@/hooks/useCoreObjectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Box, Trash2, Loader2, ChevronRight, Database, Settings, Eye } from "lucide-react";
import { ObjectFieldBuilder } from "./ObjectFieldBuilder";
import { DynamicRecordForm } from "./DynamicRecordForm";
import { DynamicRecordTable } from "./DynamicRecordTable";
import { ObjectViewsManager } from "./ObjectViewsManager";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { cn } from "@/lib/utils";

export function CustomObjectsManager() {
  const { data: objects, isLoading } = useCustomObjects();
  const createObject = useCreateCustomObject();
  const deleteObject = useDeleteCustomObject();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const selectedObject = objects?.find((o) => o.id === selectedObjectId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    createObject.mutate(
      { name: newName, slug, description: newDesc || undefined },
      { onSuccess: () => { setShowCreate(false); setNewName(""); setNewDesc(""); } }
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Custom Objects</h3>
          <p className="text-sm text-muted-foreground">Crie e gerencie seus próprios tipos de dados</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Novo Objeto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Objeto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Projetos, Tickets, Produtos" /></div>
              <div><Label>Descrição (opcional)</Label><Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="O que este objeto representa?" /></div>
              <Button onClick={handleCreate} disabled={!newName.trim() || createObject.isPending} className="w-full">
                {createObject.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Objeto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!objects || objects.length === 0) ? (
        <Card><CardContent className="py-12 text-center"><Box className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">Nenhum objeto ainda. Crie um para começar.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {objects.map((obj) => (
            <Card key={obj.id} className={cn("cursor-pointer hover:shadow-md transition-shadow", selectedObjectId === obj.id && "ring-2 ring-primary")} onClick={() => setSelectedObjectId(selectedObjectId === obj.id ? null : obj.id)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: obj.color + "20", color: obj.color }}><Box className="h-4 w-4" /></div>
                    <div>
                      <p className="font-medium text-sm">{obj.name}</p>
                      {obj.description && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{obj.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {obj.is_system && <Badge variant="outline" className="text-[10px]">System</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedObject && (
        <ObjectRecordsView
          object={selectedObject}
          onDelete={() => { deleteObject.mutate(selectedObject.id); setSelectedObjectId(null); }}
        />
      )}
    </div>
  );
}

function ObjectRecordsView({ object, onDelete }: { object: any; onDelete: () => void }) {
  const { data: records, isLoading } = useObjectRecords(object.id);
  const { data: fields } = useCoreObjectFields(object.id);
  const createRecord = useCreateObjectRecord();
  const deleteRecord = useDeleteObjectRecord();
  const [showAdd, setShowAdd] = useState(false);
  const [activeView, setActiveView] = useState<CoreObjectView | null>(null);
  const [activeTab, setActiveTab] = useState("records");

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          {object.name}
          <Badge variant="secondary" className="text-xs">{records?.length || 0} registros</Badge>
        </h4>
        <div className="flex gap-2">
          {!object.is_system && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records" className="gap-1.5"><Database className="h-3.5 w-3.5" /> Registros</TabsTrigger>
          <TabsTrigger value="fields" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Campos</TabsTrigger>
          <TabsTrigger value="views" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Views</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Adicionar Registro
            </Button>
          </div>

          {showAdd && (
            <DynamicRecordForm
              fields={fields || []}
              onSubmit={(data) => {
                createRecord.mutate(
                  { object_id: object.id, data },
                  { onSuccess: () => setShowAdd(false) }
                );
              }}
              isPending={createRecord.isPending}
            />
          )}

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (!records || records.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro ainda</p>
          ) : (
            <DynamicRecordTable
              fields={fields || []}
              records={records}
              visibleFields={activeView?.visible_fields}
              onDeleteRecord={(id) => deleteRecord.mutate({ id, object_id: object.id })}
            />
          )}

          <UnifiedTimeline entityType={object.slug} limit={10} />
        </TabsContent>

        <TabsContent value="fields">
          <ObjectFieldBuilder objectId={object.id} />
        </TabsContent>

        <TabsContent value="views">
          <ObjectViewsManager objectId={object.id} activeViewId={activeView?.id || null} onSelectView={setActiveView} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

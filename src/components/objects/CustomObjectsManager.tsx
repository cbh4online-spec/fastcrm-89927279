import { useState } from "react";
import { useCustomObjects, useCreateCustomObject, useDeleteCustomObject, useObjectRecords, useCreateObjectRecord, useDeleteObjectRecord } from "@/hooks/useCustomObjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Box, Trash2, Loader2, ChevronRight } from "lucide-react";
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
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewDesc("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Custom Objects</h3>
          <p className="text-sm text-muted-foreground">Create and manage your own data types</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Object
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Object</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Projects, Tickets, Products"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What does this object represent?"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createObject.isPending}
                className="w-full"
              >
                {createObject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Object
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!objects || objects.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Box className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No custom objects yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {objects.map((obj) => (
            <Card
              key={obj.id}
              className={cn(
                "cursor-pointer hover:shadow-md transition-shadow",
                selectedObjectId === obj.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedObjectId(selectedObjectId === obj.id ? null : obj.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: obj.color + "20", color: obj.color }}
                    >
                      <Box className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{obj.name}</p>
                      {obj.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{obj.description}</p>
                      )}
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

      {/* Selected object records */}
      {selectedObject && (
        <ObjectRecordsView object={selectedObject} onDelete={() => {
          deleteObject.mutate(selectedObject.id);
          setSelectedObjectId(null);
        }} />
      )}
    </div>
  );
}

function ObjectRecordsView({ object, onDelete }: { object: any; onDelete: () => void }) {
  const { data: records, isLoading } = useObjectRecords(object.id);
  const createRecord = useCreateObjectRecord();
  const deleteRecord = useDeleteObjectRecord();
  const [showAdd, setShowAdd] = useState(false);
  const [newData, setNewData] = useState<Record<string, string>>({ name: "", notes: "" });

  const handleAdd = () => {
    createRecord.mutate(
      { object_id: object.id, data: newData },
      { onSuccess: () => { setShowAdd(false); setNewData({ name: "", notes: "" }); } }
    );
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold flex items-center gap-2">
            {object.name}
            <Badge variant="secondary" className="text-xs">{records?.length || 0} records</Badge>
          </h4>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Record
          </Button>
          {!object.is_system && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newData.name} onChange={(e) => setNewData({ ...newData, name: e.target.value })} placeholder="Record name" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={newData.notes} onChange={(e) => setNewData({ ...newData, notes: e.target.value })} placeholder="Optional notes" />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={!newData.name || createRecord.isPending}>
              {createRecord.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (!records || records.length === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-6">No records yet</p>
      ) : (
        <div className="rounded-lg border bg-card">
          {records.map((record) => (
            <div key={record.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/50">
              <div>
                <p className="text-sm font-medium">{(record.data as any)?.name || "Untitled"}</p>
                {(record.data as any)?.notes && (
                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">{(record.data as any).notes}</p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteRecord.mutate({ id: record.id, object_id: object.id })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <UnifiedTimeline entityType={object.slug} limit={10} />
    </div>
  );
}

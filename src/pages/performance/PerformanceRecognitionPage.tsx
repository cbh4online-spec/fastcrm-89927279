import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePerformanceRecognition, useCreateRecognition, RECOGNITION_TYPES } from "@/hooks/usePerformanceRecognition";
import { Trophy, Plus, Award } from "lucide-react";
import { toast } from "sonner";

export default function PerformanceRecognitionPage() {
  const { data: recognitions, isLoading } = usePerformanceRecognition(50);
  const createRecognition = useCreateRecognition();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    recognition_type: "closer_of_month",
    description: "",
    reward_type: "badge",
  });

  const handleCreate = async () => {
    if (!form.title) { toast.error("Preenche o título"); return; }
    await createRecognition.mutateAsync(form as any);
    toast.success("Reconhecimento criado!");
    setShowCreate(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Reconhecimentos" description="Celebrar conquistas baseadas em dados" />
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Reconhecimento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Reconhecimento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ex: Closer do Mês — Março" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.recognition_type} onValueChange={v => setForm(f => ({ ...f, recognition_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECOGNITION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <Button onClick={handleCreate} disabled={createRecognition.isPending} className="w-full">Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recognitions?.map(r => {
            const typeInfo = RECOGNITION_TYPES.find(t => t.value === r.recognition_type);
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 pb-4 text-center space-y-3">
                  <span className="text-4xl">{typeInfo?.icon || "🏆"}</span>
                  <div>
                    <p className="font-semibold">{r.title}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{typeInfo?.label || r.recognition_type}</Badge>
                  </div>
                  {r.user_name && (
                    <div className="flex items-center justify-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={r.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{r.user_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{r.user_name}</span>
                    </div>
                  )}
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!recognitions?.length && !isLoading && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Sem reconhecimentos. Cria o primeiro!</CardContent></Card>
        )}
      </div>
    </DashboardLayout>
  );
}

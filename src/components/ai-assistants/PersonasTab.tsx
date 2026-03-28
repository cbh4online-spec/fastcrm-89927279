/**
 * Personas Tab - Full AI Persona management with advanced fields,
 * test chat, AI generation, and status management.
 */

import { useState } from "react";
import { useAIPersonas, useCreatePersona, useUpdatePersona, useDeletePersona, useSetDefaultPersona } from "@/hooks/useAIPersonas";
import { useVibeProfiles } from "@/hooks/useVibeProfiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, Edit, Trash2, Sparkles, Star, StarOff, MessageSquare, Inbox, Bot, Globe, Wand2 } from "lucide-react";
import type { AIPersona, PersonaRole, PersonaStatus } from "@/types/ai-assistants";
import { PersonaTestChat } from "./PersonaTestChat";
import { GeneratePersonaDialog } from "./GeneratePersonaDialog";

interface PersonasTabProps {
  searchValue: string;
}

const ROLE_LABELS: Record<PersonaRole, string> = {
  assistant: "Assistente",
  sales: "Vendas",
  support: "Suporte",
  onboarding: "Onboarding",
};

const STATUS_LABELS: Record<PersonaStatus, string> = {
  active: "Ativo",
  draft: "Rascunho",
  archived: "Arquivado",
};

const STATUS_VARIANTS: Record<PersonaStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

export function PersonasTab({ searchValue }: PersonasTabProps) {
  const { data: personas = [], isLoading } = useAIPersonas();
  const { profiles: vibeProfiles } = useVibeProfiles();
  const createMutation = useCreatePersona();
  const updateMutation = useUpdatePersona();
  const deleteMutation = useDeletePersona();
  const setDefaultMutation = useSetDefaultPersona();

  const [showCreate, setShowCreate] = useState(false);
  const [editingPersona, setEditingPersona] = useState<AIPersona | null>(null);
  const [deletingPersona, setDeletingPersona] = useState<AIPersona | null>(null);
  const [testingPersona, setTestingPersona] = useState<AIPersona | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState<PersonaRole>("assistant");
  const [backstory, setBackstory] = useState("");
  const [expertiseDomain, setExpertiseDomain] = useState("");
  const [vibeProfileId, setVibeProfileId] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [activeInInbox, setActiveInInbox] = useState(false);
  const [activeInCopilot, setActiveInCopilot] = useState(false);
  const [activeInB2bPortal, setActiveInB2bPortal] = useState(false);

  const filteredPersonas = personas.filter(p =>
    p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setRole("assistant");
    setBackstory("");
    setExpertiseDomain("");
    setVibeProfileId("");
    setSystemPrompt("");
    setFallbackMessage("");
    setTemperature(0.7);
    setMaxTokens(512);
    setActiveInInbox(false);
    setActiveInCopilot(false);
    setActiveInB2bPortal(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      role,
      persona_type: role,
      backstory: backstory.trim() || undefined,
      expertise_domain: expertiseDomain.trim() || undefined,
      vibe_profile_id: vibeProfileId || undefined,
      system_prompt: systemPrompt.trim() || undefined,
      fallback_message: fallbackMessage.trim() || undefined,
      temperature,
      max_response_tokens: maxTokens,
      active_in_inbox: activeInInbox,
      active_in_copilot: activeInCopilot,
      active_in_b2b_portal: activeInB2bPortal,
    });
    setShowCreate(false);
    resetForm();
  };

  const handleEdit = (persona: AIPersona) => {
    setEditingPersona(persona);
    setName(persona.name);
    setDescription(persona.description || "");
    setRole(persona.role || "assistant");
    setBackstory(persona.backstory || "");
    setExpertiseDomain(persona.expertise_domain || "");
    setVibeProfileId(persona.vibe_profile_id || "");
    setSystemPrompt(persona.system_prompt || "");
    setFallbackMessage(persona.fallback_message || "");
    setTemperature(persona.temperature ?? 0.7);
    setMaxTokens(persona.max_response_tokens ?? 512);
    setActiveInInbox(persona.active_in_inbox ?? false);
    setActiveInCopilot(persona.active_in_copilot ?? false);
    setActiveInB2bPortal(persona.active_in_b2b_portal ?? false);
  };

  const handleUpdate = async () => {
    if (!editingPersona || !name.trim()) return;
    await updateMutation.mutateAsync({
      id: editingPersona.id,
      updates: {
        name: name.trim(),
        description: description.trim() || null,
        role,
        persona_type: role,
        backstory: backstory.trim() || null,
        expertise_domain: expertiseDomain.trim() || null,
        vibe_profile_id: vibeProfileId || null,
        system_prompt: systemPrompt.trim() || null,
        fallback_message: fallbackMessage.trim() || null,
        temperature,
        max_response_tokens: maxTokens,
        active_in_inbox: activeInInbox,
        active_in_copilot: activeInCopilot,
        active_in_b2b_portal: activeInB2bPortal,
      } as any,
    });
    setEditingPersona(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deletingPersona) return;
    await deleteMutation.mutateAsync(deletingPersona.id);
    setDeletingPersona(null);
  };

  const handleToggleStatus = async (persona: AIPersona) => {
    const newStatus: PersonaStatus = persona.status === "active" ? "draft" : "active";
    await updateMutation.mutateAsync({
      id: persona.id,
      updates: { status: newStatus } as any,
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  const PersonaForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Sofia - Vendas" />
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o papel desta persona..." rows={2} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as PersonaRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Domínio de Expertise</Label>
            <Input value={expertiseDomain} onChange={(e) => setExpertiseDomain(e.target.value)} placeholder="Ex: Imobiliário, SaaS, E-commerce" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Personality */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Personalidade</h4>
        <div className="space-y-2">
          <Label>Backstory</Label>
          <Textarea value={backstory} onChange={(e) => setBackstory(e.target.value)} placeholder="A história e personalidade da persona..." rows={3} />
        </div>
        <div className="space-y-2">
          <Label>Perfil de Vibe</Label>
          <Select value={vibeProfileId || "_none"} onValueChange={(v) => setVibeProfileId(v === "_none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar perfil (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Nenhum</SelectItem>
              {vibeProfiles.map(vp => (
                <SelectItem key={vp.id} value={vp.id}>{vp.name} ({vp.tone})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* AI Configuration */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Configuração IA</h4>
        <div className="space-y-2">
          <Label>System Prompt</Label>
          <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Instruções de sistema personalizadas..." rows={4} className="font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label>Mensagem de Fallback</Label>
          <Input value={fallbackMessage} onChange={(e) => setFallbackMessage(e.target.value)} placeholder="Mensagem quando não sabe responder..." />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperatura</Label>
              <span className="text-xs text-muted-foreground">{temperature.toFixed(2)}</span>
            </div>
            <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={1} step={0.05} />
            <p className="text-[10px] text-muted-foreground">Menor = mais previsível, Maior = mais criativo</p>
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} min={64} max={4096} step={64} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Activation Channels */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Ativar em</h4>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Inbox className="h-4 w-4 text-muted-foreground" /><Label className="cursor-pointer">Inbox</Label></div>
            <Switch checked={activeInInbox} onCheckedChange={setActiveInInbox} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-muted-foreground" /><Label className="cursor-pointer">Copilot</Label></div>
            <Switch checked={activeInCopilot} onCheckedChange={setActiveInCopilot} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><Label className="cursor-pointer">Portal B2B</Label></div>
            <Switch checked={activeInB2bPortal} onCheckedChange={setActiveInB2bPortal} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-background pb-1">
        <Button variant="outline" onClick={() => { isEdit ? setEditingPersona(null) : setShowCreate(false); resetForm(); }}>Cancelar</Button>
        <Button onClick={isEdit ? handleUpdate : handleCreate} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>
          {(createMutation.isPending || updateMutation.isPending) ? "A guardar..." : isEdit ? "Guardar" : "Criar"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowGenerate(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          Gerar com IA
        </Button>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Persona
        </Button>
      </div>

      {/* Empty State */}
      {personas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma persona criada</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Personas definem a personalidade e tom de voz dos agentes IA.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowGenerate(true)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar com IA
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Persona
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPersonas.map(persona => (
            <Card key={persona.id} className="hover:border-primary/30 transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center relative">
                      <Users className="h-5 w-5 text-primary" />
                      {persona.is_default && (
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{persona.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[persona.role || 'assistant']}</p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANTS[persona.status || 'draft']} className="text-[10px]">
                    {STATUS_LABELS[persona.status || 'draft']}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {persona.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{persona.description}</p>
                )}

                {/* Channel badges */}
                <div className="flex flex-wrap gap-1.5">
                  {persona.active_in_inbox && <Badge variant="outline" className="text-[10px] gap-1"><Inbox className="h-3 w-3" />Inbox</Badge>}
                  {persona.active_in_copilot && <Badge variant="outline" className="text-[10px] gap-1"><Bot className="h-3 w-3" />Copilot</Badge>}
                  {persona.active_in_b2b_portal && <Badge variant="outline" className="text-[10px] gap-1"><Globe className="h-3 w-3" />B2B</Badge>}
                  {persona.vibe_profile && <Badge variant="secondary" className="text-[10px]">{persona.vibe_profile.tone}</Badge>}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTestingPersona(persona)} title="Testar">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(persona)} title="Editar">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDefaultMutation.mutateAsync(persona.id)} title={persona.is_default ? "Persona padrão" : "Definir como padrão"}>
                      {persona.is_default ? <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" /> : <StarOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingPersona(persona)} title="Arquivar">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <Switch checked={persona.status === 'active'} onCheckedChange={() => handleToggleStatus(persona)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { if (!v) resetForm(); setShowCreate(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Persona</DialogTitle></DialogHeader>
          <PersonaForm />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPersona} onOpenChange={(v) => { if (!v) { setEditingPersona(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Persona</DialogTitle></DialogHeader>
          <PersonaForm isEdit />
        </DialogContent>
      </Dialog>

      {/* Generate with AI Dialog */}
      <GeneratePersonaDialog open={showGenerate} onOpenChange={setShowGenerate} />

      {/* Test Chat Dialog */}
      <Dialog open={!!testingPersona} onOpenChange={(v) => { if (!v) setTestingPersona(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Testar Persona</DialogTitle></DialogHeader>
          {testingPersona && <PersonaTestChat personaId={testingPersona.id} personaName={testingPersona.name} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPersona} onOpenChange={() => setDeletingPersona(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar persona?</AlertDialogTitle>
            <AlertDialogDescription>
              A persona "{deletingPersona?.name}" será arquivada. Agentes que a usam perderão esta associação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

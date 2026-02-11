import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCommunitySettings, useUpsertCommunitySettings, useCommunityLinks, useManageCommunityLinks } from "@/hooks/useCommunitySettings";
import { useSuggestCommunityCategory } from "@/hooks/useCommunityAI";
import { useMembershipQuestions, useAddMembershipQuestion, useUpdateMembershipQuestion, useDeleteMembershipQuestion } from "@/hooks/useMembershipQuestions";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings, Type, Link2, Mail, Palette, Plus, Trash2, Loader2,
  CreditCard, Eye, HelpCircle, Trophy, Compass, Upload, RefreshCw,
  MessageSquare, Calendar, Users, Heart, GraduationCap, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CommunitySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
}

const tabs = [
  { id: "details", label: "Detalhes", icon: Type },
  { id: "subscription", label: "Assinatura", icon: CreditCard },
  { id: "brand", label: "Marca", icon: Palette },
  { id: "theme", label: "Tema", icon: Palette },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "links", label: "Links", icon: Link2 },
  { id: "tabs", label: "Separadores", icon: Eye },
  { id: "questions", label: "Adesão", icon: HelpCircle },
  { id: "gamification", label: "Gamificação", icon: Trophy },
  { id: "discover", label: "Descobrir", icon: Compass },
] as const;

type TabId = (typeof tabs)[number]["id"];

const themePresets = [
  { id: "default", label: "Predefinição", color: "#6366f1" },
  { id: "citric-grey", label: "Cinzento Cítrico", color: "#84cc16" },
  { id: "royal-velvet", label: "Veludo Real", color: "#7c3aed" },
  { id: "ocean-blue", label: "Azul Oceano", color: "#0ea5e9" },
  { id: "sunset-coral", label: "Coral Pôr-do-Sol", color: "#f97316" },
  { id: "emerald", label: "Esmeralda", color: "#10b981" },
  { id: "rose-gold", label: "Rosa Dourado", color: "#f43f5e" },
  { id: "midnight", label: "Meia-Noite", color: "#1e293b" },
];

const visibleTabsConfig = [
  { key: "discussao", label: "Discussão", desc: "Feed principal de tópicos e posts", icon: MessageSquare },
  { key: "eventos", label: "Eventos", desc: "Lives e eventos agendados", icon: Calendar },
  { key: "classificacao", label: "Classificação", desc: "Tabela de pontuação", icon: BarChart3 },
  { key: "membros", label: "Membros", desc: "Lista de membros da comunidade", icon: Users },
  { key: "acerca", label: "Acerca de", desc: "Informações sobre a comunidade", icon: Heart },
  { key: "aprendizagem", label: "Aprendizagem", desc: "Conteúdos educativos", icon: GraduationCap },
];

export function CommunitySettingsDialog({ open, onOpenChange, workspaceId }: CommunitySettingsDialogProps) {
  const { data: settings } = useCommunitySettings(workspaceId);
  const upsert = useUpsertCommunitySettings(workspaceId);
  const { data: links = [] } = useCommunityLinks(workspaceId);
  const { addLink, removeLink } = useManageCommunityLinks(workspaceId);
  const suggestCategory = useSuggestCommunityCategory();
  const [tab, setTab] = useState<TabId>("details");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("");
  const [newsletterFreq, setNewsletterFreq] = useState("none");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [subscriptionType, setSubscriptionType] = useState("free");
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [themePreset, setThemePreset] = useState("default");
  const [visibleTabs, setVisibleTabs] = useState<Record<string, boolean>>({
    discussao: true, eventos: true, classificacao: true, membros: true, acerca: true, aprendizagem: true,
  });
  const [category, setCategory] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const faviconRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setDescription(settings.description || "");
      setSlug(settings.slug || "");
      setIsPrivate(settings.is_private);
      setPrimaryColor(settings.primary_color || "");
      setNewsletterFreq(settings.newsletter_frequency);
      setSubscriptionType((settings as any).subscription_type || "free");
      setSubscriptionPrice((settings as any).subscription_price?.toString() || "");
      setThemePreset((settings as any).theme_preset || "default");
      setCategory((settings as any).category || "");
      setIsDiscoverable((settings as any).is_discoverable || false);
      setCustomDomain((settings as any).custom_domain || "");
      if ((settings as any).visible_tabs) {
        setVisibleTabs((settings as any).visible_tabs);
      }
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate({
      name,
      description: description || null,
      slug: slug || null,
      is_private: isPrivate,
      primary_color: primaryColor || null,
      newsletter_frequency: newsletterFreq,
      subscription_type: subscriptionType,
      subscription_price: subscriptionPrice ? parseFloat(subscriptionPrice) : null,
      theme_preset: themePreset || null,
      visible_tabs: visibleTabs,
      category: category || null,
      is_discoverable: isDiscoverable,
      custom_domain: customDomain.trim() || null,
    } as any);
  };

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    addLink.mutate({ title: newLinkTitle, url: newLinkUrl });
    setNewLinkTitle("");
    setNewLinkUrl("");
  };

  const handleUpload = async (file: File, type: "favicon" | "banner") => {
    if (!workspaceId) return;
    const setter = type === "favicon" ? setUploadingFavicon : setUploadingBanner;
    setter(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${workspaceId}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("community-assets").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("community-assets").getPublicUrl(path);
      const field = type === "favicon" ? "logo_url" : "banner_url";
      upsert.mutate({ [field]: publicUrl } as any);
      toast.success(`${type === "favicon" ? "Favicon" : "Banner"} carregado!`);
    } catch {
      toast.error("Erro ao carregar ficheiro");
    } finally {
      setter(false);
    }
  };

  const handleSuggestCategory = () => {
    suggestCategory.mutate(
      { communityName: name, communityDescription: description },
      { onSuccess: (cat) => setCategory(cat) }
    );
  };

  const toggleVisibleTab = (key: string) => {
    setVisibleTabs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Definições da Comunidade
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Sidebar nav */}
          <ScrollArea className="w-44 shrink-0">
            <nav className="flex flex-col gap-1 pr-2">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                    tab === t.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <t.icon className="h-4 w-4 shrink-0" /> {t.label}
                </button>
              ))}
            </nav>
          </ScrollArea>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-2">
              {/* DETALHES */}
              {tab === "details" && (
                <>
                  <div className="space-y-2">
                    <Label>Nome da Comunidade</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: FastClub" />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug / URL</Label>
                    <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="fastclub" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a sua comunidade..." rows={3} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Comunidade Privada</p>
                      <p className="text-xs text-muted-foreground">Apenas membros convidados podem aceder</p>
                    </div>
                    <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                  </div>
                </>
              )}

              {/* ASSINATURA */}
              {tab === "subscription" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Defina o tipo de acesso à comunidade.</p>
                  <RadioGroup value={subscriptionType} onValueChange={setSubscriptionType} className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="free" id="free" />
                      <Label htmlFor="free" className="flex-1 cursor-pointer">
                        <p className="font-medium">Gratuito</p>
                        <p className="text-xs text-muted-foreground">Qualquer membro pode aceder sem pagamento</p>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="paid" id="paid" />
                      <Label htmlFor="paid" className="flex-1 cursor-pointer">
                        <p className="font-medium">Pago</p>
                        <p className="text-xs text-muted-foreground">Acesso mediante assinatura mensal</p>
                      </Label>
                    </div>
                  </RadioGroup>
                  {subscriptionType === "paid" && (
                    <div className="space-y-2">
                      <Label>Preço Mensal (€)</Label>
                      <Input type="number" min="0" step="0.01" value={subscriptionPrice} onChange={e => setSubscriptionPrice(e.target.value)} placeholder="9.99" />
                    </div>
                  )}
                </div>
              )}

              {/* MARCA */}
              {tab === "brand" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Favicon / Logo (1:1)</Label>
                    <div className="flex items-center gap-3">
                      {settings?.logo_url && (
                        <img src={settings.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-cover border" />
                      )}
                      <input ref={faviconRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], "favicon"); }} />
                      <Button variant="outline" size="sm" onClick={() => faviconRef.current?.click()} disabled={uploadingFavicon} className="gap-1.5">
                        {uploadingFavicon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Carregar
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Imagem de Capa (16:9)</Label>
                    <div className="space-y-2">
                      {settings?.banner_url && (
                        <img src={settings.banner_url} alt="Banner" className="w-full h-32 rounded-lg object-cover border" />
                      )}
                      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], "banner"); }} />
                      <Button variant="outline" size="sm" onClick={() => bannerRef.current?.click()} disabled={uploadingBanner} className="gap-1.5">
                        {uploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Carregar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TEMA */}
              {tab === "theme" && (
                <div className="space-y-4">
                  <Label>Tema Visual</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {themePresets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => { setThemePreset(preset.id); setPrimaryColor(preset.color); }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                          themePreset === preset.id ? "border-primary bg-primary/5" : "border-transparent hover:border-muted"
                        )}
                      >
                        <div className="h-8 w-8 rounded-full shadow-sm" style={{ backgroundColor: preset.color }} />
                        <span className="text-[11px] font-medium">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label>Cor Personalizada</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={primaryColor || "#6366f1"} onChange={e => { setPrimaryColor(e.target.value); setThemePreset("custom"); }} className="w-14 h-10 p-1" />
                      <Input value={primaryColor} onChange={e => { setPrimaryColor(e.target.value); setThemePreset("custom"); }} placeholder="#6366f1" className="flex-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* NEWSLETTER */}
              {tab === "newsletter" && (
                <div className="space-y-2">
                  <Label>Frequência do Resumo</Label>
                  <Select value={newsletterFreq} onValueChange={setNewsletterFreq}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Desligado</SelectItem>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Envia um resumo da actividade da comunidade aos membros.</p>
                </div>
              )}

              {/* LINKS */}
              {tab === "links" && (
                <>
                  <div className="space-y-2">
                    {links.map(link => (
                      <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{link.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeLink.mutate(link.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} placeholder="Título" className="flex-1" />
                    <Input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." className="flex-1" />
                    <Button size="icon" onClick={handleAddLink} disabled={addLink.isPending}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {/* SEPARADORES (VISIBLE TABS) */}
              {tab === "tabs" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Escolha quais separadores aparecem no hub.</p>
                  {visibleTabsConfig.map(vt => (
                    <div key={vt.key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <vt.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{vt.label}</p>
                          <p className="text-xs text-muted-foreground">{vt.desc}</p>
                        </div>
                      </div>
                      <Switch checked={visibleTabs[vt.key] !== false} onCheckedChange={() => toggleVisibleTab(vt.key)} />
                    </div>
                  ))}
                </div>
              )}

              {/* PERGUNTAS DE ADESÃO */}
              {tab === "questions" && (
                <QuestionsTabContent
                  workspaceId={workspaceId}
                  settings={settings}
                  upsert={upsert}
                />
              )}

              {/* GAMIFICAÇÃO */}
              {tab === "gamification" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Personalização dos níveis de fidelidade.</p>
                  {[
                    { name: "Bronze", points: "0-499", color: "bg-amber-500", pct: "60%" },
                    { name: "Silver", points: "500-1499", color: "bg-slate-400", pct: "25%" },
                    { name: "Gold", points: "1500-4999", color: "bg-yellow-500", pct: "10%" },
                    { name: "Platinum", points: "5000+", color: "bg-violet-500", pct: "5%" },
                  ].map(level => (
                    <div key={level.name} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={cn("h-8 w-8 rounded-full", level.color)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{level.name}</p>
                        <p className="text-xs text-muted-foreground">{level.points} pts · ~{level.pct} dos membros</p>
                      </div>
                      <Button variant="outline" size="sm">Editar</Button>
                    </div>
                  ))}
                </div>
              )}

              {/* DESCOBRIR (IA) */}
              {tab === "discover" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Comunidade Publicada</p>
                      <p className="text-xs text-muted-foreground">Torna a comunidade acessível publicamente via link</p>
                    </div>
                    <Switch checked={isDiscoverable} onCheckedChange={setIsDiscoverable} />
                  </div>

                  <div className="space-y-2">
                    <Label>Slug / URL da Comunidade</Label>
                    <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="fastclub" />
                  </div>

                  <div className="space-y-2">
                    <Label>Domínio / URL Base</Label>
                    <Input
                      value={customDomain}
                      onChange={e => setCustomDomain(e.target.value)}
                      placeholder="https://fastcrm.lovable.app"
                    />
                    <p className="text-xs text-muted-foreground">
                      Defina o domínio base para o link público. Ex: https://meudominio.com
                    </p>
                  </div>

                  {isDiscoverable && slug && (
                    <div className="space-y-2">
                      <Label>Link Público</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={`${customDomain.trim() || "https://fastcrm.lovable.app"}/club/${slug}`}
                          className="flex-1 text-xs bg-muted"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${(customDomain.trim() || "https://fastcrm.lovable.app")}/club/${slug}`);
                            toast.success("Link copiado!");
                          }}
                        >
                          Copiar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Visitantes podem ver a comunidade mas precisam registar-se para interagir.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <div className="flex gap-2">
                      <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Marketing Digital" className="flex-1" />
                      <Button variant="outline" size="icon" onClick={handleSuggestCategory} disabled={suggestCategory.isPending} title="Sugerir com IA">
                        {suggestCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Clique no botão para sugerir automaticamente via IA baseado no nome e descrição.</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
            {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// === Questions Tab CRUD Component ===
function QuestionsTabContent({ workspaceId, settings, upsert }: { workspaceId: string | undefined; settings: any; upsert: any }) {
  const { data: questions = [], isLoading } = useMembershipQuestions();
  const addQuestion = useAddMembershipQuestion();
  const updateQuestion = useUpdateMembershipQuestion();
  const deleteQuestion = useDeleteMembershipQuestion();

  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOptions, setNewOptions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("text");
  const [editOptions, setEditOptions] = useState("");

  const handleAdd = () => {
    if (!newText.trim()) return;
    addQuestion.mutate({
      question_text: newText.trim(),
      question_type: newType,
      options: newType === "select" ? newOptions.split(",").map(o => o.trim()).filter(Boolean) : undefined,
    });
    setNewText("");
    setNewType("text");
    setNewOptions("");
  };

  const handleStartEdit = (q: any) => {
    setEditingId(q.id);
    setEditText(q.question_text);
    setEditType(q.question_type);
    setEditOptions(q.options ? q.options.join(", ") : "");
  };

  const handleSaveEdit = (id: string) => {
    updateQuestion.mutate({
      id,
      question_text: editText.trim(),
      question_type: editType,
      options: editType === "select" ? editOptions.split(",").map(o => o.trim()).filter(Boolean) : null,
    });
    setEditingId(null);
  };

  const typeLabel = (t: string) => t === "text" ? "Texto" : t === "textarea" ? "Texto longo" : "Selecção";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-lg border">
        <div>
          <p className="text-sm font-medium">Perguntas de Adesão</p>
          <p className="text-xs text-muted-foreground">Novos membros respondem a perguntas ao aderir</p>
        </div>
        <Switch
          checked={settings?.membership_questions_enabled || false}
          onCheckedChange={(val) => upsert.mutate({ membership_questions_enabled: val } as any)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">A carregar...</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-3 rounded-lg border space-y-2">
              {editingId === q.id ? (
                <>
                  <Input value={editText} onChange={e => setEditText(e.target.value)} placeholder="Texto da pergunta" />
                  <div className="flex gap-2">
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="textarea">Texto longo</SelectItem>
                        <SelectItem value="select">Selecção</SelectItem>
                      </SelectContent>
                    </Select>
                    {editType === "select" && (
                      <Input value={editOptions} onChange={e => setEditOptions(e.target.value)} placeholder="Opção 1, Opção 2, ..." className="flex-1" />
                    )}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                    <Button size="sm" onClick={() => handleSaveEdit(q.id)}>Guardar</Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.question_text}</p>
                    <p className="text-[11px] text-muted-foreground">{typeLabel(q.question_type)}{q.options ? ` · ${(q.options as string[]).length} opções` : ""}</p>
                  </div>
                  <Switch
                    checked={q.is_active}
                    onCheckedChange={(val) => updateQuestion.mutate({ id: q.id, is_active: val })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => handleStartEdit(q)}>Editar</Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteQuestion.mutate(q.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new question */}
      <div className="p-3 rounded-lg border border-dashed space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Nova pergunta</p>
        <Input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Ex: Porque quer juntar-se à comunidade?" />
        <div className="flex gap-2">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="textarea">Texto longo</SelectItem>
              <SelectItem value="select">Selecção</SelectItem>
            </SelectContent>
          </Select>
          {newType === "select" && (
            <Input value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="Opção 1, Opção 2, ..." className="flex-1" />
          )}
          <Button size="sm" onClick={handleAdd} disabled={addQuestion.isPending || !newText.trim()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

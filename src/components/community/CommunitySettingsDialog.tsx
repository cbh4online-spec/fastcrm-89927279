import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommunitySettings, useUpsertCommunitySettings, useCommunityLinks, useManageCommunityLinks } from "@/hooks/useCommunitySettings";
import { Settings, Type, Link2, Mail, Palette, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunitySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
}

const tabs = [
  { id: "details", label: "Detalhes", icon: Type },
  { id: "brand", label: "Marca", icon: Palette },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "links", label: "Links", icon: Link2 },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CommunitySettingsDialog({ open, onOpenChange, workspaceId }: CommunitySettingsDialogProps) {
  const { data: settings } = useCommunitySettings(workspaceId);
  const upsert = useUpsertCommunitySettings(workspaceId);
  const { data: links = [] } = useCommunityLinks(workspaceId);
  const { addLink, removeLink } = useManageCommunityLinks(workspaceId);
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

  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setDescription(settings.description || "");
      setSlug(settings.slug || "");
      setIsPrivate(settings.is_private);
      setPrimaryColor(settings.primary_color || "");
      setNewsletterFreq(settings.newsletter_frequency);
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
    });
  };

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    addLink.mutate({ title: newLinkTitle, url: newLinkUrl });
    setNewLinkTitle("");
    setNewLinkUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Definições da Comunidade
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Sidebar nav */}
          <nav className="flex flex-col gap-1 w-40 shrink-0">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                  tab === t.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
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

            {tab === "brand" && (
              <>
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={primaryColor || "#6366f1"} onChange={e => setPrimaryColor(e.target.value)} className="w-14 h-10 p-1" />
                    <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#6366f1" className="flex-1" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Logo e banner podem ser configurados futuramente.</p>
              </>
            )}

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

            {tab === "links" && (
              <>
                <div className="space-y-2">
                  {links.map(link => (
                    <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeLink.mutate(link.id)}
                      >
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
          </div>
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

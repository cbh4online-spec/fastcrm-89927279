import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EyeOff, User, Mail, Image, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MemberPrivacySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    is_profile_public?: boolean;
    display_alias?: string | null;
    show_email?: boolean;
    show_avatar?: boolean;
  } | null;
  communitySettings?: {
    allow_anonymous_profiles?: boolean;
    force_anonymous?: boolean;
  } | null;
}

export function MemberPrivacySettings({ open, onOpenChange, member, communitySettings }: MemberPrivacySettingsProps) {
  const queryClient = useQueryClient();
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [displayAlias, setDisplayAlias] = useState("");
  const [showEmail, setShowEmail] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);

  useEffect(() => {
    if (member) {
      setIsProfilePublic(member.is_profile_public !== false);
      setDisplayAlias(member.display_alias || "");
      setShowEmail(member.show_email !== false);
      setShowAvatar(member.show_avatar !== false);
    }
  }, [member]);

  const updatePrivacy = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Sem membro");
      const { error } = await supabase
        .from("community_members")
        .update({
          is_profile_public: isProfilePublic,
          display_alias: displayAlias.trim() || null,
          show_email: showEmail,
          show_avatar: showAvatar,
        } as any)
        .eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community_members"] });
      queryClient.invalidateQueries({ queryKey: ["public-community-members"] });
      toast.success("Preferências de privacidade guardadas!");
      onOpenChange(false);
    },
    onError: () => toast.error("Erro ao guardar preferências"),
  });

  const forceAnonymous = communitySettings?.force_anonymous === true;
  const allowAnonymous = communitySettings?.allow_anonymous_profiles !== false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5" /> Privacidade do Perfil
          </DialogTitle>
        </DialogHeader>

        {forceAnonymous ? (
          <div className="rounded-lg border bg-muted/50 p-4 text-center space-y-2">
            <EyeOff className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Anonimato Total Ativo</p>
            <p className="text-xs text-muted-foreground">
              O administrador ativou o modo de anonimato total. Todos os perfis estão ocultos automaticamente.
            </p>
          </div>
        ) : !allowAnonymous ? (
          <div className="rounded-lg border bg-muted/50 p-4 text-center space-y-2">
            <User className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Perfis Anónimos Desativados</p>
            <p className="text-xs text-muted-foreground">
              O administrador não permite perfis anónimos nesta comunidade.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Perfil Visível</p>
                  <p className="text-xs text-muted-foreground">Aparecer na lista pública de membros</p>
                </div>
              </div>
              <Switch checked={isProfilePublic} onCheckedChange={setIsProfilePublic} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Pseudónimo (Alias)
              </Label>
              <Input
                value={displayAlias}
                onChange={e => setDisplayAlias(e.target.value)}
                placeholder="Ex: Membro Anónimo, Explorador..."
              />
              <p className="text-xs text-muted-foreground">
                Será usado em vez do seu nome real nos posts e comentários.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Visível</p>
                  <p className="text-xs text-muted-foreground">Outros membros podem ver o seu email</p>
                </div>
              </div>
              <Switch checked={showEmail} onCheckedChange={setShowEmail} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Image className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Avatar Visível</p>
                  <p className="text-xs text-muted-foreground">Mostrar a sua foto de perfil ou iniciais</p>
                </div>
              </div>
              <Switch checked={showAvatar} onCheckedChange={setShowAvatar} />
            </div>

            <Button
              onClick={() => updatePrivacy.mutate()}
              disabled={updatePrivacy.isPending}
              className="w-full gap-1.5"
            >
              {updatePrivacy.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Guardar Preferências
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

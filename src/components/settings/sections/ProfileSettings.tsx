import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatarUpload } from "@/components/shared/UserAvatarUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Loader2, LogOut, Save } from "lucide-react";

const COUNTRY_DIALS = [
  { code: "PT", label: "Portugal (+351)", dial: "+351" },
  { code: "ES", label: "Espanha (+34)", dial: "+34" },
  { code: "FR", label: "França (+33)", dial: "+33" },
  { code: "GB", label: "Reino Unido (+44)", dial: "+44" },
  { code: "DE", label: "Alemanha (+49)", dial: "+49" },
  { code: "BR", label: "Brasil (+55)", dial: "+55" },
  { code: "US", label: "EUA (+1)", dial: "+1" },
];

const COMMON_TIMEZONES = [
  "Europe/Lisbon", "Europe/London", "Europe/Madrid", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Sao_Paulo", "Asia/Tokyo", "Australia/Sydney",
];

function SectionCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-8 rounded-2xl border border-border/60 shadow-sm space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-5">{children}</div>
      {footer && <div className="pt-1">{footer}</div>}
    </Card>
  );
}

export function ProfileSettings() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const fullName =
    user?.user_metadata?.full_name ||
    `${user?.user_metadata?.first_name ?? ""} ${user?.user_metadata?.last_name ?? ""}`.trim();

  const [name, setName] = useState(fullName);
  const [phoneCountry, setPhoneCountry] = useState(
    user?.user_metadata?.phone_country || "PT"
  );
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [newsletter, setNewsletter] = useState<boolean>(
    user?.user_metadata?.newsletter_optin ?? true
  );
  const [timezone, setTimezone] = useState(
    user?.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [weekStart, setWeekStart] = useState(user?.user_metadata?.week_start || "monday");

  // Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    setIsLoading(true);
    try {
      const [first, ...rest] = name.trim().split(" ");
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          first_name: first,
          last_name: rest.join(" "),
          phone,
          phone_country: phoneCountry,
          newsletter_optin: newsletter,
          timezone,
          week_start: weekStart,
        },
      });
      if (error) throw error;
      toast.success("Perfil atualizado.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível atualizar o perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 8) {
      toast.error("A nova palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("As palavras-passe não coincidem.");
      return;
    }
    if (!user?.email) return;
    setPwdLoading(true);
    try {
      // Verify current
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      });
      if (signInErr) {
        toast.error("Palavra-passe atual incorreta.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Palavra-passe alterada com sucesso.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível alterar a palavra-passe.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as suas informações pessoais e configurações da conta
        </p>
      </header>

      {/* Dados do utilizador */}
      <SectionCard
        title="Dados do utilizador"
        description="Estes são os dados do seu utilizador e serão usados para efeitos de login e comunicação por e-mail ou SMS"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-600 font-medium">
              *Campos obrigatórios
            </span>
            <Button onClick={handleSaveProfile} disabled={isLoading} size="sm">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A guardar…</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Guardar alterações</>
              )}
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-4">
          <UserAvatarUpload
            currentAvatarUrl={user?.user_metadata?.avatar_url}
            userName={name || user?.email || "User"}
            size="lg"
          />
          <p className="text-xs text-muted-foreground">
            PNG ou JPG, até 2MB. Quadrada de preferência.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome<span className="text-emerald-600">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              E-mail<span className="text-emerald-600">*</span>
            </Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted/50" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Telefone</Label>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
            <Select value={phoneCountry} onValueChange={setPhoneCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_DIALS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
              placeholder="999999999"
              inputMode="tel"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={newsletter}
            onCheckedChange={(v) => setNewsletter(Boolean(v))}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground">
            Quero receber no e-mail novidades, dicas e descontos exclusivos.{" "}
            <a href="#" className="text-emerald-600 underline underline-offset-2 font-medium">
              Saber mais.
            </a>
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div className="space-y-2">
            <Label>Fuso horário</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Início da semana</Label>
            <Select value={weekStart} onValueChange={setWeekStart}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Segunda-feira</SelectItem>
                <SelectItem value="sunday">Domingo</SelectItem>
                <SelectItem value="saturday">Sábado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Chamadas por WhatsApp */}
      <WhatsAppCallSettingsCard />

      {/* Alterar palavra-passe */}
      <SectionCard
        title="Alterar palavra-passe"
        description="Altere aqui a sua palavra-passe. Insira primeiro a sua palavra-passe atual, em seguida a nova palavra-passe pretendida, e confirme."
        footer={
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={pwdLoading} size="sm">
              {pwdLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A alterar…</>
              ) : (
                "Alterar palavra-passe"
              )}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PwdField
            label="Palavra-passe"
            value={currentPwd}
            onChange={setCurrentPwd}
            show={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
          />
          <PwdField
            label="Nova palavra-passe"
            value={newPwd}
            onChange={setNewPwd}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
          />
          <PwdField
            label="Confirme a palavra-passe"
            value={confirmPwd}
            onChange={setConfirmPwd}
            show={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
          />
        </div>
      </SectionCard>

      {/* Sessão */}
      <SectionCard
        title="Sessão"
        description="Terminar a sessão atual neste dispositivo."
      >
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Terminar sessão
        </Button>
      </SectionCard>
    </div>
  );
}

function PwdField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="********"
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Ocultar" : "Mostrar"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

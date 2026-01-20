import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, 
  Building2, 
  Shield, 
  LogOut,
  Save,
  Loader2,
  Camera
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      
      if (error) throw error;
      toast.success("Perfil atualizado com sucesso");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PageBreadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Perfil", href: "/dashboard/profile" },
          ]}
        />

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(fullName || user?.email || "U")}
              </AvatarFallback>
            </Avatar>
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{fullName || "Utilizador"}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Atualize os seus dados pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="O seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
              <Button 
                onClick={handleUpdateProfile} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Alterações
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Workspace Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Workspace Atual
              </CardTitle>
              <CardDescription>
                Informações do workspace onde está a trabalhar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentWorkspace ? (
                <>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="font-medium">{currentWorkspace.name}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate("/dashboard/settings")}
                  >
                    Gerir Workspace
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhum workspace selecionado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança
              </CardTitle>
              <CardDescription>
                Gerir a segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Última sessão</Label>
                <p className="text-sm text-muted-foreground">
                  {user?.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleString('pt-PT')
                    : "Não disponível"
                  }
                </p>
              </div>
              <Separator />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/dashboard/settings/security")}
              >
                Configurações de Segurança
              </Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <LogOut className="h-5 w-5" />
                Terminar Sessão
              </CardTitle>
              <CardDescription>
                Sair da sua conta neste dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Terminar Sessão
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

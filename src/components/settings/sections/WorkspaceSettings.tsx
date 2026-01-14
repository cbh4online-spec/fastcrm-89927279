import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  Shield,
  Palette,
  UserPlus,
  Trash2,
  Settings,
  ChevronRight,
} from "lucide-react";

const teamMembers = [
  { id: 1, name: "João Silva", email: "joao@exemplo.com", role: "owner", avatar: null },
  { id: 2, name: "Sara Santos", email: "sara@exemplo.com", role: "admin", avatar: null },
  { id: 3, name: "Miguel Costa", email: "miguel@exemplo.com", role: "agent", avatar: null },
  { id: 4, name: "Ana Ferreira", email: "ana@exemplo.com", role: "viewer", avatar: null },
];

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  agent: "Agente",
  viewer: "Visualizador",
};

const roleColors: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-blue-500 text-white",
  agent: "bg-emerald-500 text-white",
  viewer: "bg-muted text-muted-foreground",
};

export function WorkspaceSettings() {
  const { currentWorkspace } = useWorkspace();

  return (
    <div className="space-y-6">
      {/* Workspace Information */}
      <SettingsSection
        title="Informação do Workspace"
        description="Dados básicos do seu espaço de trabalho"
        icon={<Building2 className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Nome do Workspace</Label>
              <Input
                id="workspaceName"
                defaultValue={currentWorkspace?.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceSlug">URL do Workspace</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                  app.fastcrm.com/
                </span>
                <Input
                  id="workspaceSlug"
                  defaultValue={currentWorkspace?.slug}
                  className="rounded-l-none"
                />
              </div>
            </div>
          </div>
          <Button>Guardar alterações</Button>
        </div>
      </SettingsSection>

      {/* Team Members */}
      <SettingsSection
        title="Utilizadores"
        description="Gerir membros da equipa e convites"
        icon={<Users className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar membro
            </Button>
          </div>
          <div className="divide-y divide-border">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={roleColors[member.role]}>
                    {roleLabels[member.role]}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Roles & Permissions */}
      <SettingsSection
        title="Cargos & Permissões"
        description="Configurar o que cada cargo pode fazer"
        icon={<Shield className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(roleLabels).map(([role, label]) => (
            <div key={role} className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={roleColors[role]}>{label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {role === "owner" && "Acesso total a todas as definições, faturação e pode eliminar o workspace"}
                {role === "admin" && "Pode gerir membros, definições e todos os dados do workspace"}
                {role === "agent" && "Pode criar, editar e gerir contactos, leads e oportunidades"}
                {role === "viewer" && "Acesso apenas de leitura aos dados do workspace"}
              </p>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Branding */}
      <SettingsSection
        title="Marca & Aparência"
        description="Personalizar cores e logótipo"
        icon={<Palette className="h-5 w-5" />}
      >
        <SettingsItem
          title="Logótipo"
          description="Carregar o logótipo da sua empresa"
          action={<Button variant="outline">Carregar</Button>}
        />
        <SettingsItem
          title="Cores da marca"
          description="Definir as cores primária e secundária"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis e destrutivas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar workspace
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

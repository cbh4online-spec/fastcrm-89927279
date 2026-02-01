/**
 * Global Settings Tab - Default configurations for all agents
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Settings, Clock, Shield, MessageSquare, Globe } from "lucide-react";

export function GlobalSettingsTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h4 className="font-medium">Definições Globais</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Estas definições servem como valores padrão para novos agentes. 
                Cada agente pode ter configurações personalizadas que substituem estes valores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Response Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tempos de Resposta Padrão
          </CardTitle>
          <CardDescription>
            Valores padrão para delay e limites de mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Delay Mínimo de Resposta</Label>
              <span className="text-sm text-muted-foreground">8 segundos</span>
            </div>
            <Slider defaultValue={[8]} min={1} max={30} step={1} disabled />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Máximo de Mensagens por Conversa</Label>
              <span className="text-sm text-muted-foreground">25</span>
            </div>
            <Slider defaultValue={[25]} min={5} max={100} step={5} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Fallback Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Comportamento de Fallback
          </CardTitle>
          <CardDescription>
            O que acontece quando o agente não consegue responder
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Transferir para Humano</Label>
              <p className="text-xs text-muted-foreground">Notifica um operador quando não há resposta</p>
            </div>
            <Switch defaultChecked disabled />
          </div>

          <div className="space-y-2">
            <Label>Mensagem de Fallback</Label>
            <Textarea
              placeholder="Obrigado pela sua mensagem! Um membro da nossa equipa irá responder em breve."
              rows={2}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Horário de Trabalho Padrão
          </CardTitle>
          <CardDescription>
            Horário aplicado a agentes com "Respeitar Horário" ativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="time" defaultValue="09:00" disabled />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="time" defaultValue="18:00" disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fuso Horário</Label>
            <Input defaultValue="Europe/Lisbon" disabled />
          </div>
        </CardContent>
      </Card>

      {/* Save Button (disabled for now) */}
      <div className="flex justify-end">
        <Button disabled>
          Guardar Definições
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        As definições globais ainda estão em desenvolvimento. Por agora, configure cada agente individualmente.
      </p>
    </div>
  );
}

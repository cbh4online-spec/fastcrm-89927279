import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, CheckCircle, Loader2, Trash2, Settings } from "lucide-react";
import {
  useTwilioConnection,
  useSaveTwilioConnection,
  useDeleteTwilioConnection,
} from "@/hooks/useTwilioConnection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function TwilioConnectionCard() {
  const { data: connection, isLoading } = useTwilioConnection();
  const saveMutation = useSaveTwilioConnection();
  const deleteMutation = useDeleteTwilioConnection();

  const [isEditing, setIsEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSave = () => {
    if (!phoneNumber.trim()) return;
    saveMutation.mutate(
      { phoneNumber: phoneNumber.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
          setPhoneNumber("");
        },
      }
    );
  };

  const handleToggleActive = () => {
    if (!connection) return;
    saveMutation.mutate({
      phoneNumber: connection.twilio_phone_number,
      isActive: !connection.is_active,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <MessageSquare className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">Twilio SMS</CardTitle>
              <CardDescription className="text-xs">
                Envio e receção de SMS via Twilio
              </CardDescription>
            </div>
          </div>
          {connection ? (
            <div className="flex items-center gap-2">
              <Badge
                className={
                  connection.is_active
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }
              >
                {connection.is_active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Activo
                  </>
                ) : (
                  "Inactivo"
                )}
              </Badge>
            </div>
          ) : (
            <Badge variant="secondary">Não configurado</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {connection && !isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Número Twilio</p>
                <p className="text-sm font-medium font-mono">
                  {connection.twilio_phone_number}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={connection.is_active}
                  onCheckedChange={handleToggleActive}
                  disabled={saveMutation.isPending}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPhoneNumber(connection.twilio_phone_number);
                  setIsEditing(true);
                }}
                className="gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover Twilio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isto irá desligar o Twilio deste workspace. Mensagens
                      existentes não serão apagadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="twilio-phone">Número Twilio (E.164)</Label>
              <Input
                id="twilio-phone"
                placeholder="+351912345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Número Twilio do seu painel, em formato internacional (ex: +351912345678)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!phoneNumber.trim() || saveMutation.isPending}
                className="gap-1.5"
              >
                {saveMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Guardar
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setPhoneNumber("");
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Configure o webhook de entrada no painel Twilio apontando para a edge function{" "}
            <code className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
              twilio-webhook
            </code>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

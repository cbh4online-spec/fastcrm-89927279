import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Send, Clock, CheckCircle } from "lucide-react";
import { mockDuoLink } from "./mockData";

export function VisionDuoCard() {
  const [email, setEmail] = useState("");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-500" />Modo Duo
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Convida um parceiro de accountability para acompanhar a tua visão.
        </p>
      </div>

      {/* Existing invite */}
      {mockDuoLink && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{mockDuoLink.invitee_email}</p>
                  <p className="text-xs text-muted-foreground">Convidado em {new Date(mockDuoLink.created_at).toLocaleDateString("pt-PT")}</p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 text-xs">
                {mockDuoLink.status === "pending" ? <><Clock className="h-3 w-3" />Pendente</> : <><CheckCircle className="h-3 w-3" />Aceite</>}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New invite */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Enviar Convite</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@parceiro.com"
              className="bg-background"
            />
            <Button size="sm" className="gap-1 shrink-0">
              <Send className="h-4 w-4" />Convidar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

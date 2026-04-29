import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download, Share, PlusSquare, CheckCircle2, Smartphone } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function InstallPage() {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-inset">
      <Helmet>
        <title>Instalar FastCRM como app</title>
        <meta name="description" content="Instale o FastCRM no seu telemóvel e use como uma aplicação nativa." />
      </Helmet>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Instalar o FastCRM</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Instale o FastCRM no seu telemóvel para abrir como uma app, com ícone próprio e modo ecrã cheio.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {isInstalled && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm font-medium">Já tem o FastCRM instalado neste dispositivo.</p>
            </div>
          )}

          {!isInstalled && canInstall && (
            <Button onClick={promptInstall} size="lg" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Instalar agora
            </Button>
          )}

          {!isInstalled && !canInstall && isIOS && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Como instalar no iPhone / iPad:</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-semibold text-foreground">1.</span>
                  <span className="flex items-center gap-1">
                    Toque no botão <Share className="inline h-4 w-4" /> Partilhar (na barra inferior do Safari).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-foreground">2.</span>
                  <span className="flex items-center gap-1">
                    Escolha <PlusSquare className="inline h-4 w-4" /> "Adicionar ao Ecrã Principal".
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>Confirme em "Adicionar". O ícone do FastCRM aparece no ecrã.</span>
                </li>
              </ol>
            </div>
          )}

          {!isInstalled && !canInstall && !isIOS && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Como instalar:</p>
              <ol className="space-y-2 text-muted-foreground">
                <li>1. Abra o menu do navegador (⋮ no Chrome).</li>
                <li>2. Escolha <strong className="text-foreground">"Instalar app"</strong> ou "Adicionar ao ecrã principal".</li>
                <li>3. Confirme. O FastCRM passa a abrir em ecrã cheio.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Caso a opção não esteja disponível, abra esta página em Chrome ou Edge no telemóvel.
              </p>
            </div>
          )}

          <div className="pt-2 text-xs text-muted-foreground text-center">
            Trabalha online no navegador • Instalação não usa dados extra
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

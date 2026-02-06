import { LegalPageLayout } from '../components/legal/LegalPageLayout';

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Política de Cookies"
      description="Informação sobre os cookies utilizados no FastCRM, suas finalidades e como gerir as suas preferências."
      lastUpdated="6 de fevereiro de 2026"
    >
      <section>
        <h2 className="text-xl font-semibold mb-3">1. O Que São Cookies?</h2>
        <p className="text-muted-foreground leading-relaxed">
          Cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo (computador, 
          tablet ou telemóvel) quando visita um website. São amplamente utilizados para fazer os websites 
          funcionarem de forma mais eficiente e para fornecer informações aos proprietários do site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. Cookies que Utilizamos</h2>

        <h3 className="font-medium mt-4 mb-2">2.1 Cookies Necessários (sempre ativos)</h3>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Estes cookies são essenciais para o funcionamento do site e não podem ser desativados.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Cookie</th>
                <th className="text-left py-2 pr-4 font-medium">Finalidade</th>
                <th className="text-left py-2 font-medium">Duração</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">gdpr_consent</td>
                <td className="py-2 pr-4">Armazena as suas preferências de cookies</td>
                <td className="py-2">1 ano</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">sb-*-auth-token</td>
                <td className="py-2 pr-4">Autenticação e sessão do utilizador</td>
                <td className="py-2">Sessão</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium mt-4 mb-2">2.2 Cookies de Analytics (requerem consentimento)</h3>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Ajudam-nos a entender como os visitantes interagem com o site, recolhendo informações de forma anónima.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Cookie</th>
                <th className="text-left py-2 pr-4 font-medium">Provedor</th>
                <th className="text-left py-2 pr-4 font-medium">Finalidade</th>
                <th className="text-left py-2 font-medium">Duração</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">_ga, _ga_*</td>
                <td className="py-2 pr-4">Google Analytics</td>
                <td className="py-2 pr-4">Análise de tráfego e comportamento</td>
                <td className="py-2">2 anos</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">_clck, _clsk</td>
                <td className="py-2 pr-4">Microsoft Clarity</td>
                <td className="py-2 pr-4">Mapas de calor e gravações de sessão</td>
                <td className="py-2">1 ano</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-medium mt-4 mb-2">2.3 Cookies de Marketing (requerem consentimento)</h3>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Utilizados para mostrar anúncios relevantes e medir a eficácia das campanhas publicitárias.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Cookie</th>
                <th className="text-left py-2 pr-4 font-medium">Provedor</th>
                <th className="text-left py-2 pr-4 font-medium">Finalidade</th>
                <th className="text-left py-2 font-medium">Duração</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">_fbp</td>
                <td className="py-2 pr-4">Meta (Facebook)</td>
                <td className="py-2 pr-4">Rastreamento de conversões e remarketing</td>
                <td className="py-2">3 meses</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">_fbc</td>
                <td className="py-2 pr-4">Meta (Facebook)</td>
                <td className="py-2 pr-4">Atribuição de cliques em anúncios</td>
                <td className="py-2">3 meses</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. Como Gerir os Cookies</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Pode gerir as suas preferências de cookies de duas formas:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            <strong>Banner de cookies:</strong> ao visitar o site pela primeira vez, pode escolher que 
            categorias de cookies aceitar. Pode alterar as suas preferências a qualquer momento clicando 
            em "Preferências de Cookies" no rodapé do site.
          </li>
          <li>
            <strong>Definições do browser:</strong> pode configurar o seu navegador para bloquear ou 
            alertar sobre cookies. Note que bloquear cookies necessários pode afetar o funcionamento do site.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Google Tag Manager</h2>
        <p className="text-muted-foreground leading-relaxed">
          Utilizamos o Google Tag Manager (GTM) para gerir os scripts de rastreamento. O GTM é configurado 
          para respeitar as suas preferências de consentimento — os scripts de analytics e marketing só são 
          carregados após o seu consentimento explícito.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Mais Informações</h2>
        <p className="text-muted-foreground leading-relaxed">
          Para mais informações sobre como tratamos os seus dados pessoais, consulte a nossa{' '}
          <a href="/privacy" className="text-primary hover:underline">Política de Privacidade</a>. 
          Para questões sobre cookies, contacte-nos em{' '}
          <a href="mailto:privacidade@fastcrm.pt" className="text-primary hover:underline">privacidade@fastcrm.pt</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

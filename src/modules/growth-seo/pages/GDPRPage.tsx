import { LegalPageLayout } from '../components/legal/LegalPageLayout';

export default function GDPRPage() {
  return (
    <LegalPageLayout
      title="RGPD — Regulamento Geral de Proteção de Dados"
      description="Como o FastCRM cumpre o RGPD e protege os dados pessoais dos seus utilizadores e dos seus clientes."
      lastUpdated="6 de fevereiro de 2026"
    >
      <section>
        <h2 className="text-xl font-semibold mb-3">1. Compromisso com o RGPD</h2>
        <p className="text-muted-foreground leading-relaxed">
          O FastCRM está comprometido com o cumprimento integral do Regulamento (UE) 2016/679 — 
          Regulamento Geral sobre a Proteção de Dados (RGPD). Enquanto plataforma de CRM, tratamos 
          dados pessoais tanto como <strong>responsável pelo tratamento</strong> (dados dos nossos utilizadores) 
          como <strong>subcontratante</strong> (dados dos clientes dos nossos utilizadores).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. FastCRM como Responsável pelo Tratamento</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Enquanto responsável pelo tratamento dos dados dos nossos utilizadores:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Recolhemos apenas os dados necessários para a prestação do serviço (minimização de dados)</li>
          <li>Definimos claramente as finalidades do tratamento na nossa Política de Privacidade</li>
          <li>Implementamos medidas de segurança técnicas e organizativas adequadas</li>
          <li>Mantemos registos das atividades de tratamento</li>
          <li>Garantimos o exercício dos direitos dos titulares dos dados</li>
          <li>Notificamos a autoridade de controlo em caso de violação de dados no prazo de 72 horas</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. FastCRM como Subcontratante</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Quando os nossos utilizadores utilizam o FastCRM para gerir dados dos seus próprios clientes, 
          atuamos como subcontratante. Nesta qualidade:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Tratamos os dados apenas segundo as instruções do responsável pelo tratamento (o nosso utilizador)</li>
          <li>Garantimos a confidencialidade dos dados através de obrigações contratuais</li>
          <li>Implementamos as medidas de segurança previstas no artigo 32.º do RGPD</li>
          <li>Não subcontratamos outros processadores sem autorização prévia</li>
          <li>Auxiliamos o responsável pelo tratamento no cumprimento das suas obrigações</li>
          <li>Eliminamos ou devolvemos os dados após o término da relação contratual</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Acordo de Processamento de Dados (DPA)</h2>
        <p className="text-muted-foreground leading-relaxed">
          Disponibilizamos um Acordo de Processamento de Dados (Data Processing Agreement) que cobre 
          as obrigações do artigo 28.º do RGPD. Este acordo é automaticamente aplicável a todos os 
          utilizadores e pode ser solicitado em formato assinado para{' '}
          <a href="mailto:dpo@fastcrm.pt" className="text-primary hover:underline">dpo@fastcrm.pt</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Medidas de Segurança</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Implementamos as seguintes medidas técnicas e organizativas:
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-muted/50">
            <h3 className="font-medium mb-2">Medidas Técnicas</h3>
            <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
              <li>Encriptação em trânsito (TLS 1.3)</li>
              <li>Encriptação em repouso (AES-256)</li>
              <li>Autenticação multifator (MFA)</li>
              <li>Backups automáticos diários</li>
              <li>Monitorização contínua de segurança</li>
              <li>Isolamento de dados por workspace</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg border bg-muted/50">
            <h3 className="font-medium mb-2">Medidas Organizativas</h3>
            <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
              <li>Controlo de acessos baseado em funções</li>
              <li>Formação regular em proteção de dados</li>
              <li>Políticas de segurança documentadas</li>
              <li>Procedimentos de resposta a incidentes</li>
              <li>Auditorias de segurança periódicas</li>
              <li>Avaliações de impacto (DPIA)</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">6. Direitos dos Titulares</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          O FastCRM facilita o exercício dos seguintes direitos previstos no RGPD:
        </p>
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded text-sm shrink-0">Art. 15.º</span>
            <p className="text-muted-foreground text-sm"><strong>Direito de acesso</strong> — Pode solicitar uma cópia completa dos seus dados pessoais.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded text-sm shrink-0">Art. 16.º</span>
            <p className="text-muted-foreground text-sm"><strong>Direito de retificação</strong> — Pode corrigir dados inexatos diretamente na plataforma.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded text-sm shrink-0">Art. 17.º</span>
            <p className="text-muted-foreground text-sm"><strong>Direito ao apagamento</strong> — Pode solicitar a eliminação dos seus dados ("direito a ser esquecido").</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded text-sm shrink-0">Art. 18.º</span>
            <p className="text-muted-foreground text-sm"><strong>Direito à limitação</strong> — Pode solicitar a restrição do tratamento em determinadas circunstâncias.</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded text-sm shrink-0">Art. 20.º</span>
            <p className="text-muted-foreground text-sm"><strong>Direito à portabilidade</strong> — Pode exportar os seus dados em formato estruturado (CSV, JSON).</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded text-sm shrink-0">Art. 21.º</span>
            <p className="text-muted-foreground text-sm"><strong>Direito de oposição</strong> — Pode opor-se ao tratamento baseado em interesse legítimo ou marketing direto.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">7. Transferências Internacionais</h2>
        <p className="text-muted-foreground leading-relaxed">
          Quando é necessário transferir dados para fora do EEE, utilizamos os mecanismos previstos no 
          Capítulo V do RGPD, nomeadamente cláusulas contratuais-tipo (SCCs) aprovadas pela Comissão Europeia 
          e, quando aplicável, medidas suplementares conforme as recomendações do EDPB.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">8. Cookies e Rastreamento</h2>
        <p className="text-muted-foreground leading-relaxed">
          O nosso sistema de gestão de cookies permite-lhe controlar que cookies são utilizados, 
          em conformidade com a Diretiva ePrivacy e o RGPD. Os cookies de analytics e marketing só são 
          ativados após o seu consentimento explícito. Pode alterar as suas preferências a qualquer momento 
          através do banner de cookies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">9. Subcontratantes</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Utilizamos os seguintes subcontratantes para a prestação do serviço:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Subcontratante</th>
                <th className="text-left py-2 pr-4 font-medium">Finalidade</th>
                <th className="text-left py-2 font-medium">Localização</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">AWS / Supabase</td>
                <td className="py-2 pr-4">Infraestrutura e base de dados</td>
                <td className="py-2">UE (Frankfurt)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Stripe</td>
                <td className="py-2 pr-4">Processamento de pagamentos</td>
                <td className="py-2">EUA (com SCCs)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Google (Analytics)</td>
                <td className="py-2 pr-4">Análise de utilização</td>
                <td className="py-2">EUA (com consentimento)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">SendGrid</td>
                <td className="py-2 pr-4">Envio de emails transacionais</td>
                <td className="py-2">EUA (com SCCs)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">10. Violação de Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          Em caso de violação de dados pessoais que constitua um risco para os direitos e liberdades 
          dos titulares, comprometemo-nos a notificar a CNPD no prazo de 72 horas após tomar conhecimento 
          da violação, e a informar os titulares afetados quando o risco for elevado, conforme os 
          artigos 33.º e 34.º do RGPD.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">11. Encarregado de Proteção de Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          Para questões relacionadas com a proteção de dados pessoais, pode contactar o nosso 
          Encarregado de Proteção de Dados (DPO) através de{' '}
          <a href="mailto:dpo@fastcrm.pt" className="text-primary hover:underline">dpo@fastcrm.pt</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">12. Responsabilidades dos Utilizadores</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Enquanto utilizador do FastCRM que trata dados de terceiros (os seus clientes), é responsável por:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Garantir uma base legal válida para o tratamento dos dados dos seus clientes</li>
          <li>Informar os seus clientes sobre o tratamento dos seus dados</li>
          <li>Responder aos pedidos de exercício de direitos dos seus clientes</li>
          <li>Notificar o FastCRM em caso de violação de dados que envolva a plataforma</li>
          <li>Não inserir dados pessoais sensíveis (artigo 9.º do RGPD) sem base legal adequada</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">13. Contactos</h2>
        <div className="p-4 rounded-lg border bg-muted/50">
          <p className="text-muted-foreground text-sm space-y-1">
            <strong>FastCRM, Lda.</strong><br />
            Encarregado de Proteção de Dados (DPO)<br />
            Email: <a href="mailto:dpo@fastcrm.pt" className="text-primary hover:underline">dpo@fastcrm.pt</a><br />
            Autoridade de controlo: <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CNPD — www.cnpd.pt</a>
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

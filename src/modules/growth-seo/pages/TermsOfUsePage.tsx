import { LegalPageLayout } from '../components/legal/LegalPageLayout';

export default function TermsOfUsePage() {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      description="Termos e condições de utilização da plataforma FastCRM. Leia antes de utilizar os nossos serviços."
      lastUpdated="6 de fevereiro de 2026"
    >
      <section>
        <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Ao aceder ou utilizar a plataforma FastCRM, concorda com estes Termos de Uso na sua totalidade. 
          Se não concordar com qualquer parte destes termos, não deverá utilizar a plataforma. 
          A utilização continuada após alterações aos termos constitui aceitação das mesmas.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
        <p className="text-muted-foreground leading-relaxed">
          O FastCRM é uma plataforma de gestão de relacionamento com clientes (CRM) que oferece 
          ferramentas de gestão de leads, oportunidades, automação de processos, comunicação, faturação, 
          inteligência artificial e relatórios. O serviço é disponibilizado em modalidade SaaS 
          (Software as a Service) mediante subscrição.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. Registo e Conta</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Deve fornecer informações verdadeiras, completas e atualizadas ao criar a sua conta</li>
          <li>É responsável por manter a confidencialidade das suas credenciais de acesso</li>
          <li>Deve ter pelo menos 18 anos ou a maioridade legal na sua jurisdição</li>
          <li>Uma pessoa física ou jurídica pode ter apenas uma conta gratuita</li>
          <li>É responsável por todas as atividades realizadas na sua conta</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Planos e Pagamentos</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          O FastCRM oferece diferentes planos de subscrição:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Os preços estão indicados na página de preços e podem ser alterados com aviso prévio de 30 dias</li>
          <li>Os pagamentos são processados de forma segura através do Stripe</li>
          <li>As subscrições são renovadas automaticamente no final de cada período</li>
          <li>Pode cancelar a subscrição a qualquer momento; o acesso mantém-se até ao final do período pago</li>
          <li>Não são efetuados reembolsos por períodos parciais, exceto quando exigido por lei</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Utilização Aceitável</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Ao utilizar o FastCRM, compromete-se a não:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Utilizar a plataforma para fins ilegais ou não autorizados</li>
          <li>Enviar conteúdo malicioso, vírus ou código destrutivo</li>
          <li>Tentar aceder a contas ou dados de outros utilizadores</li>
          <li>Sobrecarregar intencionalmente a infraestrutura do serviço</li>
          <li>Revender ou redistribuir o serviço sem autorização</li>
          <li>Utilizar a plataforma para envio de spam ou comunicações não solicitadas</li>
          <li>Violar direitos de propriedade intelectual de terceiros</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">6. Propriedade Intelectual</h2>
        <p className="text-muted-foreground leading-relaxed">
          Todos os direitos de propriedade intelectual sobre a plataforma FastCRM, incluindo o software, 
          design, logótipos, textos e funcionalidades, pertencem à FastCRM, Lda. É concedida uma licença 
          limitada, não exclusiva e não transferível para utilizar a plataforma durante a vigência da subscrição.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">7. Dados do Utilizador</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os dados que insere na plataforma (leads, contactos, oportunidades, etc.) são da sua propriedade. 
          O FastCRM atua como processador desses dados e não os utiliza para outros fins que não a prestação 
          do serviço. Pode exportar os seus dados a qualquer momento através das funcionalidades de exportação 
          disponíveis na plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">8. Disponibilidade do Serviço</h2>
        <p className="text-muted-foreground leading-relaxed">
          Esforçamo-nos por manter o serviço disponível 24/7, mas não garantimos uma disponibilidade 
          de 100%. Poderão ocorrer interrupções para manutenção, atualizações ou por motivos de força maior. 
          Informaremos os utilizadores sobre manutenções programadas com a maior antecedência possível.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">9. Limitação de Responsabilidade</h2>
        <p className="text-muted-foreground leading-relaxed">
          Na máxima extensão permitida por lei, o FastCRM não será responsável por danos indiretos, 
          incidentais, especiais ou consequenciais resultantes da utilização ou impossibilidade de 
          utilização do serviço. A nossa responsabilidade total está limitada ao valor pago pelo 
          utilizador nos 12 meses anteriores ao evento que deu origem à reclamação.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">10. Rescisão</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>O utilizador pode cancelar a sua conta a qualquer momento</li>
          <li>O FastCRM pode suspender ou terminar contas que violem estes termos</li>
          <li>Após a rescisão, os dados serão eliminados no prazo de 30 dias, salvo obrigação legal de conservação</li>
          <li>O utilizador pode solicitar a exportação dos seus dados antes da eliminação</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">11. Alterações aos Termos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Reservamo-nos o direito de alterar estes Termos de Uso. Alterações significativas serão 
          comunicadas por email com pelo menos 30 dias de antecedência. A utilização continuada da 
          plataforma após a entrada em vigor das alterações constitui aceitação dos novos termos.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">12. Lei Aplicável e Jurisdição</h2>
        <p className="text-muted-foreground leading-relaxed">
          Estes Termos de Uso são regidos pela lei portuguesa. Qualquer litígio será submetido aos 
          tribunais competentes da comarca de Lisboa, Portugal, sem prejuízo dos direitos que assistam 
          ao consumidor nos termos da lei aplicável.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">13. Contacto</h2>
        <p className="text-muted-foreground leading-relaxed">
          Para questões relacionadas com estes Termos de Uso, contacte-nos em{' '}
          <a href="mailto:legal@fastcrm.pt" className="text-primary hover:underline">legal@fastcrm.pt</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

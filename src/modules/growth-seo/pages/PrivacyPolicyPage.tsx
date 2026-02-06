import { LegalPageLayout } from '../components/legal/LegalPageLayout';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      description="Conheça como o FastCRM recolhe, utiliza e protege os seus dados pessoais em conformidade com o RGPD."
      lastUpdated="6 de fevereiro de 2026"
    >
      <section>
        <h2 className="text-xl font-semibold mb-3">1. Responsável pelo Tratamento</h2>
        <p className="text-muted-foreground leading-relaxed">
          O responsável pelo tratamento dos dados pessoais é a FastCRM, Lda., com sede em Portugal. 
          Para questões relacionadas com a proteção de dados, pode contactar-nos através do email: 
          <a href="mailto:privacidade@fastcrm.pt" className="text-primary hover:underline"> privacidade@fastcrm.pt</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. Dados Pessoais Recolhidos</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Recolhemos os seguintes tipos de dados pessoais:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Dados de identificação:</strong> nome, email, número de telefone</li>
          <li><strong>Dados de conta:</strong> credenciais de acesso (password encriptada), configurações de perfil</li>
          <li><strong>Dados de utilização:</strong> logs de acesso, páginas visitadas, funcionalidades utilizadas</li>
          <li><strong>Dados de faturação:</strong> NIF, morada de faturação, histórico de pagamentos</li>
          <li><strong>Dados técnicos:</strong> endereço IP, tipo de browser, sistema operativo, cookies</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. Finalidades do Tratamento</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Os dados pessoais são tratados para as seguintes finalidades:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Prestação e gestão do serviço FastCRM</li>
          <li>Criação e gestão de contas de utilizador</li>
          <li>Processamento de pagamentos e faturação</li>
          <li>Comunicação de atualizações, novidades e suporte técnico</li>
          <li>Melhoria contínua da plataforma através de análise de utilização</li>
          <li>Cumprimento de obrigações legais e fiscais</li>
          <li>Prevenção de fraude e segurança da plataforma</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Base Legal do Tratamento</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          O tratamento dos seus dados pessoais baseia-se nas seguintes bases legais:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Execução de contrato:</strong> para a prestação do serviço contratado</li>
          <li><strong>Consentimento:</strong> para comunicações de marketing e cookies opcionais</li>
          <li><strong>Interesse legítimo:</strong> para melhoria do serviço e prevenção de fraude</li>
          <li><strong>Obrigação legal:</strong> para cumprimento de obrigações fiscais e regulatórias</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Partilha de Dados</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Os seus dados podem ser partilhados com:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Processadores de pagamento:</strong> Stripe, para processar transações de forma segura</li>
          <li><strong>Serviços de infraestrutura:</strong> fornecedores de alojamento e bases de dados</li>
          <li><strong>Ferramentas de análise:</strong> Google Analytics e Microsoft Clarity (com base no seu consentimento)</li>
          <li><strong>Autoridades competentes:</strong> quando exigido por lei</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Nunca vendemos os seus dados pessoais a terceiros.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">6. Transferências Internacionais</h2>
        <p className="text-muted-foreground leading-relaxed">
          Alguns dos nossos subcontratantes podem estar localizados fora do Espaço Económico Europeu (EEE). 
          Nestes casos, garantimos que existem salvaguardas adequadas, como cláusulas contratuais-tipo 
          aprovadas pela Comissão Europeia ou decisões de adequação.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">7. Prazo de Conservação</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os dados pessoais são conservados pelo período necessário às finalidades para que foram recolhidos, 
          nomeadamente durante a vigência do contrato e pelo período legalmente exigido para efeitos fiscais 
          e contabilísticos (geralmente 10 anos). Os dados de marketing são conservados até à retirada do 
          consentimento.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">8. Direitos dos Titulares</h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Nos termos do RGPD, tem os seguintes direitos:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>Direito de acesso:</strong> obter confirmação e cópia dos seus dados</li>
          <li><strong>Direito de retificação:</strong> corrigir dados inexatos ou incompletos</li>
          <li><strong>Direito ao apagamento:</strong> solicitar a eliminação dos seus dados</li>
          <li><strong>Direito à limitação:</strong> restringir o tratamento em determinadas circunstâncias</li>
          <li><strong>Direito à portabilidade:</strong> receber os seus dados em formato estruturado</li>
          <li><strong>Direito de oposição:</strong> opor-se ao tratamento baseado em interesse legítimo</li>
          <li><strong>Direito a retirar o consentimento:</strong> a qualquer momento, sem comprometer a licitude do tratamento anterior</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Para exercer qualquer destes direitos, contacte-nos em{' '}
          <a href="mailto:privacidade@fastcrm.pt" className="text-primary hover:underline">privacidade@fastcrm.pt</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">9. Segurança</h2>
        <p className="text-muted-foreground leading-relaxed">
          Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados, incluindo 
          encriptação em trânsito (TLS/SSL), encriptação em repouso, controlo de acessos, auditorias regulares 
          e formação dos colaboradores.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">10. Reclamações</h2>
        <p className="text-muted-foreground leading-relaxed">
          Se considerar que o tratamento dos seus dados viola o RGPD, tem o direito de apresentar 
          reclamação junto da Comissão Nacional de Proteção de Dados (CNPD) — {' '}
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            www.cnpd.pt
          </a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}

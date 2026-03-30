import type { LegalPageData, LegalPageKey } from "../../hooks/useLegalPageContent";

export const DEFAULT_LEGAL_PAGES: Record<LegalPageKey, LegalPageData> = {
  legal_page_privacy: {
    title: "Política de Privacidade",
    description: "Conheça como recolhemos, utilizamos e protegemos os seus dados pessoais em conformidade com o RGPD.",
    lastUpdated: "6 de fevereiro de 2026",
    sections: [
      {
        title: "1. Responsável pelo Tratamento",
        content: `<p>O responsável pelo tratamento dos dados pessoais é a <strong>{{company_name}}</strong>, NIF {{nif}}, com sede em {{address}}. Para questões relacionadas com a proteção de dados, pode contactar-nos através do email: <a href="mailto:{{email_dpo}}">{{email_dpo}}</a>.</p>`,
      },
      {
        title: "2. Dados Pessoais Recolhidos",
        content: `<p>Recolhemos os seguintes tipos de dados pessoais:</p>
<ul>
<li><strong>Dados de identificação:</strong> nome, email, número de telefone</li>
<li><strong>Dados de conta:</strong> credenciais de acesso (password encriptada), configurações de perfil</li>
<li><strong>Dados de utilização:</strong> logs de acesso, páginas visitadas, funcionalidades utilizadas</li>
<li><strong>Dados de faturação:</strong> NIF, morada de faturação, histórico de pagamentos</li>
<li><strong>Dados técnicos:</strong> endereço IP, tipo de browser, sistema operativo, cookies</li>
</ul>`,
      },
      {
        title: "3. Finalidades do Tratamento",
        content: `<p>Os dados pessoais são tratados para as seguintes finalidades:</p>
<ul>
<li>Prestação e gestão do serviço</li>
<li>Criação e gestão de contas de utilizador</li>
<li>Processamento de pagamentos e faturação</li>
<li>Comunicação de atualizações, novidades e suporte técnico</li>
<li>Melhoria contínua da plataforma através de análise de utilização</li>
<li>Cumprimento de obrigações legais e fiscais</li>
<li>Prevenção de fraude e segurança da plataforma</li>
</ul>`,
      },
      {
        title: "4. Base Legal do Tratamento",
        content: `<p>O tratamento dos seus dados pessoais baseia-se nas seguintes bases legais:</p>
<ul>
<li><strong>Execução de contrato:</strong> para a prestação do serviço contratado</li>
<li><strong>Consentimento:</strong> para comunicações de marketing e cookies opcionais</li>
<li><strong>Interesse legítimo:</strong> para melhoria do serviço e prevenção de fraude</li>
<li><strong>Obrigação legal:</strong> para cumprimento de obrigações fiscais e regulatórias</li>
</ul>`,
      },
      {
        title: "5. Partilha de Dados",
        content: `<p>Os seus dados podem ser partilhados com:</p>
<ul>
<li><strong>Processadores de pagamento:</strong> Stripe, para processar transações de forma segura</li>
<li><strong>Serviços de infraestrutura:</strong> fornecedores de alojamento e bases de dados</li>
<li><strong>Ferramentas de análise:</strong> Google Analytics e Microsoft Clarity (com base no seu consentimento)</li>
<li><strong>Autoridades competentes:</strong> quando exigido por lei</li>
</ul>
<p>Nunca vendemos os seus dados pessoais a terceiros.</p>`,
      },
      {
        title: "6. Transferências Internacionais",
        content: `<p>Alguns dos nossos subcontratantes podem estar localizados fora do Espaço Económico Europeu (EEE). Nestes casos, garantimos que existem salvaguardas adequadas, como cláusulas contratuais-tipo aprovadas pela Comissão Europeia ou decisões de adequação.</p>`,
      },
      {
        title: "7. Prazo de Conservação",
        content: `<p>Os dados pessoais são conservados pelo período necessário às finalidades para que foram recolhidos, nomeadamente durante a vigência do contrato e pelo período legalmente exigido para efeitos fiscais e contabilísticos (geralmente 10 anos). Os dados de marketing são conservados até à retirada do consentimento.</p>`,
      },
      {
        title: "8. Direitos dos Titulares",
        content: `<p>Nos termos do RGPD, tem os seguintes direitos:</p>
<ul>
<li><strong>Direito de acesso:</strong> obter confirmação e cópia dos seus dados</li>
<li><strong>Direito de retificação:</strong> corrigir dados inexatos ou incompletos</li>
<li><strong>Direito ao apagamento:</strong> solicitar a eliminação dos seus dados</li>
<li><strong>Direito à limitação:</strong> restringir o tratamento em determinadas circunstâncias</li>
<li><strong>Direito à portabilidade:</strong> receber os seus dados em formato estruturado</li>
<li><strong>Direito de oposição:</strong> opor-se ao tratamento baseado em interesse legítimo</li>
<li><strong>Direito a retirar o consentimento:</strong> a qualquer momento, sem comprometer a licitude do tratamento anterior</li>
</ul>
<p>Para exercer qualquer destes direitos, contacte-nos em <a href="mailto:{{email_dpo}}">{{email_dpo}}</a>.</p>`,
      },
      {
        title: "9. Segurança",
        content: `<p>Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados, incluindo encriptação em trânsito (TLS/SSL), encriptação em repouso, controlo de acessos, auditorias regulares e formação dos colaboradores.</p>`,
      },
      {
        title: "10. Reclamações",
        content: `<p>Se considerar que o tratamento dos seus dados viola o RGPD, tem o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD) — <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>.</p>`,
      },
    ],
  },

  legal_page_terms: {
    title: "Termos de Uso",
    description: "Termos e condições de utilização da plataforma. Leia antes de utilizar os nossos serviços.",
    lastUpdated: "6 de fevereiro de 2026",
    sections: [
      {
        title: "1. Aceitação dos Termos",
        content: `<p>Ao aceder ou utilizar a plataforma, concorda com estes Termos de Uso na sua totalidade. Se não concordar com qualquer parte destes termos, não deverá utilizar a plataforma. A utilização continuada após alterações aos termos constitui aceitação das mesmas.</p>`,
      },
      {
        title: "2. Descrição do Serviço",
        content: `<p>A plataforma é um sistema de gestão de relacionamento com clientes (CRM) que oferece ferramentas de gestão de leads, oportunidades, automação de processos, comunicação, faturação, inteligência artificial e relatórios. O serviço é disponibilizado em modalidade SaaS (Software as a Service) mediante subscrição.</p>`,
      },
      {
        title: "3. Registo e Conta",
        content: `<ul>
<li>Deve fornecer informações verdadeiras, completas e atualizadas ao criar a sua conta</li>
<li>É responsável por manter a confidencialidade das suas credenciais de acesso</li>
<li>Deve ter pelo menos 18 anos ou a maioridade legal na sua jurisdição</li>
<li>Uma pessoa física ou jurídica pode ter apenas uma conta gratuita</li>
<li>É responsável por todas as atividades realizadas na sua conta</li>
</ul>`,
      },
      {
        title: "4. Planos e Pagamentos",
        content: `<p>Oferecemos diferentes planos de subscrição:</p>
<ul>
<li>Os preços estão indicados na página de preços e podem ser alterados com aviso prévio de 30 dias</li>
<li>Os pagamentos são processados de forma segura através do Stripe</li>
<li>As subscrições são renovadas automaticamente no final de cada período</li>
<li>Pode cancelar a subscrição a qualquer momento; o acesso mantém-se até ao final do período pago</li>
<li>Não são efetuados reembolsos por períodos parciais, exceto quando exigido por lei</li>
</ul>`,
      },
      {
        title: "5. Utilização Aceitável",
        content: `<p>Ao utilizar a plataforma, compromete-se a não:</p>
<ul>
<li>Utilizar a plataforma para fins ilegais ou não autorizados</li>
<li>Enviar conteúdo malicioso, vírus ou código destrutivo</li>
<li>Tentar aceder a contas ou dados de outros utilizadores</li>
<li>Sobrecarregar intencionalmente a infraestrutura do serviço</li>
<li>Revender ou redistribuir o serviço sem autorização</li>
<li>Utilizar a plataforma para envio de spam ou comunicações não solicitadas</li>
<li>Violar direitos de propriedade intelectual de terceiros</li>
</ul>`,
      },
      {
        title: "6. Propriedade Intelectual",
        content: `<p>Todos os direitos de propriedade intelectual sobre a plataforma, incluindo o software, design, logótipos, textos e funcionalidades, pertencem à {{company_name}}. É concedida uma licença limitada, não exclusiva e não transferível para utilizar a plataforma durante a vigência da subscrição.</p>`,
      },
      {
        title: "7. Dados do Utilizador",
        content: `<p>Os dados que insere na plataforma (leads, contactos, oportunidades, etc.) são da sua propriedade. Atuamos como processador desses dados e não os utilizamos para outros fins que não a prestação do serviço. Pode exportar os seus dados a qualquer momento através das funcionalidades de exportação disponíveis na plataforma.</p>`,
      },
      {
        title: "8. Disponibilidade do Serviço",
        content: `<p>Esforçamo-nos por manter o serviço disponível 24/7, mas não garantimos uma disponibilidade de 100%. Poderão ocorrer interrupções para manutenção, atualizações ou por motivos de força maior. Informaremos os utilizadores sobre manutenções programadas com a maior antecedência possível.</p>`,
      },
      {
        title: "9. Limitação de Responsabilidade",
        content: `<p>Na máxima extensão permitida por lei, a {{company_name}} não será responsável por danos indiretos, incidentais, especiais ou consequenciais resultantes da utilização ou impossibilidade de utilização do serviço. A nossa responsabilidade total está limitada ao valor pago pelo utilizador nos 12 meses anteriores ao evento que deu origem à reclamação.</p>`,
      },
      {
        title: "10. Rescisão",
        content: `<ul>
<li>O utilizador pode cancelar a sua conta a qualquer momento</li>
<li>Podemos suspender ou terminar contas que violem estes termos</li>
<li>Após a rescisão, os dados serão eliminados no prazo de 30 dias, salvo obrigação legal de conservação</li>
<li>O utilizador pode solicitar a exportação dos seus dados antes da eliminação</li>
</ul>`,
      },
      {
        title: "11. Alterações aos Termos",
        content: `<p>Reservamo-nos o direito de alterar estes Termos de Uso. Alterações significativas serão comunicadas por email com pelo menos 30 dias de antecedência. A utilização continuada da plataforma após a entrada em vigor das alterações constitui aceitação dos novos termos.</p>`,
      },
      {
        title: "12. Lei Aplicável e Jurisdição",
        content: `<p>Estes Termos de Uso são regidos pela lei portuguesa. Qualquer litígio será submetido aos tribunais competentes da comarca de Lisboa, Portugal, sem prejuízo dos direitos que assistam ao consumidor nos termos da lei aplicável.</p>`,
      },
      {
        title: "13. Contacto",
        content: `<p>Para questões relacionadas com estes Termos de Uso, contacte-nos em <a href="mailto:{{email_general}}">{{email_general}}</a>.</p>`,
      },
    ],
  },

  legal_page_gdpr: {
    title: "RGPD — Regulamento Geral de Proteção de Dados",
    description: "Como cumprimos o RGPD e protegemos os dados pessoais dos utilizadores e dos seus clientes.",
    lastUpdated: "6 de fevereiro de 2026",
    sections: [
      {
        title: "1. Compromisso com o RGPD",
        content: `<p>A <strong>{{company_name}}</strong> está comprometida com o cumprimento integral do Regulamento (UE) 2016/679 — Regulamento Geral sobre a Proteção de Dados (RGPD). Enquanto plataforma de CRM, tratamos dados pessoais tanto como <strong>responsável pelo tratamento</strong> (dados dos nossos utilizadores) como <strong>subcontratante</strong> (dados dos clientes dos nossos utilizadores).</p>`,
      },
      {
        title: "2. FastCRM como Responsável pelo Tratamento",
        content: `<p>Enquanto responsável pelo tratamento dos dados dos nossos utilizadores:</p>
<ul>
<li>Recolhemos apenas os dados necessários para a prestação do serviço (minimização de dados)</li>
<li>Definimos claramente as finalidades do tratamento na nossa Política de Privacidade</li>
<li>Implementamos medidas de segurança técnicas e organizativas adequadas</li>
<li>Mantemos registos das atividades de tratamento</li>
<li>Garantimos o exercício dos direitos dos titulares dos dados</li>
<li>Notificamos a autoridade de controlo em caso de violação de dados no prazo de 72 horas</li>
</ul>`,
      },
      {
        title: "3. FastCRM como Subcontratante",
        content: `<p>Quando os nossos utilizadores utilizam a plataforma para gerir dados dos seus próprios clientes, atuamos como subcontratante. Nesta qualidade:</p>
<ul>
<li>Tratamos os dados apenas segundo as instruções do responsável pelo tratamento (o nosso utilizador)</li>
<li>Garantimos a confidencialidade dos dados através de obrigações contratuais</li>
<li>Implementamos as medidas de segurança previstas no artigo 32.º do RGPD</li>
<li>Não subcontratamos outros processadores sem autorização prévia</li>
<li>Auxiliamos o responsável pelo tratamento no cumprimento das suas obrigações</li>
<li>Eliminamos ou devolvemos os dados após o término da relação contratual</li>
</ul>`,
      },
      {
        title: "4. Acordo de Processamento de Dados (DPA)",
        content: `<p>Disponibilizamos um Acordo de Processamento de Dados (Data Processing Agreement) que cobre as obrigações do artigo 28.º do RGPD. Este acordo é automaticamente aplicável a todos os utilizadores e pode ser solicitado em formato assinado para <a href="mailto:{{email_dpo}}">{{email_dpo}}</a>.</p>`,
      },
      {
        title: "5. Medidas de Segurança",
        content: `<p>Implementamos as seguintes medidas técnicas e organizativas:</p>
<p><strong>Medidas Técnicas:</strong> Encriptação em trânsito (TLS 1.3), Encriptação em repouso (AES-256), Autenticação multifator (MFA), Backups automáticos diários, Monitorização contínua de segurança, Isolamento de dados por workspace.</p>
<p><strong>Medidas Organizativas:</strong> Controlo de acessos baseado em funções, Formação regular em proteção de dados, Políticas de segurança documentadas, Procedimentos de resposta a incidentes, Auditorias de segurança periódicas, Avaliações de impacto (DPIA).</p>`,
      },
      {
        title: "6. Direitos dos Titulares",
        content: `<p>Facilitamos o exercício dos seguintes direitos previstos no RGPD:</p>
<ul>
<li><strong>Art. 15.º — Direito de acesso:</strong> Pode solicitar uma cópia completa dos seus dados pessoais.</li>
<li><strong>Art. 16.º — Direito de retificação:</strong> Pode corrigir dados inexatos diretamente na plataforma.</li>
<li><strong>Art. 17.º — Direito ao apagamento:</strong> Pode solicitar a eliminação dos seus dados ("direito a ser esquecido").</li>
<li><strong>Art. 18.º — Direito à limitação:</strong> Pode solicitar a restrição do tratamento em determinadas circunstâncias.</li>
<li><strong>Art. 20.º — Direito à portabilidade:</strong> Pode exportar os seus dados em formato estruturado (CSV, JSON).</li>
<li><strong>Art. 21.º — Direito de oposição:</strong> Pode opor-se ao tratamento baseado em interesse legítimo ou marketing direto.</li>
</ul>`,
      },
      {
        title: "7. Transferências Internacionais",
        content: `<p>Quando é necessário transferir dados para fora do EEE, utilizamos os mecanismos previstos no Capítulo V do RGPD, nomeadamente cláusulas contratuais-tipo (SCCs) aprovadas pela Comissão Europeia e, quando aplicável, medidas suplementares conforme as recomendações do EDPB.</p>`,
      },
      {
        title: "8. Cookies e Rastreamento",
        content: `<p>O nosso sistema de gestão de cookies permite-lhe controlar que cookies são utilizados, em conformidade com a Diretiva ePrivacy e o RGPD. Os cookies de analytics e marketing só são ativados após o seu consentimento explícito. Pode alterar as suas preferências a qualquer momento através do banner de cookies.</p>`,
      },
      {
        title: "9. Subcontratantes",
        content: `<p>Utilizamos os seguintes subcontratantes para a prestação do serviço:</p>
<table><thead><tr><th>Subcontratante</th><th>Finalidade</th><th>Localização</th></tr></thead>
<tbody>
<tr><td>AWS / Supabase</td><td>Infraestrutura e base de dados</td><td>UE (Frankfurt)</td></tr>
<tr><td>Stripe</td><td>Processamento de pagamentos</td><td>EUA (com SCCs)</td></tr>
<tr><td>Google (Analytics)</td><td>Análise de utilização</td><td>EUA (com consentimento)</td></tr>
<tr><td>SendGrid</td><td>Envio de emails transacionais</td><td>EUA (com SCCs)</td></tr>
</tbody></table>`,
      },
      {
        title: "10. Violação de Dados",
        content: `<p>Em caso de violação de dados pessoais que constitua um risco para os direitos e liberdades dos titulares, comprometemo-nos a notificar a CNPD no prazo de 72 horas após tomar conhecimento da violação, e a informar os titulares afetados quando o risco for elevado, conforme os artigos 33.º e 34.º do RGPD.</p>`,
      },
      {
        title: "11. Encarregado de Proteção de Dados",
        content: `<p>Para questões relacionadas com a proteção de dados pessoais, pode contactar o nosso Encarregado de Proteção de Dados (DPO) através de <a href="mailto:{{email_dpo}}">{{email_dpo}}</a>.</p>`,
      },
      {
        title: "12. Responsabilidades dos Utilizadores",
        content: `<p>Enquanto utilizador da plataforma que trata dados de terceiros (os seus clientes), é responsável por:</p>
<ul>
<li>Garantir uma base legal válida para o tratamento dos dados dos seus clientes</li>
<li>Informar os seus clientes sobre o tratamento dos seus dados</li>
<li>Responder aos pedidos de exercício de direitos dos seus clientes</li>
<li>Notificar-nos em caso de violação de dados que envolva a plataforma</li>
<li>Não inserir dados pessoais sensíveis (artigo 9.º do RGPD) sem base legal adequada</li>
</ul>`,
      },
      {
        title: "13. Contactos",
        content: `<p><strong>{{company_name}}</strong><br/>NIF: {{nif}}<br/>{{address}}<br/>Encarregado de Proteção de Dados (DPO)<br/>Email: <a href="mailto:{{email_dpo}}">{{email_dpo}}</a><br/>Tel: {{phone}}<br/>Autoridade de controlo: <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">CNPD — www.cnpd.pt</a></p>`,
      },
    ],
  },

  legal_page_cookies: {
    title: "Política de Cookies",
    description: "Informação sobre os cookies utilizados, suas finalidades e como gerir as suas preferências.",
    lastUpdated: "6 de fevereiro de 2026",
    sections: [
      {
        title: "1. O Que São Cookies?",
        content: `<p>Cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo (computador, tablet ou telemóvel) quando visita um website. São amplamente utilizados para fazer os websites funcionarem de forma mais eficiente e para fornecer informações aos proprietários do site.</p>`,
      },
      {
        title: "2. Cookies que Utilizamos",
        content: `<h3>2.1 Cookies Necessários (sempre ativos)</h3>
<p>Estes cookies são essenciais para o funcionamento do site e não podem ser desativados.</p>
<table><thead><tr><th>Cookie</th><th>Finalidade</th><th>Duração</th></tr></thead>
<tbody>
<tr><td>gdpr_consent</td><td>Armazena as suas preferências de cookies</td><td>1 ano</td></tr>
<tr><td>sb-*-auth-token</td><td>Autenticação e sessão do utilizador</td><td>Sessão</td></tr>
</tbody></table>

<h3>2.2 Cookies de Analytics (requerem consentimento)</h3>
<p>Ajudam-nos a entender como os visitantes interagem com o site, recolhendo informações de forma anónima.</p>
<table><thead><tr><th>Cookie</th><th>Provedor</th><th>Finalidade</th><th>Duração</th></tr></thead>
<tbody>
<tr><td>_ga, _ga_*</td><td>Google Analytics</td><td>Análise de tráfego e comportamento</td><td>2 anos</td></tr>
<tr><td>_clck, _clsk</td><td>Microsoft Clarity</td><td>Mapas de calor e gravações de sessão</td><td>1 ano</td></tr>
</tbody></table>

<h3>2.3 Cookies de Marketing (requerem consentimento)</h3>
<p>Utilizados para mostrar anúncios relevantes e medir a eficácia das campanhas publicitárias.</p>
<table><thead><tr><th>Cookie</th><th>Provedor</th><th>Finalidade</th><th>Duração</th></tr></thead>
<tbody>
<tr><td>_fbp</td><td>Meta (Facebook)</td><td>Rastreamento de conversões e remarketing</td><td>3 meses</td></tr>
<tr><td>_fbc</td><td>Meta (Facebook)</td><td>Atribuição de cliques em anúncios</td><td>3 meses</td></tr>
</tbody></table>`,
      },
      {
        title: "3. Como Gerir os Cookies",
        content: `<p>Pode gerir as suas preferências de cookies de duas formas:</p>
<ul>
<li><strong>Banner de cookies:</strong> ao visitar o site pela primeira vez, pode escolher que categorias de cookies aceitar. Pode alterar as suas preferências a qualquer momento clicando em "Preferências de Cookies" no rodapé do site.</li>
<li><strong>Definições do browser:</strong> pode configurar o seu navegador para bloquear ou alertar sobre cookies. Note que bloquear cookies necessários pode afetar o funcionamento do site.</li>
</ul>`,
      },
      {
        title: "4. Google Tag Manager",
        content: `<p>Utilizamos o Google Tag Manager (GTM) para gerir os scripts de rastreamento. O GTM é configurado para respeitar as suas preferências de consentimento — os scripts de analytics e marketing só são carregados após o seu consentimento explícito.</p>`,
      },
      {
        title: "5. Mais Informações",
        content: `<p>Para mais informações sobre como tratamos os seus dados pessoais, consulte a nossa <a href="/privacy">Política de Privacidade</a>. Para questões sobre cookies, contacte-nos em <a href="mailto:{{email_dpo}}">{{email_dpo}}</a>.</p>`,
      },
    ],
  },
};

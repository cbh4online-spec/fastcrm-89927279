update public.products
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('offer_page', '{
  "version": 1,
  "enabled": true,
  "preset": "security",
  "conversionGoal": "book_demo",
  "headline": "Plataforma de Denúncias",
  "subheadline": "Canal de denúncias 100% web, em conformidade e pronto a usar",
  "shortDescription": "Solução completa de canal de denúncias: 100% web, suporte técnico 24 horas, certificado SSL, setup de configuração incluído, mini-website de consulta, edição das páginas de conteúdo e registo ilimitado de ocorrências.",
  "ctaLabel": "Marcar demonstração",
  "secondaryCtaLabel": "Falar com a equipa",
  "deliveryText": "Ativação em 5 dias úteis após setup",
  "trustBadges": [
    {"icon": "Shield", "title": "Certificado SSL", "description": "Ligação cifrada ponta a ponta"},
    {"icon": "Clock", "title": "Suporte 24 horas", "description": "Assistência técnica permanente"},
    {"icon": "CheckCircle", "title": "Conformidade legal", "description": "Alinhado com a legislação de whistleblowing"},
    {"icon": "Users", "title": "Registos ilimitados", "description": "Sem limite de denúncias submetidas"}
  ],
  "sections": {
    "description": true,
    "benefits": true,
    "specifications": true,
    "equipment": true,
    "installation": true,
    "documents": true,
    "warranty": true,
    "faq": true
  },
  "sectionOrder": ["description", "benefits", "equipment", "installation", "specifications", "warranty", "documents", "faq"],
  "sectorConfig": {
    "equipment": [
      {"title": "Portal de submissão de denúncias", "description": "Formulário público acessível por computador e telemóvel, com submissão anónima ou identificada."},
      {"title": "Mini-website de consulta", "description": "Página institucional com a política do canal e instruções para o denunciante."},
      {"title": "Backoffice de gestão de casos", "description": "Triagem, atribuição de responsáveis, estados e histórico completo de cada ocorrência."},
      {"title": "Certificado SSL dedicado", "description": "Domínio seguro com cifra de todo o tráfego."}
    ],
    "installation": [
      {"title": "1. Reunião de arranque", "description": "Levantamento dos requisitos legais e do circuito interno de tratamento."},
      {"title": "2. Setup de configuração", "description": "Criação do canal, domínio, SSL e páginas de conteúdo iniciais."},
      {"title": "3. Configuração de utilizadores e permissões", "description": "Definição dos gestores do canal e das regras de confidencialidade."},
      {"title": "4. Formação da equipa", "description": "Sessão de utilização do backoffice e boas práticas de tratamento de denúncias."},
      {"title": "5. Entrada em produção", "description": "Publicação do canal e acompanhamento nos primeiros dias."}
    ],
    "installationNote": "Setup incluído no valor. Sem instalação física necessária — serviço 100% web.",
    "modalities": ["Canal interno", "Canal partilhado por grupo empresarial"],
    "needs": ["Conformidade legal", "Gestão de casos", "Anonimato garantido"]
  },
  "faqItems": [
    {"id": "faq-anonimato", "question": "O denunciante pode manter o anonimato?", "answer": "Sim. O canal permite submissões totalmente anónimas, com um código de acompanhamento que dá acesso ao estado do caso e à comunicação com o gestor, sem revelar a identidade.", "active": true},
    {"id": "faq-prazo", "question": "Quanto tempo demora a ativação?", "answer": "Após a reunião de arranque, o canal fica normalmente operacional em cerca de 5 dias úteis, incluindo domínio, SSL e páginas de conteúdo.", "active": true},
    {"id": "faq-limite", "question": "Existe limite de denúncias?", "answer": "Não. O registo de ocorrências é ilimitado, sem custos adicionais por volume.", "active": true},
    {"id": "faq-conteudo", "question": "Podemos editar os textos do canal?", "answer": "Sim. A edição das páginas de conteúdo está incluída, permitindo adaptar a política, os textos legais e as instruções à sua organização.", "active": true}
  ]
}'::jsonb)
where id = '918dafb9-1785-4203-a2d6-0d26e20647eb';
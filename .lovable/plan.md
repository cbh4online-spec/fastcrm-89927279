# FastCRM Quality AI — Auditar e corrigir os Modelos WhatsApp Meta

Modo: correção controlada. Área: gestor de modelos oficiais Meta (página Templates WhatsApp → «Modelos oficiais Meta», editor, pré-visualização, «Usar modelo aprovado» na Nova Mensagem), a função de servidor `whatsapp-meta-templates`, as regras partilhadas e as 5 tabelas `whatsapp_meta_template*`.

## 1. Inventário e rastreabilidade
- Comparar a especificação enviada («Evolução do Gestor de Modelos WhatsApp») com o que existe: requisito | onde está | evidência | cumprido / parcial / ausente / não verificável.
- Rever também o atalho «Gerir todos» do painel WhatsApp Pro, que apontava para os templates gerais.

## 2. Funcionalidade
- Criar, guardar rascunho, validar, submeter, sincronizar, duplicar, apagar e testar; bloqueio dos modelos pendentes/aprovados.
- Variáveis `{{1}}` com exemplos obrigatórios, limites de caracteres, botões, cabeçalhos multimédia e o formato de autenticação, conforme as regras atuais da Meta.
- Estados de carregamento, vazio e erro; mensagens claras quando a Meta recusa.

## 3. Segurança e conformidade
- Só o workspace com a linha oficial (METODOPARE) e só donos/admins podem gerir; os outros workspaces ficam bloqueados no servidor.
- Regras de acesso às 5 tabelas (leitura só para membros, escrita só pelo servidor) e consultas ao backend só de leitura para confirmar.
- Envio: só modelos APROVADOS, verificação de opt-out e consentimento no servidor, marketing exige consentimento, variáveis com dados reais.
- Registo de eventos e auditoria em cada ação.

## 4. Visual
- Capturas em 390x844, 768x1024 e 1440x900 da lista, do editor (incluindo a parte de baixo), dos detalhes e da janela de envio: cortes, janelas demasiado altas, foco, botões só com ícone, scroll horizontal.

## 5. Correções
- Só mudanças pequenas e reversíveis, por prioridade (P0 a P3), com testes para cada regra corrigida.
- Mudanças nas regras de acesso, na base de dados ou na lógica de envio: proponho primeiro e peço autorização.
- Nenhum envio real, submissão à Meta ou apagamento de modelos sem autorização expressa.

## 6. Validação e relatório
- Repetir cada problema após correção, correr os testes de regras, confirmar que compila e voltar a tirar capturas.
- Relatório no formato da habilidade, com pontuação só das partes avaliadas e veredito.

## Limitações conhecidas
- A conta de teste não pertence ao METODOPARE: o fluxo autenticado completo pode ficar por verificar; se for o caso digo exatamente o quê.
- Receção de respostas e estados de entrega da Meta continuam fora do âmbito (exigem mudança de estrutura da app).

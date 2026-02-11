
# Enviar Email de Confirmacao apos Ativacao do Vendedor

## Problema

Quando um vendedor ativa a sua conta (define password e preenche os dados), o sistema cria a conta e registo de vendedor, mas nao envia nenhum email de confirmacao. O vendedor fica sem saber se o processo foi concluido e sem um link direto para comecar a vender.

## Solucao

Adicionar o envio de um email de confirmacao no final da edge function `activate-c2c-seller-invite`, logo apos o convite ser marcado como aceite.

### O que o email vai conter

- Confirmacao de que a conta foi ativada com sucesso
- Nome do marketplace (workspace)
- Link direto para fazer login e comecar a vender
- Informacoes uteis sobre os proximos passos

### Alteracoes tecnicas

**Ficheiro: `supabase/functions/activate-c2c-seller-invite/index.ts`**

1. Obter a `RESEND_API_KEY` do ambiente (ja configurada)
2. Buscar os dados do workspace (nome, slug) e store_settings (custom_domain) para construir o link correto
3. Criar uma funcao `buildConfirmationEmail()` com o template HTML do email de confirmacao (estilo consistente com o email de convite)
4. Enviar o email via Resend apos o passo 4 (marcar convite como aceite)
5. O link no email aponta para a pagina de login do marketplace: `https://fastcrm.metodopare.ai/c2c/{slug}`

### Conteudo do email

- **Assunto**: "Conta ativada - Bem-vindo ao {workspace}!"
- **Corpo**: Saudacao personalizada, confirmacao de ativacao, botao "Comecar a Vender" com link de acesso, dicas dos proximos passos (adicionar produtos, configurar perfil)
- **Design**: Mesmo estilo visual do email de convite (header azul, botao CTA, footer)

### Notas

- Se o envio do email falhar, a ativacao nao e revertida (o email e informativo, nao bloqueante)
- O erro e registado nos logs para diagnostico

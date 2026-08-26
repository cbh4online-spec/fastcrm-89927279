# "Moveis Baratos": registou-se mas não existe workspace

## Diagnóstico (verificado na base de dados e no código)

Os dois registos com o nome **Moveis Baratos** existem como utilizadores e perfis, mas **nenhum workspace foi criado** — não existe qualquer workspace com esse nome.

Confirmado:

- `pinheirox17@gmail.com` (14:31) e `pinheirox14@gmail.com` (14:55): ambos têm perfil criado, mas **email nunca confirmado** e **nunca iniciaram sessão** (`last_sign_in_at` vazio). O email de confirmação foi enviado nos dois casos.
- Todos os utilizadores anteriores da plataforma têm o email confirmado — estes dois são os únicos pendentes.
- O gatilho de novo utilizador (`handle_new_user`) apenas cria o registo em `profiles`. **Não cria workspace** — e está correto que não crie.
- O workspace só nasce no ecrã de onboarding (`/onboarding` → `create_workspace_b2b`), que exige sessão ativa.
- Após o registo, o formulário de inscrição envia o utilizador diretamente para `/onboarding`, mesmo quando a confirmação de email é obrigatória e ainda não existe sessão. Nesse cenário o utilizador é devolvido ao login sem qualquer explicação, e nunca chega a criar a organização.

Ou seja: não é um problema de visibilidade nem de permissões. **O workspace nunca foi criado porque o fluxo interrompe-se na confirmação de email.**

## O que vai ser feito

### 1. Ecrã de "confirma o teu email" após o registo
Quando o registo não devolve sessão (confirmação pendente), passar a mostrar um ecrã dedicado com:
- o email usado, instruções claras e aviso para verificar spam;
- botão "Reenviar email de confirmação" (com contagem decrescente para evitar abusos);
- ligação para voltar ao login.

Só quando o registo devolve sessão imediata é que se segue para `/onboarding`.

### 2. Guardar a intenção e retomar o onboarding após confirmação
Guardar o nome/organização indicados no registo e, no primeiro login após confirmar o email, levar o utilizador diretamente ao onboarding com esses dados pré-preenchidos, para criar a organização sem repetir informação.

### 3. Visibilidade para o administrador
Na gestão de utilizadores do super admin, marcar os registos com **email não confirmado** e **sem workspace**, com duas ações:
- reenviar convite/confirmação;
- criar a organização em nome do cliente (usa o fluxo já existente de criação por super admin).

### 4. Resolver os dois casos atuais
Reenviar a confirmação aos dois emails **ou**, se preferires, criar já o workspace "Moveis Baratos" e associá-lo a um dos utilizadores. Diz-me qual dos dois registos é o verdadeiro (`pinheirox14` ou `pinheirox17`) — o outro pode ser eliminado.

## Detalhes técnicos

- `src/components/auth/SignupForm.tsx`: passar a ler `data.session` do `signUp`; sem sessão → estado `awaitingConfirmation` em vez de `navigate("/onboarding")`; reenvio via `supabase.auth.resend({ type: "signup" })` com `emailRedirectTo: window.location.origin`.
- Persistir a intenção de onboarding (nome/empresa) em `localStorage` e consumi-la em `src/pages/Onboarding.tsx`.
- Página de gestão de utilizadores do super admin: cruzar `profiles` com `workspace_members` e com o estado de confirmação para sinalizar "pendente".
- Sem alterações de esquema nem de RLS. `handle_new_user` mantém-se inalterado (não deve criar workspaces).

## Critérios de aceitação

- Registo novo com confirmação obrigatória mostra ecrã de confirmação, permite reenviar e não fica em branco.
- Após confirmar o email e entrar, o utilizador cai no onboarding e cria a organização com os dados já preenchidos.
- O super admin vê quais os clientes registados sem workspace e pode agir.

## Riscos / por validar

- Confirmar se queres manter a confirmação de email obrigatória (recomendado) ou não.
- Decidir se o workspace "Moveis Baratos" é criado agora manualmente e para qual dos dois emails.

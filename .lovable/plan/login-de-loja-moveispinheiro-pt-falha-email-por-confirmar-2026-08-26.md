# Login de loja@moveispinheiro.pt falha: email por confirmar

## Diagnóstico (verificado na base de dados)

- A conta existe e a palavra-passe **foi mesmo definida** pelo super admin (registo atualizado às 16:06 UTC).
- O bloqueio é outro: **o email nunca foi confirmado** (`email_confirmed_at` vazio) e a conta **nunca iniciou sessão**. Com confirmação de email obrigatória, o login devolve erro mesmo com a password correta.
- A conta também **não pertence a nenhum workspace** — depois de entrar, vai cair no onboarding para criar a organização.
- O backend já tem a ação `confirm_email` na função de gestão de utilizadores, mas **nenhum ecrã do super admin a expõe** (só existem definir password, reenviar confirmação e reset).

## O que vai ser feito

### 1. Desbloquear já esta conta
Confirmar manualmente o email de `loja@moveispinheiro.pt` para que o login com a password já definida funcione de imediato.

### 2. Ação "Confirmar email manualmente" no super admin
- Adicionar o botão no drawer do super admin v2 (`BackofficeUsersV2.tsx`) e na gestão clássica (`components/super-admin/UsersSection.tsx`), invocando `confirm_email`.
- Mostrar o botão apenas quando o email está por confirmar, com aviso de que só deve ser usado para contas verificadas por outra via.
- Registar a ação em `admin_audit_logs` (a ação atual não regista — passa a registar).

### 3. Mensagem de erro clara no login
No formulário de login, tratar o erro `email_not_confirmed` com mensagem em português e ligação para reenviar o email de confirmação, em vez de "credenciais inválidas".

## Critérios de aceitação

- `loja@moveispinheiro.pt` entra com a password definida e é encaminhado para o onboarding para criar a organização.
- No super admin, qualquer conta com email pendente pode ser confirmada num clique, com registo de auditoria.
- Tentar entrar com email por confirmar mostra a razão real e permite reenviar a confirmação.

## Notas

- Recomendo alterares a password desta conta depois do primeiro acesso, já que foi partilhada em texto no chat.
- A confirmação de email obrigatória mantém-se ativa para todos os restantes registos.

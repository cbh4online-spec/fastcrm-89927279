
# Fix: Convite dá erro ao abrir o link

## Problema

Quando o destinatário clica no link do convite (`/invite/{token}`), a página mostra "Convite Inválido" porque a política de segurança (RLS) da tabela `workspace_invites` só permite leitura a membros do workspace (owner/admin/agency). O utilizador convidado ainda não é membro, logo a consulta devolve zero resultados.

## Causa

A política SELECT actual:
```
Só permite leitura se auth.uid() é membro do workspace com role owner/admin/agency
```

Quem recebe o convite por email:
- Pode não ter conta ainda
- Pode não estar autenticado
- Definitivamente não é membro do workspace

## Solução

### 1. Nova política RLS: permitir leitura por token

Adicionar uma política SELECT que permite a **qualquer pessoa** (incluindo anónimos) ler um convite específico **quando filtram por `invite_token`**. Isto é seguro porque:
- Os tokens são UUIDs aleatórios (impossíveis de adivinhar)
- Só expõe o convite específico, não todos os convites
- Necessário para o fluxo de aceitação funcionar

### 2. Nova política RLS: permitir UPDATE por token

O utilizador convidado também precisa de marcar o convite como "accepted" após login/registo. Actualmente só managers podem fazer UPDATE. Vamos adicionar uma política que permite ao próprio convidado (autenticado, com email correspondente) actualizar o status.

### 3. Sem alterações no frontend

A página `AcceptWorkspaceInvite.tsx` já está correcta - o problema é exclusivamente nas permissões da base de dados.

## Resultado

- O link do convite mostra correctamente os detalhes (workspace, role)
- O utilizador pode fazer login/registo e aceitar o convite
- Sem impacto na segurança existente (tokens são UUIDs aleatórios)

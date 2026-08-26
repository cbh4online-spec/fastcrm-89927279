# Corrigir a criação de workspaces pelo cliente

## Diagnóstico (verificado na base de dados e no código)

Existem três caminhos de criação e todos têm defeitos reais:

1. **Barra lateral / seletor de workspaces** → chama `create_workspace_with_owner`.
   - O slug é gerado no browser sem remover acentos e **sem garantir unicidade**. Nomes como "Ação" ou "Clínica Nova" produzem slugs vazios ou repetidos, e a função rebenta com erro de chave duplicada (mensagem técnica, sem explicação ao utilizador).
   - A função **não preenche `owner_id`**. Confirmado: os 4 workspaces mais recentes (JCDF, myMYA Hub, Centrality 2026, Ajax Systems) têm `owner_id` nulo, ao contrário dos antigos.
   - Não cria **subscrição** (`workspace_subscriptions`) nem estado de onboarding. Confirmado: esses 4 workspaces têm 0 subscrições. Sem subscrição, o `check-subscription` devolve o plano "starter" com `max_workspaces: 1`.

2. **Onboarding inicial** → chama `create_workspace_b2b`.
   - Esta trata o slug corretamente, mas também **não cria subscrição**, pelo que o workspace nasce sem plano.

3. **Criação pelo super admin** (`CreateWorkspaceDialog`) → chama `create_workspace_for_user`, que faz `INSERT INTO workspaces (name, slug, created_by)`. **A coluna `created_by` não existe** na tabela `workspaces` — este caminho falha sempre.
   - Além disso, o diálogo trata o retorno (um objeto JSON) como se fosse o id em texto, pelo que a marcação de trial nunca é aplicada.

## O que vai ser feito

### 1. Unificar a criação num único fluxo fiável (base de dados)
Reescrever as funções para partilharem a mesma lógica:
- Normalizar o slug no servidor (remover acentos, minúsculas, hífens) e acrescentar sufixo numérico enquanto existir colisão — nunca falhar por slug repetido.
- Preencher sempre `owner_id` com o utilizador que cria (ou o owner indicado, no caso do super admin).
- Criar sempre: membro `owner`, subscrição inicial e estado de onboarding.
- Corrigir `create_workspace_for_user` removendo a coluna inexistente `created_by`.
- Devolver sempre o mesmo formato (`id`, `name`, `slug`), para o frontend não ter de adivinhar.

### 2. Corrigir dados existentes
Preencher o `owner_id` dos workspaces em falta a partir do membro `owner`, e criar a subscrição inicial nos workspaces que estão sem plano.

### 3. Frontend
- `WorkspaceContext.createWorkspace`: deixar de gerar o slug (passa a ser responsabilidade do servidor) e passar a mostrar mensagens claras ao utilizador (nome obrigatório, limite de plano atingido, erro inesperado).
- `WorkspaceSwitcher`: validar o nome antes de submeter, mostrar estado de submissão e apresentar o erro no próprio diálogo em vez de fechar em silêncio.
- `CreateWorkspaceDialog` (super admin): ler corretamente o `id` do objeto devolvido, para o trial passar a ser aplicado.
- Onboarding (`useOnboardingActions`): deixar de calcular o slug no cliente.

### 4. Limite de plano
Quando o plano do workspace atual não permite mais workspaces, mostrar uma mensagem explícita com o caminho para upgrade, em vez de um erro genérico da base de dados.

## Detalhes técnicos

- Migração com `CREATE OR REPLACE FUNCTION` para `create_workspace_with_owner`, `create_workspace_b2b` e `create_workspace_for_user`, todas `SECURITY DEFINER` com `search_path = public`, mais uma função auxiliar `public.generate_unique_workspace_slug(text)`.
- Migração de dados: `UPDATE workspaces SET owner_id = (…owner em workspace_members…) WHERE owner_id IS NULL` e `INSERT` das subscrições em falta.
- Ficheiros a alterar: `src/contexts/WorkspaceContext.tsx`, `src/components/layout/WorkspaceSwitcher.tsx`, `src/components/super-admin/CreateWorkspaceDialog.tsx`, `src/hooks/onboarding/useOnboardingActions.ts`.
- As políticas RLS existentes já permitem a criação; não é necessário alterá-las.

## Critérios de aceitação

- Criar workspace com nome acentuado ou repetido ("Ação", duas vezes "Teste") funciona e gera slugs distintos.
- Todo o workspace novo fica com `owner_id`, membro `owner`, subscrição e estado de onboarding.
- Criação pelo super admin funciona e o trial de 14 dias é aplicado.
- Erros aparecem em português, dentro do diálogo, sem fechar o formulário.

## Riscos / por validar

- Qual o plano por defeito a atribuir a novos workspaces (starter/free) e se deve incluir trial — confirmar contigo antes de aplicar a migração.

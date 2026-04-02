

# Sincronizar Empresas dos Contactos com a Tabela de Empresas

## Diagnóstico

Existem **16 contactos** com o campo `company` preenchido (texto) mas sem `company_id` (sem ligação à tabela `companies`). Isto significa que estas empresas existem apenas como texto nos contactos mas não como registos na tabela de empresas.

Exemplos: "Simples e Divertido", "J.monteiro & Filhos Lda", "Authenticaravel Unipessoal LDA", "Connecthub", etc.

Os contactos que **já têm** `company_id` estão todos corretamente ligados a empresas existentes (0 órfãos).

## Solução

Criar um script de sincronização que:

1. **Busca contactos órfãos** — contactos com `company` preenchido mas `company_id = null`
2. **Para cada empresa única**, verifica se já existe na tabela `companies` (match por nome normalizado)
3. **Se não existe**, cria o registo na tabela `companies` com os dados disponíveis (nome, email, phone, workspace_id)
4. **Atualiza o contacto** com o `company_id` correto

### Implementação

Adicionar um botão "Sincronizar Empresas" na página de Contactos (ou Empresas) que executa esta lógica via uma função no frontend, usando o Supabase client. A lógica será implementada num hook `useSyncCompanyContacts`.

## Ficheiros

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useSyncCompanyContacts.ts` | Novo hook com lógica de deteção e criação de empresas órfãs |
| `src/components/contacts/AttioContactsTable.tsx` | Adicionar botão "Sincronizar Empresas" no header da tabela |

## Fluxo

1. Utilizador clica "Sincronizar Empresas"
2. Hook busca contactos com `company` preenchido e `company_id` nulo
3. Para cada nome de empresa único, tenta fazer match com empresas existentes
4. Se não encontra, cria empresa nova com `name`, `workspace_id`, `created_by`
5. Atualiza `company_id` no contacto
6. Mostra toast com resumo: "X empresas criadas, Y contactos vinculados"

## Critérios de aceitação

- Todos os contactos com campo `company` ficam com `company_id` preenchido
- Empresas criadas aparecem na listagem de Empresas
- Sem duplicação de empresas (match case-insensitive por nome)
- Feedback visual ao utilizador com progresso/resultado


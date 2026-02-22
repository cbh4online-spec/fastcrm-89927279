

# Filtrar contactos existentes nas novas pesquisas de prospeccao

## Problema

Quando o utilizador faz uma nova pesquisa, o sistema retorna perfis que ja existem como contactos no CRM ou que ja foram convertidos em leads anteriormente. Isto desperdiça creditos de analise e cria confusao na lista de resultados.

## Onde atuar

A filtragem deve acontecer em dois pontos:

### 1. Edge Function `professional-prospecting-analyze/index.ts`

Antes de analisar cada perfil com IA (que gasta creditos), verificar na base de dados:

**a) Perfis ja prospectados (qualquer status):** Consultar `professional_prospecting_profiles` para ver se o `profile_url` ja existe neste workspace. Se existir com status `converted` ou `rejected`, ignorar (nao gastar creditos). Se existir com status `analyzed`, reutilizar (nao re-analisar).

**b) Contactos ja existentes:** Consultar a tabela `contacts` para verificar se algum contacto do workspace ja tem o mesmo URL de perfil (cruzando com campos como email ou nome normalizado). Tambem cruzar leads existentes para perfis ja convertidos.

Logica concreta:
- Buscar todos os `profile_url` existentes em `professional_prospecting_profiles` para o workspace
- Filtrar os perfis recebidos, removendo os que ja existem com status `converted` ou `rejected`
- Os restantes sao analisados normalmente

### 2. Edge Function `professional-prospecting-search/index.ts`

Apos extrair perfis dos resultados da web, antes de retornar ao frontend:

- Buscar URLs ja existentes em `professional_prospecting_profiles` com status `converted` ou `rejected`
- Remover esses perfis do resultado antes de enviar para analise
- Incluir contagem de perfis filtrados na resposta para feedback ao utilizador

## Detalhes tecnicos

**`professional-prospecting-search/index.ts`** (linhas 412-415, antes de retornar):

```text
// Apos extrair todos os perfis (linha 412)
// 1. Buscar URLs ja existentes neste workspace
const { data: existingProfiles } = await supabase
  .from("professional_prospecting_profiles")
  .select("profile_url, status")
  .eq("workspace_id", workspaceId)
  .in("status", ["converted", "rejected", "analyzed"]);

// 2. Criar set de URLs a excluir
const existingUrls = new Set(
  (existingProfiles || []).map(p => p.profile_url)
);

// 3. Filtrar perfis novos
const newProfiles = finalProfiles.filter(p => !existingUrls.has(p.profileUrl));

// 4. Retornar apenas perfis novos (com contagem de filtrados)
```

**`professional-prospecting-analyze/index.ts`** (linhas 152-154, antes do loop de analise):

```text
// Segunda camada de filtragem (caso de URLs manuais)
const { data: existingInDb } = await supabase
  .from("professional_prospecting_profiles")
  .select("profile_url, status")
  .eq("workspace_id", workspaceId)
  .in("profile_url", profilesToAnalyze.map(p => p.profileUrl));

const alreadyProcessed = new Set(
  (existingInDb || [])
    .filter(p => p.status === "converted" || p.status === "rejected")
    .map(p => p.profile_url)
);

// Filtrar antes de analisar
const trulyNewProfiles = profilesToAnalyze.filter(
  p => !alreadyProcessed.has(p.profileUrl)
);
```

**Frontend (`ProspectingSearch.tsx`):** Mostrar toast com informacao de perfis filtrados:
- "15 perfis encontrados (3 ja existentes removidos)"

## Resumo

| Ficheiro | Alteracao |
|---|---|
| `professional-prospecting-search/index.ts` | Filtrar perfis ja existentes antes de retornar resultados |
| `professional-prospecting-analyze/index.ts` | Segunda filtragem antes de gastar creditos de analise IA |
| `ProspectingSearch.tsx` | Mostrar feedback sobre perfis filtrados no toast |

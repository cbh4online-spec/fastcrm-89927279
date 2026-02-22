

# Melhorar a descoberta de perfis e suporte multilingue na prospeccao

## Problema

O sistema de pesquisa encontra poucos ou nenhuns perfis para profissoes como "fisioterapeuta" porque:

1. **Queries demasiado restritivas**: Todas as queries incluem "Portugal" como sufixo obrigatorio, mesmo quando o utilizador nao especifica localizacao
2. **Poucas variantes de pesquisa**: Maximo de 6 queries para Instagram e 4 para Facebook -- insuficiente para cobrir diferentes formatos de perfis
3. **Pesquisa apenas em portugues**: `lang: "pt"` e `country: "PT"` limitam os resultados a paginas portuguesas, ignorando profissionais de outros paises
4. **Falta de queries genericas**: Nao ha queries sem `site:` que capturem directórios profissionais, listagens e artigos que mencionem perfis sociais

## Solucao

### 1. Expandir as estrategias de pesquisa (`generateInstagramQueries`)

- Adicionar queries sem restricao de pais quando a localizacao nao e especificada
- Incluir queries em ingles para a mesma profissao (ex: "physiotherapist" para "fisioterapeuta")
- Adicionar queries que pesquisem em diretorios e listagens (ex: "melhores fisioterapeutas instagram")
- Aumentar o limite de queries de 6 para 10
- Adicionar pesquisa por hashtags (#fisioterapia, #physiotherapy)

### 2. Mapeamento profissao PT para EN

Criar um dicionario de traducao de profissoes para ingles, permitindo gerar queries bilingues:

```text
"fisioterapeuta" -> ["physiotherapist", "physio", "physical therapist"]
"dentista" -> ["dentist", "dental"]
"cabeleireiro" -> ["hairdresser", "hair stylist", "barber"]
"nutricionista" -> ["nutritionist", "dietitian"]
etc.
```

### 3. Pesquisa multilingue na Firecrawl

- Quando a localizacao NAO e Portugal, remover `country: "PT"` e `lang: "pt"` das chamadas Firecrawl
- Executar queries adicionais em ingles sem restricao de pais
- Adicionar 2-3 queries internacionais automaticamente

### 4. Adaptar lingua na analise IA

No `professional-prospecting-analyze`, quando o perfil vem de um pais diferente:
- Detetar a lingua/pais a partir do URL, bio ou localizacao do perfil
- Gerar a mensagem AIDA na lingua do pais do perfil em vez de sempre em portugues

## Detalhes tecnicos

### Ficheiro: `professional-prospecting-search/index.ts`

**a) Novo dicionario de traducoes (apos linha 41):**

```text
const professionTranslations: Record<string, string[]> = {
  "fisioterapeuta": ["physiotherapist", "physio", "physical therapist", "physical therapy"],
  "dentista": ["dentist", "dental clinic"],
  "médico dentista": ["dentist", "dental surgeon"],
  "cabeleireiro": ["hairdresser", "hair stylist", "barber"],
  "cabeleireira": ["hairdresser", "hair stylist"],
  "esteticista": ["esthetician", "beauty therapist", "skincare"],
  "nutricionista": ["nutritionist", "dietitian", "nutrition"],
  "psicólogo": ["psychologist", "therapist", "psychology"],
  "personal trainer": ["personal trainer", "fitness coach", "gym trainer"],
  "massagista": ["massage therapist", "masseuse"],
  "fotógrafo": ["photographer", "photography"],
  "advogado": ["lawyer", "attorney"],
  "arquiteto": ["architect"],
  "maquilhador": ["makeup artist", "MUA"],
  "médico": ["doctor", "physician"],
};
```

**b) Expandir `generateInstagramQueries` (linhas 19-78):**

- Adicionar queries com traducoes em ingles
- Adicionar queries de hashtags (#fisioterapia, #physiotherapy)
- Adicionar queries sem "Portugal" para resultados internacionais
- Adicionar queries de diretorios ("melhores [profissao] instagram")
- Aumentar limite de 6 para 10 queries

**c) Expandir `generateFacebookQueries` (linhas 81-101):**

- Adicionar queries em ingles
- Aumentar limite de 4 para 6 queries

**d) Pesquisa Firecrawl multilingue (linhas 370-378):**

- Primeiras queries: manter `lang: "pt"`, `country: "PT"`
- Queries em ingles: usar `lang: "en"` sem country ou com country do pais-alvo
- Aumentar `limit` de 20 para 25 por query

### Ficheiro: `professional-prospecting-analyze/index.ts`

Na geracao da mensagem AIDA, adicionar instrucao para adaptar a lingua:

```text
// No prompt de analise, adicionar:
"Se o perfil aparenta ser de um país que não fala português 
(ex: bio em inglês, localização internacional), 
gera a mensagem na língua predominante do perfil."
```

## Resumo

| Ficheiro | Alteracao |
|---|---|
| `professional-prospecting-search/index.ts` | Dicionario PT-EN, mais queries, queries internacionais, hashtags, aumento de limites |
| `professional-prospecting-analyze/index.ts` | Adaptar lingua da mensagem AIDA ao pais/lingua do perfil |


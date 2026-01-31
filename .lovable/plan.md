
# Plano: Auditoria Funcional Dinamica com Actualizacao e Relatorio PDF Detalhado

## Problema Identificado

A auditoria actual tem duas limitacoes principais:

1. **Dados estaticos hardcoded**: Os numeros mostrados (65 rotas, 100 tabelas, etc.) estao fixos no codigo e nao reflectem a realidade actual do sistema (ja existem 297 tabelas na base de dados, 130+ edge functions, 180+ hooks)

2. **Relatorio PDF basico**: O PDF gerado tem apenas 6 paginas com informacao generica, sem dados reais sobre o estado do sistema

3. **Sem indicacao de ultima actualizacao**: O utilizador nao sabe quando os dados foram recolhidos

---

## Solucao Proposta

### 1. Dados Dinamicos em Tempo Real

Criar um sistema que recolhe metricas reais:

```text
Metricas a recolher dinamicamente:
- Tabelas: Query a information_schema.tables (actualmente 297)
- Edge Functions: Contagem de diretorias em supabase/functions (130+)
- Rotas: Contagem de <Route> no App.tsx (99+)
- Componentes: Contagem de ficheiros .tsx em src/components
- Hooks: Contagem de ficheiros em src/hooks (180+)
- Modulos instalados por workspace
```

### 2. Botao de Actualizacao com Timestamp

Adicionar no topo da secao:
- Data/hora da ultima actualizacao
- Botao "Actualizar Auditoria" que recarrega todas as metricas
- Indicador visual de "dados actualizados" vs "dados antigos"

### 3. Relatorio PDF Profissional e Detalhado

Expandir o PDF de 6 para ~20 paginas com:

```text
Indice:
1. Capa Profissional
2. Sumario Executivo (2 pag)
3. Metricas do Sistema (2 pag) - com graficos
4. Arquitectura Tecnica (3 pag)
   - Stack tecnologico
   - Diagrama de componentes
   - Fluxo de dados
5. Modulos Funcionais (4 pag) - um por pagina
6. Estrutura de Base de Dados (3 pag)
   - Entidades principais com relacoes
   - Politicas RLS
   - Triggers e funcoes
7. Edge Functions (2 pag)
   - Lista categorizada
   - Intencao de cada funcao
8. Seguranca e Compliance (2 pag)
   - RLS policies activas
   - Roles e permissoes
   - RGPD
9. Integracoes Externas (1 pag)
10. Roadmap e Recomendacoes (1 pag)
```

---

## Implementacao Tecnica

### Ficheiro: `src/hooks/useSystemAudit.ts` (Novo)

Hook para recolher metricas reais:

```text
export function useSystemAudit() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    
    // Query tabelas reais
    const { count: tableCount } = await supabase
      .from('information_schema.tables')
      .select('*', { count: 'exact', head: true })
      .eq('table_schema', 'public');

    // Outras metricas via edge function ou estimativas
    // ...

    setLastUpdated(new Date());
    setIsLoading(false);
  };

  return { metrics, lastUpdated, isLoading, refresh: fetchMetrics };
}
```

### Ficheiro: `src/components/super-admin/FunctionalAuditSection.tsx` (Modificar)

```text
Alteracoes:
1. Usar useSystemAudit() em vez de constantes hardcoded
2. Adicionar header com lastUpdated e botao Refresh
3. Expandir generatePDF() para 20+ paginas
4. Adicionar secoes detalhadas ao PDF
```

### Estrutura do PDF Expandido

```text
Novas secoes a adicionar ao generatePDF():

// Arquitectura
- Diagrama de componentes (ASCII art)
- Lista de tecnologias com versoes
- Padrao de pastas do projecto

// Base de Dados Detalhada  
- Lista completa de tabelas agrupadas por modulo
- Relacoes entre entidades
- Triggers activos

// Edge Functions
- Categorias: AI, Email, Billing, Integrations, etc.
- Descricao de cada funcao

// Seguranca Detalhada
- Numero de policies RLS por tabela
- Buckets de storage
- Regras de autenticacao

// Metricas de Performance
- Tabelas com mais registos
- Queries lentas (se disponivel)
```

---

## Interface do Utilizador

### Header da Secao

```text
+------------------------------------------------------------------+
| Auditoria Funcional                                               |
| Gerar documentacao tecnica completa do sistema                   |
+------------------------------------------------------------------+
| Ultima actualizacao: 31 Jan 2026, 16:45                          |
| [Actualizar Dados]                      Status: Dados actualizados|
+------------------------------------------------------------------+
```

### Cards de Metricas (dinamicos)

```text
Em vez de:  65+ Rotas (hardcoded)
Mostrar:    99 Rotas (dinamico, com loading state)
```

---

## Ficheiros a Criar/Modificar

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/hooks/useSystemAudit.ts` | Novo | Hook para recolher metricas reais |
| `src/components/super-admin/FunctionalAuditSection.tsx` | Modificar | Usar dados dinamicos + PDF expandido |
| `src/utils/pdfAuditGenerator.ts` | Novo | Logica de geracao do PDF separada |
| `src/types/audit.ts` | Novo | Tipos TypeScript para auditoria |

---

## Conteudo Detalhado do PDF

### Capa (pagina 1)
- Logo FastCRM
- Titulo: "Auditoria Funcional Completa"
- Data de geracao
- Versao do sistema

### Sumario Executivo (paginas 2-3)
- Visao geral do sistema
- Principais metricas em destaque
- Estado de saude geral
- Pontos fortes identificados

### Metricas Detalhadas (paginas 4-5)
- Tabela com todas as metricas
- Comparacao com benchmarks
- Evolucao (se disponivel historico)

### Arquitectura (paginas 6-8)
- Stack: React, Vite, Tailwind, TypeScript, Supabase
- Estrutura de pastas
- Padrao de componentes
- Fluxo de autenticacao

### Modulos (paginas 9-12)
- Uma pagina por grupo de modulos
- Componentes de cada modulo
- Estado de implementacao
- Funcionalidades principais

### Base de Dados (paginas 13-15)
- Lista de 297 tabelas agrupadas
- Relacoes principais
- Policies RLS activas
- Storage buckets

### Edge Functions (paginas 16-17)
- 130+ funcoes categorizadas
- AI Functions, Email, Billing, Integracao
- Descricao de cada categoria

### Seguranca (paginas 18-19)
- RLS em todas as tabelas
- Roles do sistema
- Compliance RGPD
- Recomendacoes

### Conclusao (pagina 20)
- Resumo do estado
- Proximos passos recomendados
- Contacto para suporte

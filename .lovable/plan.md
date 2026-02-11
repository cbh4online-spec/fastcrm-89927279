

# Mostrar Apenas o Convite Mais Recente por Email

## Problema

Quando se reenvia um convite, o sistema revoga o antigo e cria um novo. Isto resulta em multiplas entradas na lista para a mesma pessoa (ex: 3 entradas para "Jorge Cardoso"), dando a impressao errada de que existem 6 pessoas convidadas quando na realidade sao apenas 2.

## Solucao

Filtrar a lista de convites no frontend para mostrar apenas o convite mais recente de cada email, e atualizar o contador do tab "Convites" para refletir o numero real de pessoas convidadas.

### Alteracoes

**Ficheiro: `src/components/c2c/SellerInvitesList.tsx`**
- Apos receber os convites da query, agrupar por email e manter apenas o mais recente (primeiro de cada grupo, ja que a query ordena por `created_at DESC`)
- A lista passa a mostrar 1 linha por pessoa em vez de 1 linha por convite

**Ficheiro onde o contador "(6)" e renderizado** (tab "Convites")
- Atualizar para usar a mesma logica de deduplicacao, mostrando o numero real de pessoas (ex: "Convites (2)" em vez de "Convites (6)")

### Logica de Deduplicacao

```text
convites ordenados por created_at DESC (ja vem assim da query)
  -> agrupar por email
  -> manter apenas o primeiro (mais recente) de cada grupo
  -> resultado: 1 entrada por pessoa
```

### Exemplo Visual

Antes: Jorge Cardoso (Pendente), Jorge Cardoso (Pendente), Strongadget (Pendente), Strongadget (Revogado), Jorge Cardoso (Revogado), Jorge Cardoso (Revogado)

Depois: Jorge Cardoso (Pendente), Strongadget (Pendente)

### Sem alteracoes de base de dados
A filtragem e feita no frontend. Os registos historicos continuam na base de dados para auditoria.


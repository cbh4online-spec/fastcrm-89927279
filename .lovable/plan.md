

# Permitir Instalar/Desinstalar os 5 Módulos

## Problema Identificado

Os módulos **Portal B2B**, **Loja Online**, **Marketplace C2C**, **FastClub** e **Instagram Looter** não podem ser instalados/desinstalados porque:

1. **Portal B2B** e **Instagram Looter** nem sequer existem no array `SAMPLE_MODULES` (ficheiro `src/types/marketplace.ts`)
2. Nenhum dos 5 existe na tabela `marketplace_modules` da base de dados -- e o fluxo de instalação (`installModule`) procura o slug nessa tabela para obter o UUID antes de inserir em `workspace_modules`

## Solução

### 1. Adicionar os 2 módulos em falta ao `SAMPLE_MODULES`

| Módulo | slug | Categoria |
|---|---|---|
| Portal B2B | `b2b-portal` | `sales` |
| Instagram Looter | `instagram-looter` | `prospecting` |

### 2. Inserir os 5 módulos na tabela `marketplace_modules`

Inserir registos na base de dados para que o fluxo de instalação funcione:

- `b2b-portal` -- Portal B2B
- `online-store` -- Loja Online
- `marketplace-c2c` -- Marketplace C2C
- `fastclub` -- FastClub (Comunidade)
- `instagram-looter` -- Instagram Looter

### Ficheiros a Alterar

| Ficheiro | Alteracao |
|---|---|
| `src/types/marketplace.ts` | Adicionar 2 novos modulos (`b2b-portal`, `instagram-looter`) ao array `SAMPLE_MODULES` |

### Dados a Inserir

| Tabela | Operacao |
|---|---|
| `marketplace_modules` | INSERT de 5 registos com os slugs correspondentes |

Depois destas alteracoes, os botoes de instalar/desinstalar no `ModuleDetailSheet` funcionarao correctamente para todos os 5 modulos.


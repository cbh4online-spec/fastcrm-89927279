
# Fase C — Reestruturacao do FastClub + Navegacao

A maioria do trabalho de navegacao ja foi feito nas fases anteriores. Faltam os retoques finais para completar a Fase C.

---

## 1. Adicionar "Conta & Plano" a sidebar do FastClub

No grupo FastClub em `src/components/layout/Sidebar.tsx`, adicionar item apos "Anuncios Oficiais":

```text
{ name: "Conta & Plano", href: "/dashboard/settings/billing", icon: CreditCard, tooltip: "Gerir plano e faturacao" }
```

---

## 2. Separador visual "Zona Premium" na sidebar

Atualmente os items premium (Missao da Semana, Implementacao Guiada, etc.) estao misturados com os items gratuitos sem distincao visual.

Solucao: Adicionar uma propriedade `dividerBefore` no item "Missao da Semana" e renderizar um separador com label "Zona Premium" antes dele na funcao `renderNavItem`. O separador sera um texto pequeno, discreto, com linha horizontal.

---

## 3. CTA "Desafio 7 Dias" dentro do Start Here

No `src/pages/fastclub/StartHerePage.tsx`, adicionar um botao CTA na seccao final que linka para `/dashboard/fastclub/desafio-7-dias`:

```text
"Iniciar Desafio 7 Dias" (botao outline ao lado dos existentes)
```

---

## 4. RedePrivadaPage com dados dinamicos

Atualmente `src/pages/fastclub/RedePrivadaPage.tsx` tem conteudo hardcoded (stats fixos com "—", seccoes estaticas). Atualizar para:

- Buscar indicadores agregados reais de `fastmatch_profiles` e `fastmatch_connections` (total membros verificados, total conexoes, taxa estimada)
- Buscar seccoes de conteudo de `fastclub_content_sections` com `page_key = 'rede-privada'` (com fallback para o conteudo hardcoded atual se nao houver dados)

---

## 5. Limpeza de rotas legadas

As rotas `/dashboard/fastclub/forum`, `/dashboard/fastclub/rewards` e `/dashboard/fastclub/desafio-7-dias` existem mas foram removidas da sidebar. Manter as rotas como estao (ainda funcionais) para nao quebrar links existentes. A rota `desafio-7-dias` e acessivel via CTA no Start Here.

---

## Detalhe Tecnico

### Ficheiros a editar

| Ficheiro | Alteracao |
|---|---|
| `src/components/layout/Sidebar.tsx` | Adicionar "Conta & Plano", separador "Zona Premium" |
| `src/pages/fastclub/StartHerePage.tsx` | Adicionar CTA "Desafio 7 Dias" |
| `src/pages/fastclub/RedePrivadaPage.tsx` | Dados dinamicos (stats + conteudo DB) |

### Sem migracoes SQL necessarias

Todas as tabelas ja existem. Os dados sao lidos de `fastmatch_profiles`, `fastmatch_connections` e `fastclub_content_sections`.

### Ordem de execucao

1. Sidebar (Conta & Plano + separador Zona Premium)
2. StartHerePage (CTA Desafio)
3. RedePrivadaPage (dados dinamicos)

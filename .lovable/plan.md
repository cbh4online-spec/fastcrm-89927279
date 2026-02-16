
# Integrar Templates Verticais AIDA na Gestao de Landing Pages

## Problema

A pagina de Landing Pages (`/dashboard/landing-pages`) mostra apenas as landing pages customizadas criadas via base de dados. Os 6 templates verticais AIDA (clinicas, imobiliarias, formacao, condominios, agencias, empresas) existem apenas como configuracao estatica e nao aparecem nesta secao -- tornando impossivel geri-los a partir do painel.

## Solucao

Adicionar uma secao de "Templates Verticais" na pagina de Landing Pages que mostra os 6 templates AIDA lado a lado com as paginas customizadas. Cada card vertical tera:
- Nome e slug da vertical
- Badge "AIDA Template"
- Estado publicado (rota publica ativa)
- Botao para ver/abrir a pagina publica
- Botao para editar a configuracao (futura funcionalidade)

## Plano Tecnico

### Ficheiro a editar: `src/components/landing-pages/LandingPagesList.tsx`

1. Importar `verticalConfigs` de `@/config/verticalConfigs.ts`
2. Adicionar secao "Templates Verticais AIDA" com tabs ou separador visual acima das paginas customizadas
3. Renderizar cards para cada vertical com:
   - Titulo (ex: "Clinicas"), slug (ex: `/clinicas`)
   - Badge "AIDA" com cor accent da vertical
   - Link externo para abrir a pagina publica (ex: `https://fastcrm.lovable.app/clinicas`)
   - Estado sempre "Published" (rotas publicas ativas)
4. Manter a secao existente de paginas customizadas abaixo, com toda a funcionalidade atual intacta

### Estrutura visual

```text
+------------------------------------------+
|  Landing Pages                   [+ New]  |
+------------------------------------------+
|  TEMPLATES VERTICAIS (AIDA)               |
|  +----------+ +----------+ +----------+  |
|  | Clinicas | | Imobili. | | Formacao |  |
|  | /clinicas| | /imobil. | | /formac. |  |
|  | [Abrir]  | | [Abrir]  | | [Abrir]  |  |
|  +----------+ +----------+ +----------+  |
|  +----------+ +----------+ +----------+  |
|  | Condomin.| | Agencias | | Empresas |  |
|  +----------+ +----------+ +----------+  |
+------------------------------------------+
|  PAGINAS CUSTOMIZADAS                     |
|  (lista existente com create/edit/delete) |
+------------------------------------------+
```

### Detalhes

- Os cards verticais usam a cor `accent` de cada `verticalConfig` para o badge
- Link externo aponta para a rota publica da app (ex: `/clinicas`)
- Nao e necessaria migracao de base de dados
- Nao e necessario novo componente -- alteracao apenas no `LandingPagesList.tsx`

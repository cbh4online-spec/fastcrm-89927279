

## Plano: Menu "Vagas" na Landing Page + Esconder Remuneração

### Contexto
O utilizador quer duas alterações:
1. Adicionar uma entrada "Vagas" no menu da landing page principal (header sticky) que aponte para a página pública de carreiras
2. Remover os valores de remuneração (salário) das páginas públicas de vagas

### Alterações

#### 1. Adicionar "Vagas" ao menu da landing page

**Ficheiros:** `LandingStickyHeader.tsx` + 4 ficheiros de tradução (`landing.json` em pt/en/es/fr)

- Adicionar novo item ao array `navKeys` com `href: "/careers"` (link externo, não âncora) e `key: "nav.careers"`
- Como é um link de rota (não âncora `#`), usar `<Link to="/careers">` em vez de `<a href>`
- Adicionar tradução `"careers"` ao objecto `nav` nos 4 idiomas (PT: "Vagas", EN: "Careers", ES: "Empleo", FR: "Carrières")

Nota: O link `/careers` precisa de um slug de workspace. Pode apontar para uma rota genérica ou para o slug do workspace principal. Vou verificar se faz sentido criar uma rota `/careers` que redirecione automaticamente.

#### 2. Remover valores de remuneração das páginas públicas

**Ficheiro:** `CareersPage.tsx`
- Remover linhas 140-148 (bloco que mostra `salary_min`/`salary_max` nos cards da listagem)

**Ficheiro:** `JobDetailPublicPage.tsx`
- Remover linhas 76-84 (Badge com range salarial no header da vaga)

### Critérios de aceitação
- Menu da landing page inclui link "Vagas" (desktop e mobile)
- Nenhum valor de salário aparece nas páginas públicas `/careers/`
- Páginas internas de gestão de vagas mantêm os salários visíveis


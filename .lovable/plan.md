

## Tornar redes sociais visíveis no detalhe do Lead

### Situação atual
O `EntityDetailsPanel` já tem uma secção "Redes Sociais" com LinkedIn, Facebook, Instagram, Twitter, YouTube, TikTok, Pinterest e WhatsApp — todos como links clicáveis e editáveis. Porém, essa secção tem `defaultOpen={false}`, ficando escondida.

### Alterações

**1. `EntityDetailsPanel.tsx` — Abrir secção automaticamente quando há dados**
- Na função `LeadDetails`, calcular se algum URL social existe (`linkedin_url || instagram_url || facebook_url || twitter_url || ...`)
- Passar `defaultOpen={hasSocialUrls}` à `CollapsibleSection` de Redes Sociais
- Aplicar a mesma lógica às funções `CompanyDetails` e `ContactDetails`

**2. `LeadDetailWithSidebar.tsx` — Ícones sociais rápidos no header**
- Adicionar uma linha de ícones clicáveis (LinkedIn, Facebook, Instagram, Twitter) logo abaixo do nome do lead no header
- Cada ícone só aparece se o URL correspondente existir
- Ao clicar, abre o URL num novo tab
- Usar as cores oficiais de cada plataforma (já definidas no código: `#0A66C2`, `#1877F2`, `#E4405F`, etc.)
- Layout: ícones pequenos (16px) inline com hover tooltip mostrando o nome da rede

### Ficheiros a modificar
- `src/components/entity/EntityDetailsPanel.tsx` — auto-expand quando há dados
- `src/components/crm/LeadDetailWithSidebar.tsx` — ícones sociais no header

### Resultado
As redes sociais encontradas pelo enricher ficam imediatamente visíveis tanto no header (ícones rápidos) como no painel lateral (secção expandida), sem precisar de cliques extra.


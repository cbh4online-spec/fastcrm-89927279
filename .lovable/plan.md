

# Adicionar Meta Module ao Marketplace

## Problema
O módulo Meta não aparece no Marketplace porque não existe registo na tabela `marketplace_modules`.

## Solução
Inserir o registo do módulo Meta na tabela `marketplace_modules` via migração SQL, seguindo o padrão dos módulos de marketing existentes.

## Alteração

**Migração SQL** — INSERT do módulo Meta:

```sql
INSERT INTO marketplace_modules (
  slug, name, tagline, description, category, icon,
  target_audience, internal_type, status, version,
  pricing_model, price_eur, min_plan,
  is_featured, is_new, publisher
) VALUES (
  'meta-module',
  'Meta',
  'Integração nativa com Facebook e Instagram',
  'Conecte as suas Pages, receba leads do Lead Ads, unifique Messenger e Instagram DM no CRM e monitorize a saúde da integração em tempo real.',
  'marketing',
  'facebook',
  'Equipas de marketing e vendas que usam Facebook/Instagram para captação de leads',
  'core',
  'active',
  '1.0.0',
  'free',
  0.00,
  'growth',
  true,
  true,
  'FastCRM'
);
```

Nenhuma alteração de código é necessária — o Marketplace já carrega módulos dinamicamente da base de dados.


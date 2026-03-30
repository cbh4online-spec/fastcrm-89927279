

## Instalar Typesense + Adapter para Pesquisa Avançada

### Diagnóstico

Nenhuma das duas dependências existe no `package.json`.

### Plano

1. Instalar `typesense` e `typesense-instantsearch-adapter` como dependências de produção
2. Validar build

### Comando

```bash
npm install typesense typesense-instantsearch-adapter
```

### Riscos

Nenhum conflito esperado — são bibliotecas standalone. O adapter depende de `instantsearch.js` que será instalado automaticamente como dependência transitiva.


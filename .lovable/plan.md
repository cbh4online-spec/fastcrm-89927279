
# Adicionar Botao "Voltar" na Pagina de Sponsors

## Problema
A pagina de gestao de sponsors (`/dashboard/c2c/sponsors`) nao tem botao para voltar ao menu principal do C2C Marketplace.

## Solucao
Adicionar um botao "Voltar ao Marketplace" no topo da pagina, seguindo o mesmo padrao ja usado nas outras paginas C2C (como Messages e Favorites).

## Seccao Tecnica

### Ficheiro: `src/pages/c2c/C2CSponsorAdmin.tsx`

Adicionar import de `ArrowLeft` do lucide-react e `useNavigate` do react-router-dom. Inserir um botao no inicio do conteudo da pagina:

```tsx
<Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/c2c")} className="mb-4 -ml-2">
  <ArrowLeft className="h-4 w-4 mr-1" /> Marketplace
</Button>
```

| Ficheiro | Alteracao |
|---|---|
| `src/pages/c2c/C2CSponsorAdmin.tsx` | Adicionar botao de navegacao para voltar ao `/dashboard/c2c` |

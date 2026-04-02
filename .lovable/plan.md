

# Criar Produto na Página da Loja com Formulário Completo

## Diagnóstico

A página `StoreProductsAdminPage` tem um botão "Criar Rápido" que navega para outra rota e um "Criar com IA" que abre um dialog simplificado. Não existe opção de criar produto com o formulário completo (`CreateProductDialog`) directamente na loja.

## Solução

Adicionar um botão "Novo Produto" que abre o `CreateProductDialog` (o mesmo formulário completo de 1291 linhas usado no catálogo principal). Ao fechar com sucesso, os dados da tabela são refrescados.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/pages/StoreProductsAdminPage.tsx` | Importar `CreateProductDialog`, adicionar state `createOpen`, adicionar botão "Novo Produto" com ícone `Plus`, renderizar o dialog |

### Detalhe

- Novo state: `const [createOpen, setCreateOpen] = useState(false)`
- Botão na barra de acções (antes dos botões existentes): `<Button variant="default" onClick={() => setCreateOpen(true)}>+ Novo Produto</Button>`
- Reorganizar botões: "Novo Produto" (primário) | "Criar com IA" (outline) | "Criar Rápido" (outline/ghost)
- Renderizar: `<CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} />`
- Import adicional: `Plus` de lucide-react, `CreateProductDialog` de `@/components/products/CreateProductDialog`


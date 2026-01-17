import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Grid3X3,
  List,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Eye,
  EyeOff,
  Clock,
  CircleDollarSign,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { useServices, type Service, type CreateServiceData } from '@/hooks/useServices';
import { ServiceCard } from './ServiceCard';
import { ServiceCreateModal } from './ServiceCreateModal';
import { PageHeader } from '@/components/common/PageHeader';
import { Toolbar } from '@/components/common/Toolbar';
import { FilterSidebar, FilterGroup } from '@/components/common/FilterSidebar';
import { toast } from 'sonner';

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96];

const pageTabs = [
  { id: 'services', label: 'Serviços' },
  { id: 'categories', label: 'Categorias' },
  { id: 'analytics', label: 'Estatísticas' },
];

const sortOptions = [
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'name_desc', label: 'Nome (Z-A)' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'duration_asc', label: 'Menor duração' },
  { value: 'duration_desc', label: 'Maior duração' },
];

export function ServicesDashboard() {
  const {
    services,
    categories,
    isLoading,
    createService,
    updateService,
    deleteService,
    createCategory,
    toggleServiceStatus,
  } = useServices();

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // New state for reorganized UI
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [activeTab, setActiveTab] = useState('services');
  const [showFilterSidebar, setShowFilterSidebar] = useState(true);
  const [activeFilterId, setActiveFilterId] = useState<string | undefined>();
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('name_asc');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  // Filter groups for sidebar
  const filterGroups: FilterGroup[] = useMemo(() => {
    const groups: FilterGroup[] = [
      {
        id: 'status',
        label: 'Estado',
        icon: <Tag className="h-4 w-4" />,
        defaultOpen: true,
        items: [
          { id: 'status_active', label: 'Ativos', icon: <Eye className="h-4 w-4 text-green-500" /> },
          { id: 'status_inactive', label: 'Inativos', icon: <EyeOff className="h-4 w-4 text-muted-foreground" /> },
          { id: 'status_public', label: 'Públicos', icon: <Eye className="h-4 w-4 text-blue-500" /> },
        ],
      },
      {
        id: 'duration',
        label: 'Duração',
        icon: <Clock className="h-4 w-4" />,
        defaultOpen: false,
        items: [
          { id: 'duration_short', label: 'Curta (<30min)' },
          { id: 'duration_medium', label: 'Média (30-60min)' },
          { id: 'duration_long', label: 'Longa (>60min)' },
        ],
      },
      {
        id: 'price',
        label: 'Preço',
        icon: <CircleDollarSign className="h-4 w-4" />,
        defaultOpen: false,
        items: [
          { id: 'price_free', label: 'Gratuito' },
          { id: 'price_low', label: 'Baixo (<50€)' },
          { id: 'price_medium', label: 'Médio (50-100€)' },
          { id: 'price_high', label: 'Alto (>100€)' },
        ],
      },
    ];

    // Add categories filter group if categories exist
    if (categories.length > 0) {
      groups.push({
        id: 'category',
        label: 'Categoria',
        icon: <Briefcase className="h-4 w-4" />,
        defaultOpen: false,
        items: [
          { id: 'cat_none', label: 'Sem categoria' },
          ...categories.map((cat) => ({
            id: `cat_${cat.id}`,
            label: cat.name,
          })),
        ],
      });
    }

    return groups;
  }, [categories]);

  // Filter and search
  const filteredServices = useMemo(() => {
    let result = services;

    // Search filter
    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((s) => s.is_active);
    } else if (statusFilter === 'inactive') {
      result = result.filter((s) => !s.is_active);
    } else if (statusFilter === 'public') {
      result = result.filter((s) => s.is_public);
    }

    // Category filter
    if (categoryFilter === 'none') {
      result = result.filter((s) => !s.category_id);
    } else if (categoryFilter) {
      result = result.filter((s) => s.category_id === categoryFilter);
    }

    return result;
  }, [services, searchValue, statusFilter, categoryFilter]);

  // Pagination
  const totalServices = filteredServices.length;
  const totalPages = Math.ceil(totalServices / pageSize);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  // Stats
  const stats = useMemo(
    () => ({
      total: services.length,
      active: services.filter((s) => s.is_active).length,
      public: services.filter((s) => s.is_public).length,
      categories: categories.length,
    }),
    [services, categories]
  );

  const filtersActive = !!statusFilter || !!categoryFilter || !!activeFilterId;

  const handleCreateService = () => {
    setEditingService(null);
    setShowModal(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleSubmitService = async (data: CreateServiceData) => {
    if (editingService) {
      await updateService(editingService.id, data);
    } else {
      await createService(data);
    }
  };

  const handleDuplicateService = (service: Service) => {
    setEditingService({
      ...service,
      id: '',
      name: `${service.name} (cópia)`,
    } as Service);
    setShowModal(true);
  };

  const handleFilterSelect = (filterId: string) => {
    setActiveFilterId(filterId);
    if (filterId.startsWith('status_')) {
      setStatusFilter(filterId.replace('status_', ''));
    } else if (filterId.startsWith('cat_')) {
      const catId = filterId.replace('cat_', '');
      setCategoryFilter(catId === 'none' ? 'none' : catId);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedServices.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkExport = () => {
    const selected = services.filter((s) => selectedIds.includes(s.id));
    if (selected.length === 0) return;
    const csv = [
      ['Nome', 'Descrição', 'Duração', 'Preço', 'Ativo', 'Público'].join(','),
      ...selected.map((s) =>
        [
          s.name,
          s.description || '',
          s.duration || '',
          s.price || 0,
          s.is_active ? 'Sim' : 'Não',
          s.is_public ? 'Sim' : 'Não',
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `servicos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(`${selected.length} serviços exportados`);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await deleteService(id);
    }
    setSelectedIds([]);
    toast.success(`${selectedIds.length} serviços eliminados`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full -m-6">
      {/* Filter Sidebar */}
      <FilterSidebar
        filterGroups={filterGroups}
        activeFilterId={activeFilterId}
        onFilterSelect={handleFilterSelect}
        onClearFilter={() => {
          setActiveFilterId(undefined);
          setStatusFilter(undefined);
          setCategoryFilter(undefined);
        }}
        isOpen={showFilterSidebar}
        onClose={() => setShowFilterSidebar(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 p-6">
        {/* Page Header */}
        <PageHeader
          title="Serviços"
          count={totalServices}
          description="Gere os serviços que podem ser marcados nos calendários"
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          actions={[
            {
              label: 'Novo Serviço',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleCreateService,
            },
          ]}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500/50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Públicos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.public}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500/50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{stats.categories}</p>
              </div>
              <Tag className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchValue={searchValue}
          searchPlaceholder="Pesquisar serviços..."
          onSearchChange={setSearchValue}
          showFilters={true}
          filtersActive={filtersActive}
          onToggleFilters={() => setShowFilterSidebar(!showFilterSidebar)}
          onClearFilters={() => {
            setActiveFilterId(undefined);
            setStatusFilter(undefined);
            setCategoryFilter(undefined);
          }}
          sortOptions={sortOptions}
          sortValue={sortValue}
          onSortChange={setSortValue}
          leftActions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilterSidebar(!showFilterSidebar)}
                className="gap-2"
              >
                {showFilterSidebar ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                <TabsList className="h-8">
                  <TabsTrigger value="grid" className="h-7 px-2">
                    <Grid3X3 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="h-7 px-2">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          }
          rightActions={
            <Button variant="ghost" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          }
        />

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 py-2 px-4 bg-muted/50 rounded-lg mb-4">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleBulkExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        )}

        {/* Services list */}
        <div className="flex-1 overflow-auto">
          {paginatedServices.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              {services.length === 0 ? (
                <>
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">Ainda não tens serviços configurados</p>
                  <Button onClick={handleCreateService}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro serviço
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Nenhum serviço encontrado com os filtros selecionados
                </p>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'
              }
            >
              {paginatedServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={handleEditService}
                  onDelete={deleteService}
                  onToggleStatus={toggleServiceStatus}
                  onDuplicate={handleDuplicateService}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">por página</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <ServiceCreateModal
        open={showModal}
        onOpenChange={setShowModal}
        categories={categories}
        service={editingService}
        onSubmit={handleSubmitService}
        onCreateCategory={createCategory}
      />
    </div>
  );
}

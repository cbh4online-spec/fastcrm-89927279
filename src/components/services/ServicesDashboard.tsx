import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Search, Grid3X3, List, Filter } from 'lucide-react';
import { useServices, type Service, type CreateServiceData } from '@/hooks/useServices';
import { ServiceCard } from './ServiceCard';
import { ServiceCreateModal } from './ServiceCreateModal';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          service.name.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'none' && service.category_id) return false;
        if (categoryFilter !== 'none' && service.category_id !== categoryFilter) return false;
      }

      // Status filter
      if (statusFilter === 'active' && !service.is_active) return false;
      if (statusFilter === 'inactive' && service.is_active) return false;
      if (statusFilter === 'public' && !service.is_public) return false;

      return true;
    });
  }, [services, searchQuery, categoryFilter, statusFilter]);

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

  // Stats
  const stats = useMemo(() => ({
    total: services.length,
    active: services.filter(s => s.is_active).length,
    public: services.filter(s => s.is_public).length,
    categories: categories.length,
  }), [services, categories]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground">
            Gere os serviços que podem ser marcados nos calendários
          </p>
        </div>
        <Button onClick={handleCreateService}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Ativos</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Públicos</p>
          <p className="text-2xl font-bold text-blue-600">{stats.public}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Categorias</p>
          <p className="text-2xl font-bold">{stats.categories}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar serviços..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="none">Sem categoria</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color || '#3B82F6' }}
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="public">Públicos</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3X3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Active filters */}
      {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Pesquisa: {searchQuery}
              <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-foreground">×</button>
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {categoryFilter === 'none' ? 'Sem categoria' : categories.find(c => c.id === categoryFilter)?.name}
              <button onClick={() => setCategoryFilter('all')} className="ml-1 hover:text-foreground">×</button>
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {statusFilter === 'active' ? 'Ativos' : statusFilter === 'inactive' ? 'Inativos' : 'Públicos'}
              <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-foreground">×</button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
          >
            Limpar filtros
          </Button>
        </div>
      )}

      {/* Services list */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          {services.length === 0 ? (
            <>
              <p className="text-muted-foreground mb-4">Ainda não tens serviços configurados</p>
              <Button onClick={handleCreateService}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro serviço
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">Nenhum serviço encontrado com os filtros selecionados</p>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' 
          : 'space-y-3'
        }>
          {filteredServices.map((service) => (
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

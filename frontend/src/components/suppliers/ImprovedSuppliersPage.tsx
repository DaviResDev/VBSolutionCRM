import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSuppliersFilters } from '@/hooks/useSuppliersFilters';
import { useTheme } from '@/contexts/ThemeContext';
import SupplierForm from '@/components/SupplierForm';
import SuppliersFilterBar from '@/components/SuppliersFilterBar';
import { 
  Users, 
  Plus, 
  Search, 
  MapPin, 
  Edit,
  Trash2,
  Eye,
  Building2,
  ArrowLeft,
  Phone,
  List,
  Kanban,
  Clock,
  Zap,
  X
} from 'lucide-react';

const ImprovedSuppliersPage = () => {
  const navigate = useNavigate();
  const { suppliers, loading, error, createSupplier, deleteSupplier } = useSuppliers();
  const { topBarColor } = useTheme();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');
  
  // Hook para gerenciar filtros
  const { filters, updateFilter, clearFilters, getFilterParams } = useSuppliersFilters();

  // Extrair dados únicos para os filtros
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(suppliers.map(s => s.city).filter(Boolean))];
    return uniqueCities.sort();
  }, [suppliers]);

  const states = useMemo(() => {
    const uniqueStates = [...new Set(suppliers.map(s => s.state).filter(Boolean))];
    return uniqueStates.sort();
  }, [suppliers]);

  const activities = useMemo(() => {
    const uniqueActivities = [...new Set(suppliers.map(s => s.notes).filter(Boolean))];
    return uniqueActivities.sort();
  }, [suppliers]);

  // Aplicar filtros
  const filteredSuppliers = useMemo(() => {
    let filtered = suppliers;

    // Filtro de busca
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm) ||
        supplier.fantasy_name?.toLowerCase().includes(searchTerm) ||
        supplier.notes?.toLowerCase().includes(searchTerm) ||
        supplier.cnpj?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro de cidade
    if (filters.city !== 'all') {
      filtered = filtered.filter(supplier => supplier.city === filters.city);
    }

    // Filtro de estado
    if (filters.state !== 'all') {
      filtered = filtered.filter(supplier => supplier.state === filters.state);
    }

    // Filtro de atividade
    if (filters.activity !== 'all') {
      filtered = filtered.filter(supplier => supplier.notes === filters.activity);
    }

    // Filtro de data
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'recent':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(supplier => 
        new Date(supplier.created_at) >= startDate
      );
    }

    return filtered;
  }, [suppliers, filters]);

  const handleCreateSupplier = async (formData: any) => {
    try {
      console.log('🚀 handleCreateSupplier: Iniciando criação com dados:', formData);
      
      // Limpar erros anteriores
      if (error) {
        clearError();
      }
      
      const result = await createSupplier(formData);
      console.log('✅ handleCreateSupplier: Fornecedor criado com sucesso:', result);
      
      setIsCreateDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Fornecedor cadastrado com sucesso!",
      });
    } catch (error) {
      console.error('❌ handleCreateSupplier: Erro ao criar fornecedor:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao cadastrar fornecedor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) {
      try {
        await deleteSupplier(id);
        toast({
          title: "Sucesso",
          description: "Fornecedor excluído com sucesso!",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir fornecedor. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleBackToCompanies = () => {
    navigate('/companies');
  };

  const handleViewModeChange = (mode: 'lista' | 'kanban') => {
    setViewMode(mode);
  };

  // Função para aplicar filtros
  const handleFilterApply = () => {
    // Os filtros são aplicados automaticamente via useMemo
    // Esta função pode ser usada para lógica adicional se necessário
  };

  // Botões de visualização adaptados para fornecedores
  const viewButtons = [
    { 
      id: 'lista', 
      label: 'Lista',
      icon: List,
      active: viewMode === 'lista'
    },
    {
      id: 'kanban', 
      label: 'Quadro',
      icon: Kanban,
      active: viewMode === 'kanban'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando fornecedores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>Erro ao carregar fornecedores: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Faixa branca contínua com botões de navegação e filtros - alinhada perfeitamente */}
      <div className="bg-white -mt-6 -mx-6">
        {/* Botões de visualização */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToCompanies}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 mr-2"
                title="Voltar para Empresas"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {viewButtons.map((button) => {
                const Icon = button.icon;
                return (
                <Button
                    key={button.id}
                    variant={button.active ? "default" : "ghost"}
                  size="sm"
                    onClick={() => handleViewModeChange(button.id as any)}
                  className={`
                      h-10 px-4 text-sm font-medium transition-all duration-200
                      ${button.active 
                        ? 'text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                    style={{
                      backgroundColor: button.active ? '#1f2937' : undefined,
                      borderColor: button.active ? '#1f2937' : undefined
                    }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {button.label}
                </Button>
                );
              })}
            </div>
            
                        {/* Botões de ação na extrema direita */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-colors"
                title="Buscar"
              >
                <Search className="h-4 w-4 text-gray-700" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setIsAutomationModalOpen(true)}
                title="Automações"
              >
                <Zap className="h-4 w-4 text-gray-700" />
              </Button>
            </div>
            </div>
          </div>

                {/* Barra de filtros funcionais */}
        <SuppliersFilterBar
          filters={filters}
          onFilterChange={updateFilter}
          onApplyFilters={handleFilterApply}
          onClearFilters={clearFilters}
          cities={cities}
          states={states}
          activities={activities}
          searchPlaceholder="Filtrar fornecedores por nome, fantasia, CNPJ ou notas..."
                />
              </div>

      {/* Container principal com padding otimizado */}
      <div className="px-1 pt-3">
        {/* Badge de contagem */}
        <div className="mb-4 px-1">
              <Badge variant="outline" className="border-gray-300 text-gray-700">
                {filteredSuppliers.length} {filteredSuppliers.length === 1 ? 'fornecedor' : 'fornecedores'}
            {filteredSuppliers.length !== suppliers.length && ` de ${suppliers.length}`}
              </Badge>
        </div>

                {/* Conteúdo baseado na visualização selecionada */}
        {viewMode === 'lista' && (
          <div className="w-full">
            {/* Suppliers Table - sempre visível */}
          <div className="bg-white rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="font-medium text-gray-900">Nome</TableHead>
                  <TableHead className="font-medium text-gray-900">Empresa</TableHead>
                  <TableHead className="font-medium text-gray-900">Atividade</TableHead>
                  <TableHead className="font-medium text-gray-900">Contato</TableHead>
                  <TableHead className="font-medium text-gray-900">Data de Criação</TableHead>
                  <TableHead className="text-right font-medium text-gray-900">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-900" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{supplier.name}</div>
                          {supplier.cnpj && (
                            <div className="text-sm text-gray-500">{supplier.cnpj}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.fantasy_name ? (
                        <div className="text-sm text-gray-700">{supplier.fantasy_name}</div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.notes ? (
                        <Badge variant="outline" className="border-gray-300 text-gray-700">
                          {supplier.notes.substring(0, 30)}...
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {(supplier.city || supplier.state) && (
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span>{[supplier.city, supplier.state].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {new Date(supplier.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum fornecedor encontrado com os filtros aplicados
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
            </div>
          </div>
        )}

        {/* Visualização Kanban */}
        {viewMode === 'kanban' && (
          <div className="w-full">
            {/* Kanban Board - Layout responsivo com CSS Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full auto-rows-min -ml-2">
              {/* Coluna NOVOS */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg min-h-fit flex flex-col">
                <div className="p-4 border-b border-[#E5E7EB] border-t-2 border-t-[#D1D5DB] hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-inter text-[12px] text-[#374151]">NOVOS</h3>
                    <span className="font-inter text-[11px] text-[#6B7280]">
                      {filteredSuppliers.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 p-3 space-y-3">
                  {filteredSuppliers
                    .filter(supplier => new Date(supplier.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                    .map(supplier => (
                      <div 
                        key={supplier.id}
                        className="group relative bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                      >
                        <h4 className="font-inter text-[14px] text-[#111827] mb-2 pr-8">{supplier.name}</h4>
                        <p className="font-inter text-[12px] text-[#6B7280] mb-3">
                          {supplier.fantasy_name || 'Sem empresa'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] px-1.5 py-1 rounded bg-[#D1FAE5] text-[#059669]">
                            {supplier.city || 'Sem localização'}
                          </span>
                          <div className="flex items-center text-[12px] text-[#6B7280]">
                            <Calendar className="h-4 w-4 mr-1.5" />
                            <span className="font-inter">
                              {new Date(supplier.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {filteredSuppliers.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum fornecedor novo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna ATIVOS */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg min-h-fit flex flex-col">
                <div className="p-4 border-b border-[#E5E7EB] border-t-2 border-t-[#10B981] hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-inter text-[12px] text-[#374151]">ATIVOS</h3>
                    <span className="font-inter text-[11px] text-[#6B7280]">
                      {filteredSuppliers.filter(s => s.phone || s.notes).length}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 p-3 space-y-3">
                  {filteredSuppliers
                    .filter(supplier => supplier.phone || supplier.notes)
                    .map(supplier => (
                      <div 
                        key={supplier.id}
                        className="group relative bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                      >
                        <h4 className="font-inter text-[14px] text-[#111827] mb-2 pr-8">{supplier.name}</h4>
                        <p className="font-inter text-[12px] text-[#6B7280] mb-3">
                          {supplier.fantasy_name || 'Sem empresa'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] px-1.5 py-1 rounded bg-[#D1FAE5] text-[#059669]">
                            {supplier.phone ? 'Com contato' : 'Sem contato'}
                          </span>
                          <div className="flex items-center text-[12px] text-[#6B7280]">
                            <Calendar className="h-4 w-4 mr-1.5" />
                            <span className="font-inter">
                              {new Date(supplier.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {filteredSuppliers.filter(s => s.phone || s.notes).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum fornecedor ativo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna PENDENTES */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg min-h-fit flex flex-col">
                <div className="p-4 border-b border-[#E5E7EB] border-t-2 border-t-[#F59E0B] hover:shadow-md hover:scale-[1.01] transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-inter text-[12px] text-[#374151]">PENDENTES</h3>
                    <span className="font-inter text-[11px] text-[#6B7280]">
                      {filteredSuppliers.filter(s => !s.phone && !s.notes).length}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 p-3 space-y-3">
                  {filteredSuppliers
                    .filter(supplier => !supplier.phone && !supplier.notes)
                    .map(supplier => (
                      <div 
                        key={supplier.id}
                        className="group relative bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                      >
                        <h4 className="font-inter text-[14px] text-[#111827] mb-2 pr-8">{supplier.name}</h4>
                        <p className="font-inter text-[12px] text-[#6B7280] mb-3">
                          {supplier.fantasy_name || 'Sem empresa'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] px-1.5 py-1 rounded bg-[#FEF3C7] text-[#D97706]">
                            Pendente
                          </span>
                          <div className="flex items-center text-[12px] text-[#6B7280]">
                            <Calendar className="h-4 w-4 mr-1.5" />
                            <span className="font-inter">
                              {new Date(supplier.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {filteredSuppliers.filter(s => !s.phone && !s.notes).length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum fornecedor pendente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Botão flutuante para criar fornecedor */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 transition-colors duration-200"
            style={{
              backgroundColor: topBarColor,
              borderColor: topBarColor
            }}
            onMouseEnter={(e) => {
              // Escurece levemente a cor da topbar no hover
              const darkerColor = topBarColor === '#021529' ? '#010f1a' : topBarColor;
              e.currentTarget.style.backgroundColor = darkerColor;
              e.currentTarget.style.borderColor = darkerColor;
            }}
            onMouseLeave={(e) => {
              // Restaura a cor original da topbar
              e.currentTarget.style.backgroundColor = topBarColor;
              e.currentTarget.style.borderColor = topBarColor;
            }}
          >
            <Plus className="h-6 w-6 text-white" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Cadastrar Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <SupplierForm onSubmit={handleCreateSupplier} />
        </DialogContent>
      </Dialog>

      {/* Modal de Automações */}
      {isAutomationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsAutomationModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Automatize</h2>
                <button
                  onClick={() => setIsAutomationModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-6 py-6">
              <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                <span className="text-gray-500 text-sm">Espaço para futuras automações de fornecedores</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedSuppliersPage;

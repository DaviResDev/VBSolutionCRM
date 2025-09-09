import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/hooks/useFilters';
import { useTheme } from '@/contexts/ThemeContext';
import CompaniesTable from '@/components/companies/CompaniesTable';
import ImprovedCompanyForm from '@/components/companies/ImprovedCompanyForm';
import FilterBar from '@/components/FilterBar';
import { 
  Building2, 
  Plus, 
  Search,
  Users,
  List,
  Zap,
  X
} from 'lucide-react';

const Companies = () => {
  const navigate = useNavigate();
  const { companies, loading, error, createCompany, updateCompany, deleteCompany, fetchCompanies } = useCompanies();
  const { user, session, loading: authLoading } = useAuth();
  const { topBarColor } = useTheme();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Hook para gerenciar filtros
  const { filters, updateFilter, clearFilters, getFilterParams } = useFilters();

  const handleCreateCompany = async (formData: any) => {
    try {
      await createCompany(formData);
      setIsCreateModalOpen(false);
      toast({
        title: "Sucesso",
        description: "Empresa cadastrada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar empresa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCompany = async (id: string, updates: any) => {
    try {
      await updateCompany(id, updates);
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar empresa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a empresa "${name}"?`)) {
      try {
        await deleteCompany(id);
        toast({
          title: "Sucesso",
          description: "Empresa excluída com sucesso!",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir empresa. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  // Função para aplicar filtros
  const applyFilters = async () => {
    const filterParams = getFilterParams();
    // Aqui você pode implementar a lógica de filtros específica para empresas
    console.log('Aplicando filtros:', filterParams);
  };

  // Aplicar filtros automaticamente
  const handleFilterApply = () => {
    applyFilters();
  };

  // Tratamento de erro seguindo o padrão das outras páginas
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar empresas</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchCompanies} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // Loading state seguindo o padrão das outras páginas
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando suas empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Faixa branca contínua com botões de navegação e filtros - alinhada perfeitamente */}
      <div className="bg-white -mt-6 -mx-6">
        {/* Botões de visualização simplificados */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Botão Lista (ativo por padrão) */}
              <Button
                variant="default"
                size="sm"
                className="h-10 px-4 text-sm font-medium transition-all duration-200 text-white shadow-sm"
                style={{
                  backgroundColor: topBarColor,
                  borderColor: topBarColor
                }}
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
              
              {/* Botão Fornecedores */}
              <Button
                onClick={() => navigate('/suppliers')}
                variant="ghost"
                size="sm"
                className="h-10 px-4 text-sm font-medium transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Users className="h-4 w-4 mr-2" />
                Fornecedores
              </Button>
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
                title="Automações"
              >
                <Zap className="h-4 w-4 text-gray-700" />
              </Button>
            </div>
          </div>
        </div>

        {/* Barra de filtros funcionais */}
        <FilterBar
          filters={filters}
          onFilterChange={updateFilter}
          onApplyFilters={handleFilterApply}
          onClearFilters={clearFilters}
          employees={[]} // Você pode passar os funcionários aqui se necessário
          departments={[]} // Você pode passar os departamentos aqui se necessário
          searchPlaceholder="Filtrar por nome da empresa..."
        />
      </div>

      {/* Container principal com padding exato da referência */}
      <div className="px-2 pt-4">


        {/* Companies Table */}
        {companies && companies.length > 0 ? (
          <CompaniesTable 
            companies={companies} 
            onDeleteCompany={handleDeleteCompany}
            onUpdateCompany={handleUpdateCompany}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma empresa cadastrada
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Comece cadastrando sua primeira empresa para começar a gerenciar seus relacionamentos comerciais
              </p>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-black hover:bg-gray-800 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeira Empresa
              </Button>
            </div>
          </div>
        )}

        {/* Botão flutuante de nova empresa com posição exata da referência */}
        <Button
          onClick={() => setIsCreateModalOpen(true)}
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

        {/* Modal de criação de empresa */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsCreateModalOpen(false)}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Cadastrar Nova Empresa</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Preencha os dados para criar uma nova empresa
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="px-6 py-4">
                  <ImprovedCompanyForm onSubmit={handleCreateCompany} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Companies;

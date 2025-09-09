
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, Search, MoreVertical, Settings, BarChart3, Zap, Kanban, List, Clock, Calendar, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { CreateDealModal } from '@/components/CreateDealModal';
import { CreatePipelineModal } from '@/components/CreatePipelineModal';
import PipelineSelector from '@/components/leads/PipelineSelector';
import MinimalistLeadCard from '@/components/leads/MinimalistLeadCard';
import LeadExpandedModal from '@/components/leads/LeadExpandedModal';
import StandardLeadsFilters from '@/components/leads/StandardLeadsFilters';
import { useLeads } from '@/hooks/useLeads';
import { useFunnelStages } from '@/hooks/useFunnelStages';
import { useProducts } from '@/hooks/useProducts';

const LeadsSales = () => {
  const navigate = useNavigate();
  const { topBarColor } = useTheme();
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState('default');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pipeline' | 'lista' | 'prazo' | 'planejador' | 'calendario' | 'dashboard'>('pipeline');
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const { leads, loading: leadsLoading } = useLeads();
  const { stages, loading: stagesLoading } = useFunnelStages();
  const { products, loading: productsLoading } = useProducts();

  // Dados carregados do Supabase
  const [pipelines, setPipelines] = useState([]);
  const [funnelStages, setFunnelStages] = useState([]);

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    try {
      // Buscar dados do funil de vendas do Supabase
      // Por enquanto, arrays vazios
      setPipelines([]);
      setFunnelStages([]);
    } catch (error) {
      console.error('Erro ao buscar dados do funil:', error);
    }
  };

  // Filtrar leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.fantasy_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    const matchesStage = stageFilter === 'all' || lead.stage_id === stageFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesStage;
  });

  const handleLeadClick = (leadId: string) => {
    setExpandedLead(leadId);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setStageFilter('all');
  };

  // Função para mudar modo de visualização
  const handleViewModeChange = (mode: 'pipeline' | 'lista' | 'prazo' | 'planejador' | 'calendario' | 'dashboard') => {
    setViewMode(mode);
  };

  const selectedLeadData = expandedLead ? leads.find(lead => lead.id === expandedLead) : null;

  if (leadsLoading || stagesLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  // Botões de visualização adaptados para leads
  const viewButtons = [
    { 
      id: 'pipeline', 
      label: 'Pipeline',
      icon: Kanban,
      active: viewMode === 'pipeline'
    },
    {
      id: 'lista', 
      label: 'Lista',
      icon: List,
      active: viewMode === 'lista'
    },
    {
      id: 'prazo', 
      label: 'Prazo',
      icon: Clock,
      active: viewMode === 'prazo'
    },
    {
      id: 'planejador', 
      label: 'Planejador',
      icon: Kanban,
      active: viewMode === 'planejador'
    },
    {
      id: 'calendario', 
      label: 'Calendário',
      icon: Calendar,
      active: viewMode === 'calendario'
    },
    {
      id: 'dashboard', 
      label: 'Dashboard',
      icon: BarChart3,
      active: viewMode === 'dashboard'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Faixa branca contínua com botões de navegação e filtros - alinhada perfeitamente */}
      <div className="bg-white -mt-6 -mx-6">
        {/* Botões de visualização */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                      backgroundColor: button.active ? topBarColor : undefined,
                      borderColor: button.active ? topBarColor : undefined
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

        {/* Pipeline Selector */}
        <div className="px-6 py-4 border-b border-gray-200">
        <PipelineSelector
          pipelines={pipelines}
          selectedPipeline={selectedPipeline}
          onPipelineChange={setSelectedPipeline}
          onCreatePipeline={() => setShowCreatePipeline(true)}
          onManagePipelines={() => setShowCreatePipeline(true)}
        />
        </div>

                {/* Barra de filtros funcionais */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Campo de busca */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  placeholder="Buscar por nome do lead ou empresa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 h-8 text-sm border-0 bg-transparent focus:border-0 focus:ring-0 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Filtros funcionais */}
            <div className="flex items-center gap-2">
              {/* Filtro de Status */}
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 w-20 bg-transparent text-gray-900 text-xs pl-2 pr-0.5 hover:bg-blue-50 focus:bg-blue-50"
                style={{ 
                  border: 'none', 
                  outline: 'none',
                  boxShadow: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              >
                <option value="all">Todos Status</option>
                <option value="open">Aberto</option>
                <option value="won">Ganho</option>
                <option value="lost">Perdido</option>
                <option value="frozen">Congelado</option>
              </select>

              {/* Filtro de Prioridade */}
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-7 w-16 bg-transparent text-gray-900 text-xs pl-2 pr-0.5 hover:bg-blue-50 focus:bg-blue-50"
                style={{ 
                  border: 'none', 
                  outline: 'none',
                  boxShadow: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              >
                <option value="all">Todas</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>

              {/* Filtro de Etapas */}
              <select 
                value={stageFilter} 
                onChange={(e) => setStageFilter(e.target.value)}
                className="h-7 w-24 bg-transparent text-gray-900 text-xs pl-2 pr-0.5 hover:bg-blue-50 focus:bg-blue-50"
                style={{ 
                  border: 'none', 
                  outline: 'none',
                  boxShadow: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              >
                <option value="all">Todas Etapas</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>

              {/* Botão Limpar Filtros */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 px-2 text-xs font-medium shadow-none border-0 bg-transparent text-gray-900 hover:bg-blue-50 focus:bg-blue-50"
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Container principal com padding otimizado */}
      <div className="px-1 pt-3">
        {/* Conteúdo baseado na visualização selecionada */}
        {viewMode === 'pipeline' && (
          <div className="w-full">
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Pipeline: {pipelines.find(p => p.id === selectedPipeline)?.name}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="flex gap-6 overflow-x-auto pb-4">
                  {funnelStages.map((stage) => (
                    <div key={stage.id} className="flex-shrink-0 w-80">
                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        {/* Stage Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${stage.color}`}></div>
                            <h3 className="font-semibold text-gray-900">{stage.title}</h3>
                            <Badge variant="outline" className="bg-white text-gray-700 border border-gray-200">
                              {stage.count}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm" className="p-1 hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>

                        {/* Stage Value */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-sm text-gray-600">Valor Total</p>
                          <p className="font-bold text-lg text-gray-900">{stage.value}</p>
                        </div>

                        {/* Minimalist Lead Cards */}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {stage.deals.map((deal) => {
                            // Mock lead data for minimalist card
                            const mockLead = {
                              id: deal.id,
                              name: deal.title,
                              value: parseFloat(deal.value.replace('R$ ', '').replace('.', '')),
                              currency: 'BRL',
                              conversion_rate: Math.floor(Math.random() * 100),
                              priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
                              status: 'open',
                              created_at: deal.date,
                              company: {
                                fantasy_name: deal.company,
                                phone: '(11) 99999-9999',
                                email: 'contato@empresa.com'
                              },
                              responsible: {
                                name: deal.contact
                              },
                              expected_close_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                              source: ['Website', 'LinkedIn', 'Indicação'][Math.floor(Math.random() * 3)]
                            } as any;

                            return (
                              <MinimalistLeadCard
                                key={deal.id}
                                lead={mockLead}
                                onCardClick={handleLeadClick}
                              />
                            );
                          })}
                          
                          <Button
                            variant="ghost"
                            className="w-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 py-8 rounded-lg"
                            onClick={() => setShowCreateDeal(true)}
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Adicionar Lead
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Para os outros modos, usar pipeline como fallback */}
        {(viewMode === 'lista' || viewMode === 'prazo' || viewMode === 'planejador' || viewMode === 'calendario' || viewMode === 'dashboard') && (
          <div className="w-full">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Pipeline: {pipelines.find(p => p.id === selectedPipeline)?.name}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex gap-6 overflow-x-auto pb-4">
              {funnelStages.map((stage) => (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${stage.color}`}></div>
                        <h3 className="font-semibold text-gray-900">{stage.title}</h3>
                        <Badge variant="outline" className="bg-white text-gray-700 border border-gray-200">
                          {stage.count}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="p-1 hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>

                    {/* Stage Value */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-600">Valor Total</p>
                      <p className="font-bold text-lg text-gray-900">{stage.value}</p>
                    </div>

                    {/* Minimalist Lead Cards */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {stage.deals.map((deal) => {
                        // Mock lead data for minimalist card
                        const mockLead = {
                          id: deal.id,
                          name: deal.title,
                          value: parseFloat(deal.value.replace('R$ ', '').replace('.', '')),
                          currency: 'BRL',
                          conversion_rate: Math.floor(Math.random() * 100),
                          priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
                          status: 'open',
                          created_at: deal.date,
                          company: {
                            fantasy_name: deal.company,
                            phone: '(11) 99999-9999',
                            email: 'contato@empresa.com'
                          },
                          responsible: {
                            name: deal.contact
                          },
                          expected_close_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                          source: ['Website', 'LinkedIn', 'Indicação'][Math.floor(Math.random() * 3)]
                        } as any;

                        return (
                          <MinimalistLeadCard
                            key={deal.id}
                            lead={mockLead}
                            onCardClick={handleLeadClick}
                          />
                        );
                      })}
                      
                      <Button
                        variant="ghost"
                        className="w-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 py-8 rounded-lg"
                        onClick={() => setShowCreateDeal(true)}
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Adicionar Lead
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </div>
        )}
      </div>

      {/* Botão flutuante de novo lead com posição exata da referência */}
      <Button
        onClick={() => setShowCreateDeal(true)}
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

      {/* Modal de criação de lead */}
      {showCreateDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateDeal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Criar Novo Lead</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Preencha os dados para criar um novo lead
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateDeal(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-6 py-4">
                {/* Aqui seria o conteúdo do formulário de criação de lead */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Lead
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite o nome do lead"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite o nome da empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite o valor"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDeal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => setShowCreateDeal(false)}
                      style={{
                        backgroundColor: topBarColor,
                        borderColor: topBarColor
                      }}
                    >
                      Criar Lead
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <CreatePipelineModal 
        open={showCreatePipeline} 
        onClose={() => setShowCreatePipeline(false)}
        onPipelineCreated={(pipeline) => {
          setSelectedPipeline(pipeline.name);
          setShowCreatePipeline(false);
        }}
      />

      <LeadExpandedModal
        lead={selectedLeadData}
        isOpen={!!expandedLead}
        onClose={() => setExpandedLead(null)}
        onEdit={() => {}}
      />

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
                <span className="text-gray-500 text-sm">Espaço para futuras automações de leads</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsSales;

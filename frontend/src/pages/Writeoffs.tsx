
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  FileText,
  AlertTriangle,
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';
import CreateWriteoffModal from '@/components/writeoffs/CreateWriteoffModal';
import { toast } from 'sonner';

const Writeoffs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [writeoffs, setWriteoffs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWriteoffs();
  }, []);

  const fetchWriteoffs = async () => {
    try {
      setLoading(true);
      // Buscar baixas de estoque do Supabase
      // Por enquanto, array vazio
      setWriteoffs([]);
    } catch (error) {
      console.error('Erro ao buscar baixas de estoque:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 border-gray-300' },
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      completed: { label: 'Concluída', className: 'bg-green-100 text-green-800 border-green-300' },
      cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800 border-red-300' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={`${config.className} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasons: { [key: string]: string } = {
      damage: 'Produto Danificado',
      expiry: 'Produto Vencido',
      loss: 'Perda/Roubo',
      return: 'Devolução',
      quality: 'Problema de Qualidade',
      other: 'Outros'
    };
    return reasons[reason] || reason;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleCreateWriteoff = () => {
    // This would be called when a new writeoff is created successfully
    // For now, we'll just close the modal and show a success message
    toast.success('Nova baixa criada com sucesso!');
  };

  const handleDelete = (writeoff: any) => {
    if (window.confirm(`Tem certeza que deseja excluir a baixa "${writeoff.name}"?`)) {
      setWriteoffs(prev => prev.filter(w => w.id !== writeoff.id));
      toast.success('Baixa excluída com sucesso!');
    }
  };

  const filteredWriteoffs = writeoffs.filter(writeoff =>
    writeoff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getReasonLabel(writeoff.reason).toLowerCase().includes(searchTerm.toLowerCase()) ||
    writeoff.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = writeoffs.reduce((sum, writeoff) => sum + writeoff.items, 0);
  const totalValue = writeoffs.reduce((sum, writeoff) => sum + writeoff.totalValue, 0);
  const pendingWriteoffs = writeoffs.filter(w => w.status === 'pending').length;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-medium text-gray-900">
                Baixas de Inventário
              </h1>
              
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Baixa
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar baixas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 p-2"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total de Baixas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{writeoffs.length}</div>
              <p className="text-xs text-gray-500">baixas registradas</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Baixas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{pendingWriteoffs}</div>
              <p className="text-xs text-gray-500">aguardando processamento</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-gray-500">{totalItems} itens</p>
            </CardContent>
          </Card>
        </div>

        {/* Writeoffs Table */}
        <Card className="bg-white border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-medium text-gray-900">Nome</TableHead>
                <TableHead className="font-medium text-gray-900">Motivo</TableHead>
                <TableHead className="font-medium text-gray-900">Status</TableHead>
                <TableHead className="font-medium text-gray-900">Itens</TableHead>
                <TableHead className="font-medium text-gray-900">Valor Total</TableHead>
                <TableHead className="font-medium text-gray-900">Data</TableHead>
                <TableHead className="font-medium text-gray-900">Criado Por</TableHead>
                <TableHead className="font-medium text-gray-900">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWriteoffs.map((writeoff) => (
                <TableRow key={writeoff.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="font-medium text-gray-900">{writeoff.name}</div>
                    {writeoff.notes && (
                      <div className="text-sm text-gray-500 mt-1">{writeoff.notes}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-900">{getReasonLabel(writeoff.reason)}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(writeoff.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-900">{writeoff.items}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-900">{formatCurrency(writeoff.totalValue)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {new Date(writeoff.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4" />
                      {writeoff.createdBy}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => console.log('View writeoff:', writeoff.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => console.log('Edit writeoff:', writeoff.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(writeoff)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {filteredWriteoffs.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                Nenhuma baixa encontrada
              </h2>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? `Não foram encontradas baixas para "${searchTerm}"`
                  : 'Você ainda não possui baixas de inventário cadastradas.'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Baixa
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateWriteoffModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWriteoffCreated={handleCreateWriteoff}
      />
    </div>
  );
};

export default Writeoffs;

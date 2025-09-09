
import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, FileText, CheckCircle, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Collaborations = () => {
  // Dados carregados do Supabase
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todos");

  const fetchCollaborations = async () => {
    try {
      setLoading(true);
      // Buscar colaborações do Supabase
      // Por enquanto, array vazio
      setCollaborations([]);
    } catch (error) {
      console.error('Erro ao buscar colaborações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborations();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Em Andamento":
        return "bg-blue-100 text-blue-800";
      case "Planejamento":
        return "bg-yellow-100 text-yellow-800";
      case "Concluído":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-800";
      case "Média":
        return "bg-orange-100 text-orange-800";
      case "Baixa":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredCollaborations = collaborations.filter(collab => {
    if (activeTab === "todos") return true;
    if (activeTab === "andamento") return collab.status === "Em Andamento";
    if (activeTab === "concluidos") return collab.status === "Concluído";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Colaborações</h1>
            <p className="text-gray-600 mt-2">
              Gerencie projetos colaborativos e acompanhe o progresso das equipes
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova Colaboração
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Projetos</p>
                  <p className="text-2xl font-bold text-gray-900">{collaborations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {collaborations.filter(c => c.status === "Em Andamento").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Concluídos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {collaborations.filter(c => c.status === "Concluído").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Alta Prioridade</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {collaborations.filter(c => c.priority === "Alta").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todos">Todos os Projetos</TabsTrigger>
            <TabsTrigger value="andamento">Em Andamento</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCollaborations.map((collaboration) => (
                <Card key={collaboration.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                          {collaboration.title}
                        </CardTitle>
                        <CardDescription className="text-gray-600">
                          {collaboration.description}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Badge className={getStatusColor(collaboration.status)}>
                        {collaboration.status}
                      </Badge>
                      <Badge className={getPriorityColor(collaboration.priority)}>
                        {collaboration.priority}
                      </Badge>
                      <Badge variant="outline">
                        {collaboration.category}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progresso</span>
                        <span>{collaboration.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${collaboration.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Equipe</p>
                      <div className="flex -space-x-2">
                        {collaboration.members.map((member, index) => (
                          <Avatar key={index} className="border-2 border-white w-8 h-8">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-800">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {collaboration.members.length > 3 && (
                          <div className="w-8 h-8 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-xs text-gray-600">+{collaboration.members.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Prazo: {new Date(collaboration.deadline).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredCollaborations.length === 0 && (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma colaboração encontrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Não há projetos colaborativos nesta categoria no momento.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Nova Colaboração
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Collaborations;

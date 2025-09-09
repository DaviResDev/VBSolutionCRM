import { useState } from 'react';
import { Plus, Users, List, Grid3X3, Calendar, Target, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkGroupCreateModal from '@/components/WorkGroupCreateModal';
import WorkGroupDetailModal from '@/components/WorkGroupDetailModal';
import { toast } from '@/hooks/use-toast';
import { useWorkGroup } from '@/contexts/WorkGroupContext';

const WorkGroups = () => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedWorkGroup, setSelectedWorkGroup] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const { workGroups, addWorkGroup, updateWorkGroup, deleteWorkGroup } = useWorkGroup();

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const handleCreateWorkGroup = (workGroupData: any) => {
    const newWorkGroup = {
      name: workGroupData.name,
      description: workGroupData.description,
      color: workGroupData.color,
      photo: workGroupData.photo,
      sector: workGroupData.department || "Não definido",
      members: workGroupData.collaborators.map((name: string) => ({
        id: Date.now().toString() + Math.random(),
        name,
        initials: name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2),
        email: `${name.toLowerCase().replace(' ', '.')}@exemplo.com`,
        position: "Membro"
      })),
      tasksCount: 0,
      completedTasks: 0,
      activeProjects: 0
    };

    addWorkGroup(newWorkGroup);
    toast({
      title: "Grupo criado",
      description: `Grupo "${workGroupData.name}" foi criado com sucesso`
    });
  };

  const handleWorkGroupClick = (workGroup: any) => {
    setSelectedWorkGroup(workGroup);
    setIsDetailModalOpen(true);
  };

  const handleDeleteWorkGroup = (workGroupId: string) => {
    deleteWorkGroup(workGroupId);
    toast({
      title: "Grupo excluído",
      description: "Grupo foi excluído com sucesso"
    });
  };

  const handleUpdateWorkGroup = (workGroupId: string, updates: any) => {
    updateWorkGroup(workGroupId, updates);
    toast({
      title: "Grupo atualizado",
      description: "Grupo foi atualizado com sucesso"
    });
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grupos de Trabalho</h1>
          <p className="text-gray-600 mt-2">Gerencie suas equipes e colaboradores</p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={viewMode === "grid" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("grid")}
        >
          <Grid3X3 className="h-4 w-4 mr-2" />
          Grade
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("list")}
        >
          <List className="h-4 w-4 mr-2" />
          Lista
        </Button>
      </div>

      {/* Work Groups Grid */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workGroups.map((workGroup) => (
            <Card 
              key={workGroup.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleWorkGroupClick(workGroup)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: workGroup.color }}
                    >
                      {workGroup.photo ? (
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={workGroup.photo} />
                          <AvatarFallback>{workGroup.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        workGroup.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{workGroup.name}</CardTitle>
                      <CardDescription className="text-sm">{workGroup.sector}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">{workGroup.description}</p>
                
                {/* Members */}
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{workGroup.members.length} membros</span>
                </div>
                
                {/* Progress */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tarefas</span>
                    <span className="font-medium">{workGroup.completedTasks}/{workGroup.tasksCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: workGroup.color,
                        width: `${getProgressPercentage(workGroup.completedTasks, workGroup.tasksCount)}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{workGroup.activeProjects} projetos</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getProgressPercentage(workGroup.completedTasks, workGroup.tasksCount)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Work Groups List */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {workGroups.map((workGroup) => (
            <Card 
              key={workGroup.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleWorkGroupClick(workGroup)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: workGroup.color }}
                    >
                      {workGroup.photo ? (
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={workGroup.photo} />
                          <AvatarFallback>{workGroup.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        workGroup.name.charAt(0)
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold">{workGroup.name}</h3>
                      <p className="text-gray-600">{workGroup.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{workGroup.sector}</span>
                        <span>•</span>
                        <span>{workGroup.members.length} membros</span>
                        <span>•</span>
                        <span>{workGroup.activeProjects} projetos ativos</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {getProgressPercentage(workGroup.completedTasks, workGroup.tasksCount)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {workGroup.completedTasks}/{workGroup.tasksCount} tarefas
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {workGroups.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo de trabalho</h3>
          <p className="text-gray-600 mb-6">Comece criando seu primeiro grupo de trabalho para organizar sua equipe.</p>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Grupo
          </Button>
        </div>
      )}

      {/* Modals */}
      <WorkGroupCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkGroup}
      />
      
      <WorkGroupDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        workGroup={selectedWorkGroup}
        onDelete={handleDeleteWorkGroup}
        onUpdate={handleUpdateWorkGroup}
      />
    </div>
  );
};

export default WorkGroups;


import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  MoreHorizontal, 
  Flag, 
  Calendar,
  Clock,
  User,
  MessageSquare
} from 'lucide-react';

interface KanbanBoardProps {
  onOpenCreateModal: (status: string) => void;
  activities: any[]; // Dados reais das atividades
}

export default function KanbanBoard({ onOpenCreateModal, activities }: KanbanBoardProps) {
  // Status das colunas
  const columns = [
    { id: 'open', title: 'ABERTO', color: 'border-gray-300', badgeColor: 'bg-gray-100 text-gray-600' },
    { id: 'pending', title: 'PENDENTE', color: 'border-yellow-300', badgeColor: 'bg-yellow-100 text-yellow-600' },
    { id: 'in_progress', title: 'EM PROGRESSO', color: 'border-blue-300', badgeColor: 'bg-blue-100 text-blue-600' },
    { id: 'review', title: 'REVISÃO', color: 'border-pink-300', badgeColor: 'bg-pink-100 text-pink-600' },
    { id: 'completed', title: 'CONCLUÍDO', color: 'border-green-300', badgeColor: 'bg-green-100 text-green-600' }
  ];

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-blue-100 text-blue-700 border-blue-200',
      low: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getPriorityText = (priority: string) => {
    const texts = {
      urgent: 'Urgente',
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    return texts[priority as keyof typeof texts] || 'Média';
  };

  const handleQuickTaskCreate = (status: string) => {
    onOpenCreateModal(status);
  };

  return (
    <div className="space-y-6">
      {/* Kanban Board - Grid horizontal com scroll e espaçamento exato da referência */}
      <div className="grid grid-cols-5 gap-6 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnActivities = activities.filter(activity => activity.status === column.id);
          
          return (
            <div key={column.id} className="min-w-[280px] space-y-4">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {column.title}
                  </h3>
                  <Badge variant="secondary" className={`${column.badgeColor} text-xs font-medium px-2 py-1 rounded`}>
                    {columnActivities.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {/* Renderizar atividades reais */}
                {columnActivities.length > 0 ? (
                  columnActivities.map((activity) => (
                    <div key={activity.id} className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">
                            {activity.title}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {activity.description || 'Sem descrição'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${getPriorityColor(activity.priority)} text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1`}>
                          <Flag className="h-3 w-3" />
                          {getPriorityText(activity.priority)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {activity.due_date ? new Date(activity.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Nenhuma atividade
                  </div>
                )}
              </div>

              {/* Botão para criar nova tarefa */}
              <Button 
                variant="outline" 
                className="w-full border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700"
                onClick={() => handleQuickTaskCreate(column.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

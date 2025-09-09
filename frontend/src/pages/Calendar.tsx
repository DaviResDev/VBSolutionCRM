
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVB } from '@/contexts/VBContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Calendar = () => {
  const { state } = useVB();
  const { activities, companies, employees } = state;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'July', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return '';
    const company = companies.find(c => c.id === companyId);
    return company?.fantasyName || '';
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee?.name || '';
  };

  const getActivitiesForDate = (date: Date) => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.toDateString() === date.toDateString();
    });
  };

  const getActivityTypeColor = (type: string) => {
    const colors = {
      call: 'bg-blue-500',
      meeting: 'bg-purple-500',
      task: 'bg-green-500',
      other: 'bg-gray-500'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Dias do mês anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        activities: getActivitiesForDate(prevDate)
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        activities: getActivitiesForDate(date)
      });
    }

    // Dias do próximo mês para completar a grade
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        activities: getActivitiesForDate(nextDate)
      });
    }

    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getDaysInMonth();
  const todayActivities = getActivitiesForDate(new Date());
  const upcomingActivities = activities
    .filter(activity => {
      const activityDate = new Date(activity.date);
      const today = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(today.getDate() + 7);
      return activityDate >= today && activityDate <= weekFromNow;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todas as atividades da equipe
          </p>
        </div>
        <Button className="vb-button-primary">
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário principal */}
        <div className="lg:col-span-3">
          <Card className="vb-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <CardTitle className="text-xl">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  {(['month', 'week', 'day'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode(mode)}
                    >
                      {mode === 'month' ? 'Mês' : mode === 'week' ? 'Semana' : 'Dia'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grade do calendário */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                      ${day.isCurrentMonth ? 'bg-background hover:bg-muted' : 'bg-muted/50 text-muted-foreground'}
                      ${isToday(day.date) ? 'ring-2 ring-vb-primary bg-vb-primary/5' : ''}
                    `}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isToday(day.date) ? 'text-vb-primary' : ''}`}>
                        {day.date.getDate()}
                      </span>
                      {day.activities.length > 0 && (
                        <span className="text-xs bg-vb-primary text-white rounded-full px-1.5 py-0.5">
                          {day.activities.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {day.activities.slice(0, 2).map((activity, actIndex) => (
                        <div
                          key={actIndex}
                          className={`text-xs p-1 rounded text-white truncate ${getActivityTypeColor(activity.type)}`}
                          title={`${activity.title} - ${activity.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                        >
                          {activity.title}
                        </div>
                      ))}
                      {day.activities.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.activities.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com atividades */}
        <div className="space-y-6">
          {/* Atividades de hoje */}
          <Card className="vb-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Hoje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayActivities.length > 0 ? (
                todayActivities.map((activity) => (
                  <div key={activity.id} className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm leading-tight">{activity.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {activity.type === 'call' ? 'Ligação' : 
                         activity.type === 'meeting' ? 'Reunião' : 
                         activity.type === 'task' ? 'Tarefa' : 'Outro'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{activity.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{getEmployeeName(activity.responsibleId)}</span>
                      </div>
                      {activity.companyId && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{getCompanyName(activity.companyId)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade para hoje
                </p>
              )}
            </CardContent>
          </Card>

          {/* Próximas atividades */}
          <Card className="vb-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Próximas Atividades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingActivities.length > 0 ? (
                upcomingActivities.map((activity) => (
                  <div key={activity.id} className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm leading-tight">{activity.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {activity.type === 'call' ? 'Ligação' : 
                         activity.type === 'meeting' ? 'Reunião' : 
                         activity.type === 'task' ? 'Tarefa' : 'Outro'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{activity.date.toLocaleDateString('pt-BR')}</span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>{activity.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{getEmployeeName(activity.responsibleId)}</span>
                      </div>
                      {activity.companyId && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{getCompanyName(activity.companyId)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade próxima
                </p>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas rápidas */}
          <Card className="vb-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total este mês</span>
                <span className="font-medium">{activities.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pendentes</span>
                <span className="font-medium text-yellow-600">
                  {activities.filter(a => a.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Concluídas</span>
                <span className="font-medium text-green-600">
                  {activities.filter(a => a.status === 'completed').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para atividades do dia selecionado */}
      {selectedDate && (
        <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Atividades de {selectedDate.toLocaleDateString('pt-BR')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {getActivitiesForDate(selectedDate).length > 0 ? (
                getActivitiesForDate(selectedDate).map((activity) => (
                  <div key={activity.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{activity.title}</h4>
                      <Badge variant="outline">
                        {activity.type === 'call' ? 'Ligação' : 
                         activity.type === 'meeting' ? 'Reunião' : 
                         activity.type === 'task' ? 'Tarefa' : 'Outro'}
                      </Badge>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    )}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{activity.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{getEmployeeName(activity.responsibleId)}</span>
                      </div>
                      {activity.companyId && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>{getCompanyName(activity.companyId)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atividade para este dia
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Calendar;

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Target,
  Filter,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import PriorityBadge from '@/components/PriorityBadge';

// Tipos de eventos com cores
const EVENT_TYPES = {
  task: { 
    label: 'Tarefas', 
    color: 'bg-red-500', 
    lightColor: 'bg-red-100 text-red-800 border-red-200',
    icon: CheckCircle2 
  },
  event: { 
    label: 'Eventos', 
    color: 'bg-blue-500', 
    lightColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CalendarIcon 
  },
  financial: { 
    label: 'Financeiro', 
    color: 'bg-green-500', 
    lightColor: 'bg-green-100 text-green-800 border-green-200',
    icon: DollarSign 
  },
  meeting: { 
    label: 'Reuniões', 
    color: 'bg-purple-500', 
    lightColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Clock 
  },
  deadline: { 
    label: 'Prazos', 
    color: 'bg-amber-500', 
    lightColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Target 
  }
};

// Horários para a vista semanal
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 8; // De 8h às 19h
  return `${hour.toString().padStart(2, '0')}:00`;
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: keyof typeof EVENT_TYPES;
  description?: string;
  amount?: number;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuth();

  // Buscar dados da API
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events']
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/tasks']
  });

  const { data: financialDocuments = [] } = useQuery<any[]>({
    queryKey: ['/api/financial-documents']
  });

  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ['/api/expenses']
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects']
  });

  // Processar dados para eventos do calendário
  const calendarEvents: CalendarEvent[] = [
    // Tarefas
    ...tasks
      .filter((task: any) => task.due_date)
      .map((task: any) => ({
        id: `task-${task.id}`,
        title: task.title,
        start: new Date(task.due_date),
        end: new Date(task.due_date),
        type: 'task' as const,
        description: task.description
      })),
    
    // Eventos
    ...events.map((event: any) => ({
      id: `event-${event.id}`,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end || event.start),
      type: 'event' as const,
      description: event.description
    })),
    
    // Documentos financeiros
    ...financialDocuments
      .filter((doc: any) => doc.due_date && !doc.paid)
      .map((doc: any) => ({
        id: `financial-${doc.id}`,
        title: `Fatura #${doc.invoice_number || doc.id}`,
        start: new Date(doc.due_date),
        end: new Date(doc.due_date),
        type: 'financial' as const,
        amount: doc.amount,
        description: `Valor: ${formatCurrency(doc.amount)}`
      })),
    
    // Despesas
    ...expenses
      .filter((expense: any) => !expense.paid)
      .map((expense: any) => ({
        id: `expense-${expense.id}`,
        title: expense.description,
        start: new Date(expense.date),
        end: new Date(expense.date),
        type: 'financial' as const,
        amount: expense.amount,
        description: `Despesa: ${formatCurrency(expense.amount)}`
      }))
  ];

  // Obter início da semana
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Navegação
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  // Filtrar eventos para a semana atual
  const weekEvents = calendarEvents.filter(event => {
    const eventDate = event.start;
    return weekDays.some(day => isSameDay(eventDate, day));
  });

  // Tarefas pendentes
  const pendingTasks = tasks
    .filter((task: any) => !task.completed)
    .slice(0, 5);

  // Transações financeiras recentes
  const recentTransactions = [
    ...financialDocuments
      .filter((doc: any) => doc.paid)
      .map((doc: any) => ({
        id: doc.id,
        type: 'receita',
        description: `Fatura #${doc.invoice_number || doc.id}`,
        amount: doc.amount,
        date: doc.paid_date || doc.due_date
      })),
    ...expenses
      .filter((expense: any) => expense.paid)
      .map((expense: any) => ({
        id: expense.id,
        type: 'despesa',
        description: expense.description,
        amount: -expense.amount,
        date: expense.date
      }))
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Prazos de projetos
  const projectDeadlines = projects
    .filter((project: any) => project.delivery_date)
    .map((project: any) => {
      const deliveryDate = new Date(project.delivery_date);
      const now = new Date();
      const daysRemaining = Math.ceil((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...project,
        daysRemaining,
        progress: project.progress || 0
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agenda Integrada</h1>
          <p className="text-sm text-gray-600">Visualize tarefas, eventos e informações financeiras</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Filtros de visualização */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map((viewType) => (
              <Button
                key={viewType}
                variant={view === viewType ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView(viewType)}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  view === viewType && "bg-white shadow-sm"
                )}
              >
                {viewType === 'day' ? 'Dia' : viewType === 'week' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </div>

          {/* Seletor de data */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </Button>
          </div>

          {/* Botão adicionar */}
          <Button size="sm" className="bg-pink-500 hover:bg-pink-600">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário Principal */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-medium">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Legenda */}
                <div className="flex items-center gap-4 text-xs">
                  {Object.entries(EVENT_TYPES).map(([key, type]) => (
                    <div key={key} className="flex items-center gap-1">
                      <div className={cn("w-2 h-2 rounded-full", type.color)} />
                      <span className="text-gray-600">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {view === 'week' && (
                <div className="border rounded-lg overflow-hidden">
                  {/* Header dos dias */}
                  <div className="grid grid-cols-8 border-b bg-gray-50">
                    <div className="p-3 text-xs font-medium text-gray-500"></div>
                    {weekDays.map((day, index) => (
                      <div key={index} className="p-3 text-center border-l">
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div className={cn(
                          "text-lg font-semibold mt-1",
                          isSameDay(day, new Date()) ? "text-pink-600" : "text-gray-900"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grade de horários */}
                  <div className="max-h-96 overflow-y-auto">
                    {TIME_SLOTS.map((time, timeIndex) => (
                      <div key={time} className="grid grid-cols-8 border-b min-h-[60px]">
                        <div className="p-3 text-xs text-gray-500 bg-gray-50 border-r">
                          {time}
                        </div>
                        {weekDays.map((day, dayIndex) => {
                          const dayEvents = weekEvents.filter(event => 
                            isSameDay(event.start, day) &&
                            format(event.start, 'HH:mm') === time
                          );
                          
                          return (
                            <div key={dayIndex} className="border-l p-1 relative">
                              {dayEvents.map((event) => {
                                const eventType = EVENT_TYPES[event.type];
                                return (
                                  <div
                                    key={event.id}
                                    className={cn(
                                      "text-xs p-2 rounded mb-1 cursor-pointer",
                                      eventType.lightColor
                                    )}
                                    title={event.description}
                                  >
                                    <div className="font-medium truncate">{event.title}</div>
                                    {event.amount && (
                                      <div className="text-xs opacity-75">
                                        {formatCurrency(event.amount)}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tarefas Pendentes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingTasks.map((task: any) => (
                <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-900 truncate flex-1">
                      {task.title}
                    </h4>
                    <PriorityBadge priority={task.priority} size="sm" />
                  </div>
                  <div className="text-xs text-gray-600">
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {pendingTasks.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Nenhuma tarefa pendente
                </div>
              )}
              
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todas as tarefas
              </Button>
            </CardContent>
          </Card>

          {/* Transações Financeiras */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Transações Financeiras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-gray-600 mb-3">
                <strong>Receitas</strong>
              </div>
              
              {recentTransactions
                .filter(t => t.type === 'receita')
                .slice(0, 3)
                .map((transaction: any) => (
                <div key={`receita-${transaction.id}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs font-medium">{transaction.description}</span>
                  </div>
                  <span className="text-xs font-semibold text-green-600">
                    + {formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}
              
              <div className="text-xs text-gray-600 mb-3 mt-4">
                <strong>Despesas</strong>
              </div>
              
              {recentTransactions
                .filter(t => t.type === 'despesa')
                .slice(0, 2)
                .map((transaction: any) => (
                <div key={`despesa-${transaction.id}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-xs font-medium">{transaction.description}</span>
                  </div>
                  <span className="text-xs font-semibold text-red-600">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Prazos de Projetos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Prazos de Projetos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectDeadlines.map((project: any) => (
                <div key={project.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm text-gray-900 truncate flex-1">
                      {project.name}
                    </h4>
                    <Badge 
                      variant={project.daysRemaining <= 7 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {project.daysRemaining}d
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Entrega: {format(new Date(project.delivery_date), 'dd/MM/yyyy')}</span>
                      <span>Progresso: {project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          "h-2 rounded-full transition-all",
                          project.progress >= 75 ? "bg-green-500" :
                          project.progress >= 50 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {project.daysRemaining <= 7 ? `${project.daysRemaining} dias restantes` : 
                       project.daysRemaining <= 30 ? `${Math.floor(project.daysRemaining / 7)} semanas restantes` :
                       `${Math.floor(project.daysRemaining / 30)} meses restantes`}
                    </div>
                  </div>
                </div>
              ))}
              
              {projectDeadlines.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Nenhum prazo próximo
                </div>
              )}
              
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todos os prazos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
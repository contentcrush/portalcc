import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event } from '@shared/schema';
import FullCalendarComponent from '@/components/calendar/FullCalendarComponent';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Tag, Info, MapPin, RefreshCw } from 'lucide-react';
import { initWebSocket, onWebSocketMessage } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';

export default function CalendarPage() {
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Buscar eventos
  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    refetchOnWindowFocus: true
  });
  
  // Mutation para sincronizar calendário
  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/calendar/sync');
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidar a query de eventos para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      toast({
        title: 'Calendário sincronizado',
        description: data.message,
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message || 'Ocorreu um erro ao sincronizar o calendário',
        variant: 'destructive',
      });
    }
  });

  // Efeito para escutar eventos de calendário via WebSocket
  useEffect(() => {
    console.log('Configurando listeners WebSocket na página de calendário...');
    
    // Inicializar WebSocket se ainda não estiver conectado
    initWebSocket().catch(error => {
      console.error('Erro ao inicializar WebSocket na página de calendário:', error);
    });
    
    // Registrar listeners para os vários formatos possíveis de eventos de calendário
    const unregisterCalendarUpdateHandler = onWebSocketMessage('calendar_updated', (data) => {
      console.log('Recebida notificação de atualização do calendário (formato novo):', data);
      
      // Atualizar dados do calendário
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      // Notificar o usuário (optional)
      toast({
        title: 'Calendário atualizado',
        description: data.message || 'O calendário foi atualizado automaticamente',
        variant: 'default',
      });
    });
    
    // Suporte para formato antigo (calendar_update)
    const unregisterCalendarOldHandler = onWebSocketMessage('calendar_update', (data) => {
      console.log('Recebida notificação de atualização do calendário (formato antigo):', data);
      
      // Atualizar dados do calendário
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    });
    
    // Registrar listener para eventos financeiros (despesas e documentos)
    const unregisterFinancialUpdateHandler = onWebSocketMessage('financial_updated', (data) => {
      console.log('Recebida notificação de atualização financeira (formato novo):', data);
      
      // Atualizar dados do calendário quando houver mudanças financeiras
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      // Só exibir toast se a notificação explicitamente mencionar o calendário
      if (data.affects_calendar || data.updateCalendar || data.calendar) {
        toast({
          title: 'Calendário atualizado',
          description: 'Eventos financeiros foram atualizados no calendário',
          variant: 'default',
        });
      }
    });
    
    // Suporte para formato antigo (financial_update)
    const unregisterFinancialOldHandler = onWebSocketMessage('financial_update', (data) => {
      console.log('Recebida notificação de atualização financeira (formato antigo):', data);
      
      // Atualizar dados do calendário quando houver mudanças financeiras
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    });
    
    // Também registrar para o tipo genérico 'financial' e 'calendar' para maior compatibilidade
    const unregisterFinancialGenericHandler = onWebSocketMessage('financial', (data) => {
      console.log('Recebida notificação genérica financeira:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    });
    
    const unregisterCalendarGenericHandler = onWebSocketMessage('calendar', (data) => {
      console.log('Recebida notificação genérica de calendário:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    });
    
    // Limpar listeners quando o componente for desmontado
    return () => {
      console.log('Removendo listeners WebSocket da página de calendário');
      unregisterCalendarUpdateHandler();
      unregisterCalendarOldHandler();
      unregisterFinancialUpdateHandler();
      unregisterFinancialOldHandler();
      unregisterFinancialGenericHandler();
      unregisterCalendarGenericHandler();
    };
  }, [queryClient, toast]);

  // Filtragem de eventos com base no filtro selecionado
  const filteredEvents = React.useMemo(() => {
    if (!events) return [];
    
    if (selectedFilter === 'all') {
      return events;
    } else if (selectedFilter === 'meetings') {
      return events.filter(event => event.type === 'reuniao');
    } else if (selectedFilter === 'deadlines') {
      return events.filter(event => event.type === 'prazo');
    } else if (selectedFilter === 'tasks') {
      return events.filter(event => event.type === 'gravacao' || event.type === 'edicao');
    } else if (selectedFilter === 'appointments') {
      return events.filter(event => event.type === 'externo');
    } else if (selectedFilter === 'reminders') {
      return events.filter(event => event.type === 'financeiro' || event.type === 'entrega' || event.type === 'despesa');
    }
    
    return events;
  }, [events, selectedFilter]);
  
  // Dados para o widget de próximos eventos
  const upcomingEvents = React.useMemo(() => {
    if (!events) return [];
    
    const now = new Date();
    return events
      .filter(event => new Date(event.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);
  }, [events]);
  
  // Removido contador de eventos por tipo
  
  // Renderizar badge de tipo de evento
  const renderTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      reuniao: 'bg-blue-100 text-blue-800',
      prazo: 'bg-red-100 text-red-800',
      gravacao: 'bg-green-100 text-green-800',
      edicao: 'bg-emerald-100 text-emerald-800',
      entrega: 'bg-violet-100 text-violet-800',
      externo: 'bg-purple-100 text-purple-800',
      financeiro: 'bg-amber-100 text-amber-800',
      projeto: 'bg-indigo-100 text-indigo-800',
      planejamento: 'bg-sky-100 text-sky-800',
      capacitacao: 'bg-teal-100 text-teal-800',
      other: 'bg-gray-100 text-gray-800',
    };
    
    const typeLabels: Record<string, string> = {
      reuniao: 'Reunião',
      prazo: 'Prazo',
      gravacao: 'Gravação',
      edicao: 'Edição',
      entrega: 'Entrega',
      externo: 'Evento Externo',
      financeiro: 'Financeiro',
      projeto: 'Projeto',
      planejamento: 'Planejamento',
      capacitacao: 'Capacitação',
      other: 'Outro',
    };
    
    return (
      <Badge 
        className={`${typeColors[type] || typeColors.other} hover:${typeColors[type] || typeColors.other}`}
        variant="outline"
      >
        {typeLabels[type] || 'Outro'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">Organize seus eventos, reuniões e prazos</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => syncCalendarMutation.mutate()}
            disabled={syncCalendarMutation.isPending}
            className="mr-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncCalendarMutation.isPending ? 'animate-spin' : ''}`} />
            {syncCalendarMutation.isPending ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              <SelectItem value="meetings">Reuniões</SelectItem>
              <SelectItem value="deadlines">Prazos</SelectItem>
              <SelectItem value="tasks">Tarefas</SelectItem>
              <SelectItem value="appointments">Compromissos</SelectItem>
              <SelectItem value="reminders">Lembretes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Próximos Eventos</CardTitle>
              <CardDescription>Eventos agendados em breve</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        {renderTypeBadge(event.type)}
                      </div>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          <span>
                            {format(new Date(event.start_date), 'dd MMM yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        {!event.all_day && (
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
                            </span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhum evento próximo encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              <FullCalendarComponent
                events={filteredEvents}
                isLoading={isLoading}
                error={error instanceof Error ? error : null}
                currentView={calendarView}
                onViewChange={setCalendarView}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
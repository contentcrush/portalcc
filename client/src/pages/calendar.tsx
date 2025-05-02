import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Tag, Info, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initWebSocket, onWebSocketMessage } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

export default function CalendarPage() {
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { toast } = useToast();
  
  // Buscar eventos
  const { data: events, isLoading, error, refetch } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    refetchOnWindowFocus: true
  });
  
  // Configurar WebSocket
  useEffect(() => {
    // Inicializar conexão WebSocket
    let wsConnection: WebSocket | null = null;
    let unsubscribeHandler: (() => void) | null = null;
    
    const initConnection = async () => {
      try {
        wsConnection = await initWebSocket();
        
        // Registrar handler para notificações específicas de calendário
        const calendarHandler = onWebSocketMessage('calendar_updated', (data) => {
          console.log('Recebida atualização de calendário via WebSocket:', data);
          
          // Atualizar os dados do calendário
          refetch();
          
          // Notificar o usuário sobre a atualização
          toast({
            title: 'Calendário atualizado',
            description: data.message || 'Novos eventos foram sincronizados',
          });
        });
        
        // Registrar handler de fallback para qualquer atualização de eventos
        const eventHandler = onWebSocketMessage('event_updated', (data) => {
          console.log('Evento atualizado via WebSocket:', data);
          refetch();
        });
        
        // Combinar os handlers para limpeza
        unsubscribeHandler = () => {
          calendarHandler();
          eventHandler();
        };
      } catch (error) {
        console.error('Erro ao conectar WebSocket:', error);
        toast({
          title: 'Erro de conexão',
          description: 'Não foi possível conectar ao serviço de atualizações em tempo real',
          variant: 'destructive',
        });
      }
    };
    
    // Iniciar conexão
    initConnection();
    
    // Função de limpeza do useEffect
    return () => {
      // Limpar os handlers ao desmontar o componente
      if (unsubscribeHandler) {
        unsubscribeHandler();
      }
      
      // Fechar a conexão WebSocket
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [refetch, toast]);

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
      return events.filter(event => event.type === 'financeiro' || event.type === 'entrega');
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
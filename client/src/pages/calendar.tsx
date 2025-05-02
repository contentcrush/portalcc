import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Event } from '@shared/schema';
import FullCalendarComponent from '@/components/calendar/FullCalendarComponent';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Tag, Info, MapPin, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function CalendarPage() {
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isGoogleDialogOpen, setIsGoogleDialogOpen] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const { toast } = useToast();
  
  // Buscar eventos
  const { data: events, isLoading, error, refetch: refetchEvents } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
    refetchOnWindowFocus: true
  });
  
  // Definir interface para o status do Google Calendar
  interface GoogleCalendarStatus {
    connected: boolean;
    email?: string;
    lastSync?: string | null;
  }
  
  // Verificar status da conexão com Google Calendar
  const { data: googleStatus, isLoading: isLoadingGoogleStatus, refetch: refetchGoogleStatus } = useQuery<GoogleCalendarStatus>({
    queryKey: ['/api/google/status'],
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Mutation para obter URL de autenticação do Google
  const getAuthUrlMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/google/auth-url');
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setAuthUrl(data.authUrl);
      setIsGoogleDialogOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Erro ao obter URL de autenticação",
        description: "Não foi possível gerar o link para autenticação com o Google Calendar",
        variant: "destructive"
      });
    }
  });
  
  // Mutation para sincronizar todos os eventos
  const syncAllEventsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google/sync-all-events');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronização concluída",
        description: "Todos os eventos foram sincronizados com o Google Calendar",
        variant: "default"
      });
      refetchEvents();
    },
    onError: (error) => {
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os eventos com o Google Calendar",
        variant: "destructive"
      });
    }
  });
  
  // Mutation para desconectar do Google Calendar
  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/google/disconnect');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Desconectado",
        description: "Sua conta do Google Calendar foi desconectada com sucesso",
        variant: "default"
      });
      refetchGoogleStatus();
    },
    onError: (error) => {
      toast({
        title: "Erro ao desconectar",
        description: "Não foi possível desconectar sua conta do Google Calendar",
        variant: "destructive"
      });
    }
  });
  
  // Configurar listener para mensagens da janela de autenticação
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleDialogOpen(false);
        toast({
          title: "Autenticação bem-sucedida",
          description: "Sua conta do Google Calendar foi conectada com sucesso",
          variant: "default"
        });
        refetchGoogleStatus();
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsGoogleDialogOpen(false);
        toast({
          title: "Erro na autenticação",
          description: "Não foi possível conectar sua conta do Google Calendar",
          variant: "destructive"
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast, refetchGoogleStatus]);

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
  
  // Obter contador de eventos por tipo
  const eventCounts = React.useMemo(() => {
    if (!events) return {};
    
    return events.reduce((acc: Record<string, number>, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
  }, [events]);
  
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
          {/* Google Calendar Integration */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Google Calendar</CardTitle>
              <CardDescription>Sincronize seus eventos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingGoogleStatus ? (
                  <div className="flex justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : googleStatus?.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center text-sm">
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      <span>Conectado a {googleStatus.email}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Última sincronização: {googleStatus.lastSync ? 
                        format(new Date(googleStatus.lastSync), 'dd/MM/yyyy HH:mm') : 
                        'Nunca'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center text-sm">
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                      <span>Não conectado</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Conecte sua conta Google para sincronizar eventos
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              {googleStatus?.connected ? (
                <div className="flex space-x-2 w-full">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => syncAllEventsMutation.mutate()}
                    disabled={syncAllEventsMutation.isPending}
                  >
                    {syncAllEventsMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => disconnectGoogleMutation.mutate()}
                    disabled={disconnectGoogleMutation.isPending}
                  >
                    Desconectar
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => getAuthUrlMutation.mutate()}
                  disabled={getAuthUrlMutation.isPending}
                >
                  {getAuthUrlMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      Conectar Google Calendar
                    </div>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {/* Event Counts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Resumo</CardTitle>
              <CardDescription>Eventos por tipo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Reuniões</span>
                  <Badge variant="secondary">{eventCounts['reuniao'] || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Prazos</span>
                  <Badge variant="secondary">{eventCounts['prazo'] || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gravações</span>
                  <Badge variant="secondary">{eventCounts['gravacao'] || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Edições</span>
                  <Badge variant="secondary">{eventCounts['edicao'] || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Entregas</span>
                  <Badge variant="secondary">{eventCounts['entrega'] || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
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
      
      {/* Google Auth Dialog */}
      <Dialog open={isGoogleDialogOpen} onOpenChange={setIsGoogleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar ao Google Calendar</DialogTitle>
            <DialogDescription>
              Clique no botão abaixo para autorizar a integração com o Google Calendar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Uma nova janela será aberta para que você possa autorizar o acesso. Após a autorização, você será redirecionado de volta.
            </p>
            <Button
              onClick={() => {
                window.open(authUrl, 'google-auth', 'width=600,height=700');
              }}
            >
              Autorizar Google Calendar
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGoogleDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
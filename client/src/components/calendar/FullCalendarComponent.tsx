import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { DateSelectArg, EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core';
import { Event } from '@shared/schema';
// Importação correta do locale ptBR
import ptBRLocale from '@fullcalendar/core/locales/pt-br';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import EventDialog from './EventDialog';

interface FullCalendarComponentProps {
  events?: Event[];
  isLoading?: boolean;
  error?: Error | null;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

const eventColors: Record<string, string> = {
  meeting: '#3b82f6', // Azul para reuniões
  deadline: '#ef4444', // Vermelho para prazos
  task: '#10b981',    // Verde para tarefas
  appointment: '#8b5cf6', // Roxo para compromissos
  reminder: '#f59e0b', // Âmbar para lembretes
  other: '#6b7280',    // Cinza para outros
};

const FullCalendarComponent: React.FC<FullCalendarComponentProps> = ({
  events = [],
  isLoading = false,
  error = null,
  currentView = 'dayGridMonth',
  onViewChange,
}) => {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Converter eventos do backend para o formato do FullCalendar
  const calendarEvents: EventInput[] = events.map(event => ({
    id: String(event.id),
    title: event.title,
    start: event.start_date,
    end: event.end_date,
    allDay: event.all_day || false,
    backgroundColor: event.color || eventColors[event.type] || eventColors.other,
    borderColor: event.color || eventColors[event.type] || eventColors.other,
    extendedProps: {
      description: event.description,
      type: event.type,
      location: event.location,
      user_id: event.user_id,
      project_id: event.project_id,
      client_id: event.client_id,
      task_id: event.task_id
    }
  }));

  // Manipular clique em evento
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = parseInt(clickInfo.event.id);
    const event = events.find(e => e.id === eventId);
    
    if (event) {
      setSelectedEvent(event);
      setIsCreateMode(false);
      setIsEventDialogOpen(true);
    }
  };

  // Manipular seleção de data/hora
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const startDate = new Date(selectInfo.start);
    setSelectedDate(startDate);
    setIsCreateMode(true);
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
  };
  
  // Manipular salvamento de evento
  const handleSaveEvent = async (eventData: Partial<Event>) => {
    try {
      if (isCreateMode) {
        // Criar novo evento
        await apiRequest('POST', '/api/events', eventData);
        toast({
          title: "Evento criado",
          description: "O evento foi criado com sucesso",
        });
      } else {
        // Atualizar evento existente
        if (eventData.id) {
          await apiRequest('PATCH', `/api/events/${eventData.id}`, eventData);
          toast({
            title: "Evento atualizado",
            description: "O evento foi atualizado com sucesso",
          });
        }
      }
      
      // Invalidar consulta para recarregar eventos
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setIsEventDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: `Ocorreu um erro ao salvar o evento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };
  
  // Manipular exclusão de evento
  const handleDeleteEvent = async (eventId: number) => {
    try {
      await apiRequest('DELETE', `/api/events/${eventId}`);
      toast({
        title: "Evento excluído",
        description: "O evento foi excluído com sucesso",
      });
      
      // Invalidar consulta para recarregar eventos
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setIsEventDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: `Ocorreu um erro ao excluir o evento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  // Renderizar conteúdo personalizado para eventos
  const renderEventContent = (eventContent: EventContentArg) => {
    return (
      <div className="flex items-center gap-1 truncate px-1 py-0.5 text-xs">
        <div className="w-1.5 h-1.5 rounded-full bg-current" />
        <div className="font-medium truncate">
          {eventContent.timeText && (
            <span className="mr-1">{eventContent.timeText}</span>
          )}
          {eventContent.event.title}
        </div>
      </div>
    );
  };

  // Manipular mudança de visualização
  const handleViewChange = (viewInfo: any) => {
    if (onViewChange) {
      onViewChange(viewInfo.view.type);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <p>Erro ao carregar eventos: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="calendar-container space-y-4">
      <div className="flex justify-between items-center">
        <Button
          onClick={() => {
            setIsCreateMode(true);
            setSelectedEvent(null);
            setSelectedDate(new Date());
            setIsEventDialogOpen(true);
          }}
          className="ml-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>
      
      <div className={`relative ${isLoading ? 'opacity-60' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}
        
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          initialView={currentView}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={calendarEvents}
          locale={ptBRLocale}
          height="auto"
          firstDay={1}  // Segunda-feira como primeiro dia da semana (padrão europeu/brasileiro)
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            hour12: false
          }}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          viewDidMount={handleViewChange}
          nowIndicator={true}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],  // Segunda a sexta
            startTime: '08:00',
            endTime: '18:00',
          }}
        />
      </div>
      
      {/* Componente de diálogo para criar/editar eventos */}
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        event={selectedEvent}
        isCreateMode={isCreateMode}
        initialDate={selectedDate}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

export default FullCalendarComponent;
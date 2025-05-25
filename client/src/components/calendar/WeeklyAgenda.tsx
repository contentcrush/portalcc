import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Event } from '@shared/schema';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklyAgendaProps {
  events: Event[];
  isLoading?: boolean;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

const WeeklyAgenda: React.FC<WeeklyAgendaProps> = ({
  events = [],
  isLoading = false,
  currentDate = new Date(),
  onDateChange,
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Horários da agenda (8h às 18h)
  const timeSlots = Array.from({ length: 11 }, (_, i) => 8 + i);
  
  // Cores por tipo de evento
  const eventColors = {
    reuniao: 'bg-blue-100 border-blue-300 text-blue-800',
    prazo: 'bg-orange-100 border-orange-300 text-orange-800',
    gravacao: 'bg-pink-100 border-pink-300 text-pink-800',
    edicao: 'bg-purple-100 border-purple-300 text-purple-800',
    entrega: 'bg-violet-100 border-violet-300 text-violet-800',
    externo: 'bg-indigo-100 border-indigo-300 text-indigo-800',
    financeiro: 'bg-green-100 border-green-300 text-green-800',
    projeto: 'bg-gray-100 border-gray-300 text-gray-800',
    planejamento: 'bg-sky-100 border-sky-300 text-sky-800',
    capacitacao: 'bg-teal-100 border-teal-300 text-teal-800',
    other: 'bg-gray-100 border-gray-300 text-gray-600',
  };

  // Filtrar eventos por dia
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_date), day));
  };

  // Navegar semanas
  const goToPreviousWeek = () => {
    const newDate = subWeeks(currentDate, 1);
    onDateChange?.(newDate);
  };

  const goToNextWeek = () => {
    const newDate = addWeeks(currentDate, 1);
    onDateChange?.(newDate);
  };

  const goToToday = () => {
    onDateChange?.(new Date());
  };

  // Renderizar evento
  const renderEvent = (event: Event) => {
    const startTime = format(new Date(event.start_date), 'HH:mm');
    const endTime = format(new Date(event.end_date), 'HH:mm');
    const color = eventColors[event.type as keyof typeof eventColors] || eventColors.other;
    
    return (
      <div
        key={event.id}
        className={`p-2 mb-1 rounded border ${color} text-xs font-medium`}
      >
        <div className="font-semibold truncate">{event.title}</div>
        {!event.all_day && (
          <div className="text-xs opacity-80">
            {startTime} - {endTime}
          </div>
        )}
        {event.description && event.description.includes('R$') && (
          <div className="text-xs font-bold mt-1">
            {event.description.match(/R\$\s*[\d.,]+/)?.[0]}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Agenda Integrada</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visualize tarefas, eventos e informações financeiras
            </p>
          </div>
          
          {/* Navegação da semana */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-4 font-medium">
              {format(weekStart, 'MMMM yyyy', { locale: ptBR })}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-pink-400"></div>
            <span className="text-xs">Tarefas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-400"></div>
            <span className="text-xs">Eventos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-400"></div>
            <span className="text-xs">Financeiro</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-400"></div>
            <span className="text-xs">Reuniões</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-400"></div>
            <span className="text-xs">Prazos</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {/* Cabeçalho com dias da semana */}
            <div className="p-2"></div> {/* Espaço para horários */}
            {weekDays.map((day, index) => (
              <div key={index} className="p-2 text-center border-b">
                <div className="text-xs text-muted-foreground">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={`text-lg font-bold ${
                  isSameDay(day, new Date()) ? 'text-primary' : ''
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}

            {/* Linhas de horários */}
            {timeSlots.map(hour => (
              <React.Fragment key={hour}>
                {/* Horário */}
                <div className="p-2 text-xs text-muted-foreground border-r">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                
                {/* Colunas dos dias */}
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day);
                  const hourEvents = dayEvents.filter(event => {
                    if (event.all_day) return hour === 9; // Mostrar eventos do dia todo às 9h
                    const eventHour = new Date(event.start_date).getHours();
                    return eventHour === hour;
                  });

                  return (
                    <div key={dayIndex} className="p-1 min-h-[60px] border-r border-b">
                      {hourEvents.map(event => renderEvent(event))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyAgenda;
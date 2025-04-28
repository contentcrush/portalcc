import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday as isDayToday, 
  parseISO,
  addHours,
  differenceInMinutes
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon
} from "lucide-react";
import { WEEKDAYS, EVENT_COLORS } from "@/lib/constants";

interface CalendarViewProps {
  onEventClick?: (eventId: number) => void;
  onDateClick?: (date: Date) => void;
  onAddEvent?: (date: Date) => void;
}

interface Event {
  id: number;
  title: string;
  description?: string;
  start_date: string | Date;
  end_date: string | Date;
  location?: string;
  type: string;
  project_id?: number;
  client_id?: number;
  all_day?: boolean;
}

interface EventWithColor extends Event {
  colorClass: string;
  top?: string;
  height?: string;
  dayHour?: Date;
  duration?: number;
}

export default function CalendarView({ onEventClick, onDateClick, onAddEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  // Fetch events
  const { data: events } = useQuery({
    queryKey: ['/api/events'],
  });

  // Generate calendar days based on current date and view mode
  useEffect(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
      setCalendarDays(eachDayOfInterval({ start, end }));
    } else if (viewMode === 'day') {
      setCalendarDays([currentDate]);
    }
  }, [currentDate, viewMode]);

  // Navigation functions
  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    if (!events) return [];

    return events
      .filter((event: Event) => {
        const startDate = typeof event.start_date === 'string' 
          ? parseISO(event.start_date) 
          : event.start_date;
          
        const endDate = typeof event.end_date === 'string' 
          ? parseISO(event.end_date) 
          : event.end_date;
          
        // Check if the event falls on this day
        if (!startDate || !endDate) return false;
        
        return (
          (isSameDay(day, startDate) || isSameDay(day, endDate)) || 
          (day > startDate && day < endDate)
        );
      })
      .map((event: Event) => {
        // Add a color class based on event type
        const colorClass = EVENT_COLORS[event.type as keyof typeof EVENT_COLORS] || '#3B82F6';
        return { ...event, colorClass };
      });
  };

  // Get events grouped by hour for the timeline view
  const getHourlyEvents = () => {
    const hours = [];
    for (let i = 8; i <= 18; i++) {
      hours.push(i);
    }

    return hours.map(hour => {
      const hourDate = addHours(new Date(currentDate.setHours(hour, 0, 0, 0)), 0);
      
      // Get all events that overlap with this hour
      const hourEvents = calendarDays.map(day => {
        const dayHour = new Date(
          day.getFullYear(), 
          day.getMonth(), 
          day.getDate(), 
          hour, 
          0, 
          0
        );
        
        return getEventsForDay(day)
          .filter((event: EventWithColor) => {
            const startDate = typeof event.start_date === 'string' 
              ? parseISO(event.start_date) 
              : event.start_date;
              
            const endDate = typeof event.end_date === 'string' 
              ? parseISO(event.end_date) 
              : event.end_date;
            
            // Check if the event overlaps with this hour
            if (!startDate || !endDate) return false;
            
            return (
              (startDate.getHours() <= hour && endDate.getHours() >= hour) ||
              (startDate.getHours() === hour && startDate.getMinutes() < 60) ||
              (endDate.getHours() === hour && endDate.getMinutes() > 0)
            );
          })
          .map((event: EventWithColor) => {
            const startDate = typeof event.start_date === 'string' 
              ? parseISO(event.start_date) 
              : event.start_date;
              
            const endDate = typeof event.end_date === 'string' 
              ? parseISO(event.end_date) 
              : event.end_date;
            
            // Calculate position and height for the event
            const starts = startDate.getHours() === hour 
              ? startDate.getMinutes() / 60 * 100 
              : 0;
              
            const ends = endDate.getHours() === hour 
              ? endDate.getMinutes() / 60 * 100 
              : 100;
              
            const height = ends - starts;
            
            // If the event spans multiple hours, adjust accordingly
            let duration = differenceInMinutes(endDate, startDate) / 60;
            if (duration > 1) {
              duration = 1; // Cap at 1 hour for this hour's cell
            }
            
            return {
              ...event,
              top: `${starts}%`,
              height: `${height}%`,
              dayHour,
              duration
            };
          });
      });
      
      return {
        hour,
        events: hourEvents
      };
    });
  };

  const isToday = (day: Date) => {
    return isDayToday(day);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold mr-4">
            {viewMode === 'week' 
              ? `${format(calendarDays[0], 'dd', { locale: ptBR })} - ${format(calendarDays[calendarDays.length - 1], 'dd MMM, yyyy', { locale: ptBR })}` 
              : format(currentDate, 'dd MMMM, yyyy', { locale: ptBR })}
          </h2>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <div className="flex bg-gray-100 rounded-md">
            <Button 
              variant={viewMode === 'day' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('day')}
              className="rounded-r-none"
            >
              Dia
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-l-none"
            >
              Semana
            </Button>
          </div>
          
          <Button
            onClick={() => onAddEvent && onAddEvent(currentDate)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="w-full h-[calc(100vh-240px)] overflow-y-auto">
        {/* Week days header */}
        <div className="grid grid-cols-1 divide-x divide-gray-200">
          <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} divide-x divide-gray-200`}>
            {/* Time column */}
            <div className="min-w-[60px] bg-gray-50 p-2 sticky left-0 z-10 hidden">
              <div className="text-center">
                <span className="text-sm font-medium text-gray-500">Hora</span>
              </div>
            </div>
            
            {/* Day columns */}
            {calendarDays.map((day, dayIndex) => (
              <div 
                key={day.toISOString()} 
                className={`p-2 ${isToday(day) ? 'bg-blue-50' : ''}`}
              >
                <div className="text-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {WEEKDAYS[day.getDay()]}
                  </span>
                  <div className={`text-center ${isToday(day) ? 'bg-blue-500 text-white rounded-full w-7 h-7 mx-auto flex items-center justify-center' : ''}`}>
                    <span className="text-sm">
                      {format(day, 'd')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Hourly rows */}
          <div className="flex flex-col divide-y divide-gray-200">
            {getHourlyEvents().map(({ hour, events }) => (
              <div key={hour} className="flex">
                {/* Time column */}
                <div className="min-w-[60px] bg-gray-50 p-2 text-center sticky left-0 z-10">
                  <span className="text-xs font-medium text-gray-500">
                    {hour}:00
                  </span>
                </div>
                
                {/* Event cells */}
                <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'} flex-1 divide-x divide-gray-200`}>
                  {calendarDays.map((day, dayIndex) => (
                    <div 
                      key={`${day.toISOString()}-${hour}`} 
                      className={`h-16 relative ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                      onClick={() => onDateClick && onDateClick(new Date(day.setHours(hour)))}
                    >
                      {events[dayIndex].map((event: any, eventIndex: number) => (
                        <div
                          key={`event-${event.id || eventIndex}`}
                          className={`absolute rounded p-1 left-1 right-1 overflow-hidden text-white text-xs cursor-pointer`}
                          style={{
                            top: event.top,
                            height: event.height,
                            backgroundColor: event.colorClass
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick && onEventClick(event.id);
                          }}
                        >
                          <div className="truncate font-medium">
                            {event.title}
                          </div>
                          <div className="text-xs truncate opacity-90">
                            {event.start_date && format(new Date(event.start_date), 'HH:mm')} 
                            {event.start_date && event.end_date && ' - '} 
                            {event.end_date && format(new Date(event.end_date), 'HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

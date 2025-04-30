import { useState, useMemo } from "react";
import { format, isSameDay, isSameMonth, parseISO, startOfMonth, endOfMonth, isBefore, isAfter } from "date-fns";
import { pt } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Task, TaskWithDetails } from "@/lib/types";

interface TaskCalendarViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: number, completed: boolean) => void;
  onView: (taskId: number) => void;
  onEdit: (taskId: number) => void;
  onDelete: (taskId: number) => void;
}

export default function TaskCalendarView({
  tasks,
  onToggleComplete,
  onView,
  onEdit,
  onDelete
}: TaskCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  // Agrupando tarefas por data
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      if (task.due_date) {
        const dateStr = task.due_date.split('T')[0];
        const existingTasks = map.get(dateStr) || [];
        map.set(dateStr, [...existingTasks, task]);
      }
    });
    
    return map;
  }, [tasks]);
  
  // Encontrar dias com tarefas no mês atual
  const daysWithTasks = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    
    return Array.from(tasksByDate.entries())
      .filter(([dateStr]) => {
        const date = parseISO(dateStr);
        return isSameMonth(date, selectedMonth) && !isBefore(date, start) && !isAfter(date, end);
      })
      .map(([dateStr]) => parseISO(dateStr));
  }, [tasksByDate, selectedMonth]);
  
  // Tarefas para o dia selecionado
  const tasksForSelectedDate = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(dateStr) || [];
  }, [tasksByDate, selectedDate]);
  
  // Mudar mês
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };
  
  // Ir para o dia atual
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setSelectedMonth(today);
  };
  
  // Renderizar dia do calendário com indicadores de tarefas
  const renderCalendarDay = (day: Date, modifiers: any) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTasks = tasksByDate.get(dateStr) || [];
    
    const hasCompletedTasks = dayTasks.some(task => task.completed);
    const hasIncompleteTasks = dayTasks.some(task => !task.completed);
    const hasOverdueTasks = dayTasks.some(task => {
      if (!task.completed && task.due_date) {
        const dueDate = parseISO(task.due_date);
        return isBefore(dueDate, new Date()) && !isSameDay(dueDate, new Date());
      }
      return false;
    });
    
    let priorityIndicator = null;
    const hasCritical = dayTasks.some(task => task.priority === 'critica');
    const hasHigh = dayTasks.some(task => task.priority === 'alta');
    const hasMedium = dayTasks.some(task => task.priority === 'media');
    
    if (hasCritical) {
      priorityIndicator = <div className="w-1 h-1 rounded-full bg-red-600 absolute bottom-1 right-1" />;
    } else if (hasHigh) {
      priorityIndicator = <div className="w-1 h-1 rounded-full bg-orange-500 absolute bottom-1 right-1" />;
    } else if (hasMedium) {
      priorityIndicator = <div className="w-1 h-1 rounded-full bg-amber-500 absolute bottom-1 right-1" />;
    }
    
    return (
      <div className="relative">
        {day.getDate()}
        {dayTasks.length > 0 && (
          <div className="absolute top-0 right-1 flex -mt-1">
            {hasOverdueTasks && (
              <div className="w-1 h-1 rounded-full bg-red-500 mr-0.5" />
            )}
            {hasIncompleteTasks && !hasOverdueTasks && (
              <div className="w-1 h-1 rounded-full bg-blue-500 mr-0.5" />
            )}
            {hasCompletedTasks && (
              <div className="w-1 h-1 rounded-full bg-green-500" />
            )}
          </div>
        )}
        {priorityIndicator}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-medium">
            {format(selectedMonth, 'MMMM yyyy', { locale: pt })}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={goToToday}
          className="flex items-center"
        >
          <CalendarIcon className="h-4 w-4 mr-1" />
          Hoje
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 flex-1">
        <div className="md:col-span-5 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                className="w-full"
                components={{
                  Day: ({ date, ...props }) => (
                    <div {...props}>
                      {renderCalendarDay(date, props)}
                    </div>
                  )
                }}
                modifiers={{
                  withTasks: daysWithTasks
                }}
                modifiersClassNames={{
                  withTasks: "border-b-2 border-primary"
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: pt })}
                </h3>
                <Badge variant={tasksForSelectedDate.length > 0 ? "default" : "outline"}>
                  {tasksForSelectedDate.length} {tasksForSelectedDate.length === 1 ? 'tarefa' : 'tarefas'}
                </Badge>
              </div>
              
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-2">
                  {tasksForSelectedDate.length > 0 ? (
                    tasksForSelectedDate.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={() => onToggleComplete(task.id, task.completed)}
                        onView={() => onView(task.id)}
                        onEdit={() => onEdit(task.id)}
                        onDelete={() => onDelete(task.id)}
                        compact={true}
                      />
                    ))
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma tarefa para este dia</p>
                      <p className="text-sm">Selecione outra data ou adicione uma nova tarefa</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
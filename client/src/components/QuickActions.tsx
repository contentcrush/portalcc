import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Plus,
  ListTodo,
  Users,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WEEKDAYS, MONTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function QuickActions() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [_, navigate] = useLocation();

  // Gerar dias do mês para o mini-calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Navegar para a página correspondente
  const handleNewProject = () => navigate("/projects/new");
  const handleNewTask = () => navigate("/tasks/new");
  const handleNewClient = () => navigate("/clients/new");
  
  // Quando um dia é clicado no mini calendário
  const handleDayClick = (day: Date) => {
    // Navega para a página de calendário com a data selecionada
    navigate(`/calendar?date=${format(day, 'yyyy-MM-dd')}`);
  };

  // Usuários da equipe (em um ambiente real, isso viria de uma API)
  const teamMembers = [
    { id: 1, name: "Bruno Silva", initials: "BS", status: "online", color: "bg-blue-500" },
    { id: 2, name: "Ana Oliveira", initials: "AO", status: "online", color: "bg-green-500" },
    { id: 3, name: "Carlos Mendes", initials: "CM", status: "offline", color: "bg-gray-500" },
    { id: 4, name: "Julia Santos", initials: "JS", status: "online", color: "bg-purple-500" }
  ];

  // Determinar se um dia é hoje
  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <div className="p-4 space-y-8">
      {/* Ações Rápidas */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">AÇÕES RÁPIDAS</h2>
        <div className="space-y-2">
          <Button 
            variant="default" 
            className="w-full justify-start" 
            size="lg"
            onClick={handleNewProject}
          >
            <Plus className="mr-2 h-5 w-5" />
            Novo Projeto
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start bg-gray-50 text-gray-800" 
            size="lg"
            onClick={handleNewTask}
          >
            <ListTodo className="mr-2 h-5 w-5" />
            Nova Tarefa
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start bg-gray-50 text-gray-800" 
            size="lg"
            onClick={handleNewClient}
          >
            <Users className="mr-2 h-5 w-5" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Mini Calendário */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">CALENDÁRIO</h2>
        <div className="bg-gray-50 rounded-md p-4">
          <div className="text-center mb-3">
            <h3 className="font-medium">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h3>
          </div>
          
          {/* Dias da semana */}
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
              <div key={index}>{day}</div>
            ))}
          </div>
          
          {/* Grid do calendário */}
          <div className="grid grid-cols-7 gap-1">
            {/* Espaços vazios para o início do mês */}
            {Array.from({ length: monthStart.getDay() }).map((_, index) => (
              <div key={`empty-start-${index}`} className="h-6"></div>
            ))}
            
            {/* Dias do mês */}
            {calendarDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "h-6 w-6 text-xs rounded-full flex items-center justify-center cursor-pointer",
                  isToday(day) ? "bg-blue-500 text-white" : "hover:bg-gray-200"
                )}
                onClick={() => handleDayClick(day)}
              >
                {format(day, 'd')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Equipe */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">EQUIPE</h2>
        <div className="space-y-3">
          {teamMembers.map(member => (
            <div key={member.id} className="flex items-center">
              <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-white font-medium mr-3`}>
                {member.initials}
              </div>
              <div>
                <div className="font-medium">{member.name}</div>
                <div className={`text-xs ${member.status === 'online' ? 'text-green-500' : 'text-gray-400'}`}>
                  {member.status === 'online' ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
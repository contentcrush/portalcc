import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset,
  Target,
  TrendingUp,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WelcomeMessageProps {
  className?: string;
}

export default function WelcomeMessage({ className }: WelcomeMessageProps) {
  const { user } = useAuth();
  
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!user,
  });
  
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  if (!user) return null;

  // Determinar saudação baseada na hora
  const hour = new Date().getHours();
  let greeting = "Bom dia";
  let timeIcon = Sunrise;
  let timeOfDay = "manhã";

  if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
    timeIcon = Sun;
    timeOfDay = "tarde";
  } else if (hour >= 18 && hour < 22) {
    greeting = "Boa tarde";
    timeIcon = Sunset;
    timeOfDay = "final de tarde";
  } else if (hour >= 22 || hour < 6) {
    greeting = "Boa noite";
    timeIcon = Moon;
    timeOfDay = "noite";
  }

  // Análise básica dos dados
  const projectsArray = Array.isArray(projects) ? projects : [];
  const tasksArray = Array.isArray(tasks) ? tasks : [];
  
  const activeProjects = projectsArray.filter((p: any) => 
    p.status === 'em_andamento' || p.status === 'em_producao'
  ).length;
  
  const pendingTasks = tasksArray.filter((t: any) => 
    t.status !== 'completed' && t.status !== 'cancelled'
  ).length;

  const myTasks = tasksArray.filter((t: any) => 
    t.assigned_user_id === user.id
  ).length;

  const TimeIcon = timeIcon;

  // Gerar mensagem principal
  let mainMessage = `${greeting}, ${user.name}!`;
  
  if (activeProjects > 0) {
    mainMessage += ` Você tem ${activeProjects} projeto${activeProjects > 1 ? 's' : ''} ativo${activeProjects > 1 ? 's' : ''} em andamento.`;
  }
  
  if (hour >= 6 && hour < 9) {
    mainMessage += " Que tal começar o dia revisando suas tarefas prioritárias?";
  } else if (hour >= 17 && hour < 19) {
    mainMessage += " Como foi seu dia de trabalho?";
  } else if (hour >= 19) {
    mainMessage += " Esperamos que tenha tido um dia produtivo!";
  }

  // Insights personalizados
  const insights = [];
  
  if (myTasks > 0) {
    insights.push({
      icon: Target,
      message: `${myTasks} tarefa${myTasks > 1 ? 's' : ''} atribuída${myTasks > 1 ? 's' : ''} a você`,
      color: 'text-blue-600 bg-blue-50'
    });
  }
  
  if (activeProjects > 0) {
    insights.push({
      icon: TrendingUp,
      message: `${activeProjects} projeto${activeProjects > 1 ? 's' : ''} em andamento`,
      color: 'text-green-600 bg-green-50'
    });
  }
  
  if (pendingTasks > 0) {
    insights.push({
      icon: Clock,
      message: `${pendingTasks} tarefa${pendingTasks > 1 ? 's' : ''} pendente${pendingTasks > 1 ? 's' : ''}`,
      color: 'text-orange-600 bg-orange-50'
    });
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
              <TimeIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {greeting}!
              </h2>
              <p className="text-sm text-gray-500">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {timeOfDay}
          </Badge>
        </div>

        <p className="text-gray-700 mb-4 leading-relaxed">
          {mainMessage}
        </p>

        {/* Insights personalizados */}
        {insights.length > 0 && (
          <div className="space-y-2 mb-4">
            {insights.slice(0, 3).map((insight, index) => {
              const InsightIcon = insight.icon;
              return (
                <div 
                  key={index}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${insight.color}`}
                >
                  <InsightIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {insight.message}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats rápidas */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>{activeProjects} ativos</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>{pendingTasks} tarefas</span>
            </div>
            {myTasks > 0 && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>{myTasks} suas</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
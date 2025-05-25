import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { format, isAfter, isBefore, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WelcomeMessageProps {
  className?: string;
}

export default function WelcomeMessage({ className }: WelcomeMessageProps) {
  const { user } = useAuth();
  
  // Buscar dados para personalização
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });
  
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: financialDocuments = [] } = useQuery<any[]>({
    queryKey: ["/api/financial-documents"],
  });

  // Gerar mensagem personalizada
  const welcomeData = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    
    // Determinar período do dia e ícone
    let timeIcon = Sun;
    let timeOfDay = "dia";
    let greeting = "Bom dia";
    
    if (hour >= 5 && hour < 12) {
      timeIcon = Sunrise;
      timeOfDay = "manhã";
      greeting = "Bom dia";
    } else if (hour >= 12 && hour < 18) {
      timeIcon = Sun;
      timeOfDay = "tarde";
      greeting = "Boa tarde";
    } else if (hour >= 18 && hour < 22) {
      timeIcon = Sunset;
      timeOfDay = "final de tarde";
      greeting = "Boa tarde";
    } else {
      timeIcon = Moon;
      timeOfDay = "noite";
      greeting = "Boa noite";
    }

    // Analisar projetos
    const activeProjects = projects.filter((p: any) => 
      p.status === 'em_andamento' || p.status === 'em_producao'
    );
    
    const completedThisMonth = projects.filter((p: any) => {
      if (p.status !== 'concluido' || !p.delivery_date) return false;
      const deliveryDate = new Date(p.delivery_date);
      return deliveryDate.getMonth() === now.getMonth() && 
             deliveryDate.getFullYear() === now.getFullYear();
    });

    // Analisar tarefas
    const pendingTasks = tasks.filter((t: any) => 
      t.status !== 'completed' && t.status !== 'cancelled'
    );
    
    const urgentTasks = pendingTasks.filter((t: any) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const daysUntilDue = differenceInDays(dueDate, now);
      return daysUntilDue <= 2 && daysUntilDue >= 0;
    });

    const myTasks = pendingTasks.filter((t: any) => 
      t.assigned_user_id === user?.id
    );

    // Analisar financeiro
    const pendingInvoices = financialDocuments.filter((d: any) => 
      !d.paid && d.type === 'invoice'
    );
    
    const overdueInvoices = pendingInvoices.filter((d: any) => {
      if (!d.due_date) return false;
      return isBefore(new Date(d.due_date), now);
    });

    // Gerar insights personalizados
    const insights = [];
    
    if (urgentTasks.length > 0) {
      insights.push({
        type: 'urgent',
        icon: AlertTriangle,
        message: `${urgentTasks.length} tarefa${urgentTasks.length > 1 ? 's' : ''} urgente${urgentTasks.length > 1 ? 's' : ''} precisam de atenção`,
        color: 'text-red-600 bg-red-50'
      });
    }
    
    if (myTasks.length > 0) {
      insights.push({
        type: 'tasks',
        icon: Target,
        message: `Você tem ${myTasks.length} tarefa${myTasks.length > 1 ? 's' : ''} atribuída${myTasks.length > 1 ? 's' : ''}`,
        color: 'text-blue-600 bg-blue-50'
      });
    }
    
    if (completedThisMonth.length > 0) {
      insights.push({
        type: 'achievement',
        icon: CheckCircle,
        message: `${completedThisMonth.length} projeto${completedThisMonth.length > 1 ? 's' : ''} concluído${completedThisMonth.length > 1 ? 's' : ''} este mês`,
        color: 'text-green-600 bg-green-50'
      });
    }
    
    if (overdueInvoices.length > 0) {
      insights.push({
        type: 'overdue',
        icon: Clock,
        message: `${overdueInvoices.length} fatura${overdueInvoices.length > 1 ? 's' : ''} em atraso`,
        color: 'text-orange-600 bg-orange-50'
      });
    }

    // Gerar mensagem principal personalizada
    let mainMessage = `${greeting}, ${user?.name || 'Usuário'}!`;
    
    if (activeProjects.length > 0) {
      mainMessage += ` Você tem ${activeProjects.length} projeto${activeProjects.length > 1 ? 's' : ''} ativo${activeProjects.length > 1 ? 's' : ''} em andamento.`;
    }
    
    if (hour >= 6 && hour < 9) {
      mainMessage += " Que tal começar o dia revisando suas tarefas prioritárias?";
    } else if (hour >= 17 && hour < 19) {
      mainMessage += " Como foi seu dia de trabalho?";
    } else if (hour >= 19) {
      mainMessage += " Esperamos que tenha tido um dia produtivo!";
    }

    return {
      greeting,
      timeIcon,
      timeOfDay,
      mainMessage,
      insights: insights.slice(0, 3), // Máximo 3 insights
      stats: {
        activeProjects: activeProjects.length,
        pendingTasks: pendingTasks.length,
        completedThisMonth: completedThisMonth.length
      }
    };
  }, [user, projects, tasks, financialDocuments]);

  if (!user) return null;

  const TimeIcon = welcomeData.timeIcon;

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
                {welcomeData.greeting}!
              </h2>
              <p className="text-sm text-gray-500">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {welcomeData.timeOfDay}
          </Badge>
        </div>

        <p className="text-gray-700 mb-4 leading-relaxed">
          {welcomeData.mainMessage}
        </p>

        {/* Insights personalizados */}
        {welcomeData.insights.length > 0 && (
          <div className="space-y-2">
            {welcomeData.insights.map((insight, index) => {
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
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>{welcomeData.stats.activeProjects} ativos</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>{welcomeData.stats.pendingTasks} tarefas</span>
            </div>
            {welcomeData.stats.completedThisMonth > 0 && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>{welcomeData.stats.completedThisMonth} concluídos</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { DashboardCard } from "./DashboardCard";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

export function TeamWorkload() {
  const { data: users = [] } = useQuery({ queryKey: ['/api/users'] });
  const { data: tasks = [] } = useQuery({ queryKey: ['/api/tasks'] });
  
  const currentWeek = new Date().getDay(); // 0-6, onde 0 é Domingo
  const maxHoursPerWeek = 40; // Horas de trabalho máximas por semana
  
  // Calculate workload for each team member
  const teamWorkload = users
    .filter(user => user.role !== 'viewer') // Exclui usuários que são apenas visualizadores
    .map(user => {
      // Encontrar todas as tarefas atribuídas a este usuário
      const userTasks = tasks.filter(task => 
        task.assignee_id === user.id && !task.completed
      );
      
      // Calcular a carga de trabalho estimada para esta semana
      // Usando uma heurística simples: cada tarefa = 3-8 horas dependendo da prioridade
      const workloadHours = userTasks.reduce((total, task) => {
        let hoursEstimate = 5; // Padrão para prioridade média
        
        if (task.priority === 'baixa') hoursEstimate = 3;
        else if (task.priority === 'alta') hoursEstimate = 6;
        else if (task.priority === 'critica') hoursEstimate = 8;
        
        return total + hoursEstimate;
      }, 0);
      
      // Calcular a porcentagem da carga máxima semanal
      const workloadPercentage = Math.min(100, Math.round((workloadHours / maxHoursPerWeek) * 100));
      
      // Determinar o status de sobrecarga
      let status = 'normal';
      if (workloadPercentage > 90) status = 'overbooked';
      else if (workloadPercentage > 75) status = 'high';
      else if (workloadPercentage < 25) status = 'low';
      
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        taskCount: userTasks.length,
        workloadHours,
        workloadPercentage,
        status
      };
    })
    .sort((a, b) => b.workloadPercentage - a.workloadPercentage);

  // Progress bar color based on workload status
  const getProgressColor = (status: string): string => {
    switch (status) {
      case 'overbooked': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'low': return 'bg-blue-400';
      default: return 'bg-emerald-500';
    }
  };

  return (
    <DashboardCard 
      title="Carga da equipe" 
      description="Horas de tarefa atribuídas por membro semana atual"
      headerAction={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">
              Baseado em estimativas de horas por tarefa: 
              Baixa (3h), Média (5h), Alta (6h), Crítica (8h).
              Máximo: 40h semanais.
            </p>
          </TooltipContent>
        </Tooltip>
      }
    >
      <div className="mt-2 space-y-4">
        {teamWorkload.map((member) => (
          <div key={member.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <Link href={`/team/${member.id}`}>
                  <span className="text-sm font-medium hover:underline cursor-pointer">
                    {member.name}
                  </span>
                </Link>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  {member.taskCount} {member.taskCount === 1 ? 'tarefa' : 'tarefas'}
                </span>
                <span className="text-xs font-medium">
                  {member.workloadHours}h
                </span>
              </div>
            </div>
            <Progress 
              value={member.workloadPercentage} 
              className={`h-2 ${getProgressColor(member.status)}`} 
            />
          </div>
        ))}
        
        {teamWorkload.length === 0 && (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">Sem dados de carga de trabalho disponíveis</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
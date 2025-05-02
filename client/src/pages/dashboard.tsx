import { useState } from "react";
import { 
  QuickStats,
  RevenueExpenseTrend,
  TopRevenueProjects,
  ProjectPipeline,
  UpcomingDeadlines,
  AlertsPanel,
  RecentActivity,
  TeamWorkload
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  PlusCircle, 
  DownloadCloud,
  CalendarRange
} from "lucide-react";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Dashboard principal do sistema
 * Redesenhado para mostrar tudo que o usuário precisa enxergar em 30 segundos
 */
export default function Dashboard() {
  const { openProjectForm } = useProjectForm();
  const [lastUpdated] = useState(new Date());

  // Tempo desde a última atualização
  const timeAgo = formatDistance(
    new Date(),
    lastUpdated,
    { addSuffix: true, locale: ptBR }
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Cabeçalho do Dashboard */}
        <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Tudo que você precisa enxergar em 30 segundos sobre produção, tarefas, finanças e equipe.
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center text-xs text-muted-foreground mr-2">
              <Clock className="h-3 w-3 mr-1" />
              <span>Atualizado {timeAgo}</span>
            </div>
            
            <Link href="/calendar">
              <Button variant="outline" size="sm">
                <CalendarRange className="h-4 w-4 mr-2" />
                Calendário
              </Button>
            </Link>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <DownloadCloud className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </Tooltip>
            
            <Button size="sm" onClick={openProjectForm}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>
        
        <Separator />

        {/* Layout principal do Dashboard - Mobile First & Responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Coluna 1 - Visão Rápida (Cards no topo para mobile) */}
          <div className="md:col-span-1">
            <QuickStats />
          </div>
          
          {/* Coluna 2 & 3 - Gráficos e Pipeline (Ocupa 2 colunas em tablets e desktop) */}
          <div className="md:col-span-2 lg:col-span-2 space-y-4">
            <RevenueExpenseTrend />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TopRevenueProjects />
              <ProjectPipeline />
            </div>
          </div>
          
          {/* Coluna 4 - Prazos, Alertas e Atividades (Última coluna em desktop) */}
          <div className="lg:col-span-1 space-y-4">
            <UpcomingDeadlines />
            <AlertsPanel />
          </div>
        </div>
        
        {/* Seção inferior - Atividade recente e carga da equipe */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <RecentActivity />
          <TeamWorkload />
        </div>
      </div>
    </TooltipProvider>
  );
}
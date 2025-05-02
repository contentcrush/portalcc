import { DashboardCard } from "./DashboardCard";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface StageCountProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function StageCount({ label, count, total, color }: StageCountProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs font-medium">
          {count} <span className="text-muted-foreground">({percentage}%)</span>
        </span>
      </div>
      <Progress value={percentage} className={`h-2 ${color}`} />
    </div>
  );
}

export function ProjectPipeline() {
  const { data: projects = [] } = useQuery({ queryKey: ['/api/projects'] });

  // Define stages and their counts
  const totalProjects = projects.length;
  
  const stageData = [
    { 
      stage: 'proposta', 
      label: 'Proposta', 
      count: projects.filter(p => p.status === 'proposta').length,
      color: 'bg-blue-500'
    },
    { 
      stage: 'pre-producao', 
      label: 'Pré-produção', 
      count: projects.filter(p => p.status === 'pre-producao').length,
      color: 'bg-purple-500'
    },
    { 
      stage: 'producao', 
      label: 'Produção', 
      count: projects.filter(p => p.status === 'producao').length,
      color: 'bg-amber-500'
    },
    { 
      stage: 'pos-revisao', 
      label: 'Pós/Revisão', 
      count: projects.filter(p => p.status === 'pos-revisao').length,
      color: 'bg-emerald-500'
    },
    { 
      stage: 'entregue-aprovado', 
      label: 'Entregue/Aprovado', 
      count: projects.filter(p => p.status === 'entregue-aprovado').length,
      color: 'bg-green-600'
    },
    { 
      stage: 'concluido', 
      label: 'Concluído', 
      count: projects.filter(p => p.status === 'concluido').length,
      color: 'bg-gray-400'
    }
  ];

  return (
    <DashboardCard 
      title="Pipeline de projetos" 
      description="Mini-kanban por etapa com contagem de cards"
      headerAction={
        <Link href="/projects">
          <Button variant="ghost" size="sm">Ver pipeline</Button>
        </Link>
      }
    >
      <div className="mt-2">
        {stageData.map((stage) => (
          <StageCount 
            key={stage.stage}
            label={stage.label}
            count={stage.count}
            total={totalProjects}
            color={stage.color}
          />
        ))}
        
        {/* Special statuses */}
        <div className="mt-4 pt-2 border-t border-dashed">
          <StageCount 
            label="Atrasado"
            count={projects.filter(p => p.status === 'atrasado').length}
            total={totalProjects}
            color="bg-red-500"
          />
          <StageCount 
            label="Pausado"
            count={projects.filter(p => p.status === 'pausado').length}
            total={totalProjects}
            color="bg-gray-500"
          />
          <StageCount 
            label="Cancelado"
            count={projects.filter(p => p.status === 'cancelado').length}
            total={totalProjects}
            color="bg-red-700"
          />
        </div>
      </div>
    </DashboardCard>
  );
}
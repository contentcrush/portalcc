import { cn, getNormalizedProjectStatus } from "@/lib/utils";
import { ProjectWithClient, ProjectStageStatus, ProjectSpecialStatus } from "@/lib/types";

interface ProjectProgressProps {
  project: ProjectWithClient | any;  // Aceita qualquer estrutura para tolerância a erros
  showLabel?: boolean;
  showStages?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente reutilizável para exibir a barra de progresso de um projeto
 * Implementa as regras de negócio específicas para cálculo e exibição visual
 * Agora com validações de segurança para evitar erros com dados ausentes
 */
export function ProjectProgress({ 
  project, 
  showLabel = false, 
  showStages = false, 
  className = "",
  size = 'md'
}: ProjectProgressProps) {
  // Verificação de segurança para projeto indefinido ou nulo
  if (!project) {
    return (
      <div className={cn("w-full", className)}>
        <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden", 
          size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2.5')}>
          <div className="bg-gray-300 h-full rounded-full" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  // Cálculo de progresso baseado em várias regras de negócio
  let progressValue = (project?.progress ?? 0);
  
  // Primeiro obtém o status do projeto (normalizado)
  const { stageStatus, specialStatus } = getNormalizedProjectStatus(project);
  let baseStatus = stageStatus;
  
  // Calcular progresso baseado no status se não tiver valor explícito
  if (!project.progress) {
    // Para status especiais, usamos o status de etapa subjacente
    switch(baseStatus) {
      case 'proposta':
        progressValue = 10;
        break;
      case 'pre_producao':
        progressValue = 30;
        break;
      case 'producao':
        progressValue = 50;
        break;
      case 'pos_revisao':
        progressValue = 75;
        break;
      case 'entregue':
        progressValue = 90;
        break;
      case 'concluido':
        progressValue = 100;
        break;
      default:
        progressValue = 0;
    }
  }
  
  // Determinar as classes de estilo com base no valor e status
  const getProgressBarColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 50) return "bg-amber-500";
    return "bg-orange-500";
  };
  
  // Usar nullish coalescing para evitar erros com project.status
  const isPaused = (project?.status ?? '') === 'pausado';
  
  // Classes para o tamanho da barra
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2.5';
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className={cn("flex justify-between mb-1.5", textSizeClass)}>
          <span>Progresso</span>
          <span className="font-medium">{progressValue}%</span>
        </div>
      )}
      
      <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden", heightClass)}>
        <div 
          className={cn(
            getProgressBarColor(progressValue), 
            heightClass, 
            "rounded-full",
            { "bg-stripes": isPaused }
          )}
          style={{ width: `${progressValue}%` }}
        />
      </div>
      
      {showStages && (
        <div className="flex justify-between mt-1">
          <span className="w-1/6 text-center text-xs">Proposta</span>
          <span className="w-1/6 text-center text-xs">Pré-prod.</span>
          <span className="w-1/6 text-center text-xs">Produção</span>
          <span className="w-1/6 text-center text-xs">Revisão</span>
          <span className="w-1/6 text-center text-xs">Entregue</span>
          <span className="w-1/6 text-center text-xs">Concluído</span>
        </div>
      )}
    </div>
  );
}
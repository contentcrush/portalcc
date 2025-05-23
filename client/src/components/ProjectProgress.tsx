import { cn } from "@/lib/utils";
import { useProjectProgress } from "../hooks/useProjectProgress";

interface ProjectProgressProps {
  project: any;
  showLabel?: boolean;
  showStages?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente reutilizável para exibir a barra de progresso de um projeto
 * Usa a Timeline do Projeto como fonte única de verdade
 */
export function ProjectProgress({ 
  project, 
  showLabel = false, 
  showStages = false, 
  className = "",
  size = 'md'
}: ProjectProgressProps) {
  // Usar o hook consistente baseado na Timeline do Projeto
  const { calculateProgress } = useProjectProgress();
  const progressData = calculateProgress(project);
  
  const progressValue = progressData.percentage;
  
  // Determinar as classes de estilo com base no valor e status
  const getProgressBarColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 50) return "bg-amber-500";
    return "bg-orange-500";
  };
  
  const isPaused = project.special_status === 'paused';
  
  // Classes para o tamanho da barra
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2.5';
  const textSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className={cn("flex justify-between items-center mb-1.5", textSizeClass)}>
          <div className="flex flex-col">
            <span>Progresso</span>
            {progressData.nextMilestone && (
              <span className="text-xs text-gray-500 mt-0.5">
                Próximo: {progressData.nextMilestone}
              </span>
            )}
          </div>
          <span className="font-medium">{progressValue}%</span>
        </div>
      )}
      
      <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden", heightClass)}>
        <div 
          className={cn(
            getProgressBarColor(progressValue), 
            heightClass, 
            "rounded-full",
            { "opacity-60 bg-stripes": isPaused }
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
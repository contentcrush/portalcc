import { cn } from "@/lib/utils";
import { PROJECT_STATUS_CONFIG, calculateProgressFromStatus, type ProjectStatus } from "@shared/schema";

interface ProjectProgressProps {
  project: any;
  showLabel?: boolean;
  showStages?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente reutilizável para exibir a barra de progresso de um projeto
 * Implementa as regras de negócio específicas para cálculo e exibição visual
 */
export function ProjectProgress({ 
  project, 
  showLabel = false, 
  showStages = false, 
  className = "",
  size = 'md'
}: ProjectProgressProps) {
  // Usar o novo sistema simplificado para calcular progresso
  const projectStatus = project.status as ProjectStatus;
  const hasBudget = project.budget && project.budget > 0;
  
  // Calcular progresso usando a nova função centralizada
  const progressValue = project.progress || calculateProgressFromStatus(projectStatus, hasBudget);
  
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
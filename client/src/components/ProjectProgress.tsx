import { calculateProjectProgress } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Pause, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  showLabel = true, 
  showStages = false, 
  className = "",
  size = 'md'
}: ProjectProgressProps) {
  if (!project) return null;
  
  // Calcular o progresso e obter informações visuais
  const { 
    percent, 
    color, 
    label, 
    stagesCompleted, 
    totalStages, 
    visualState 
  } = calculateProjectProgress(project);
  
  // Tamanho da barra baseado na prop size
  const heightClass = {
    'sm': 'h-1.5',
    'md': 'h-2.5',
    'lg': 'h-4'
  }[size];
  
  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {/* Barra de progresso com visual baseado no status */}
      <div className="relative">
        <Progress 
          value={percent} 
          className={cn(
            heightClass,
            "bg-gray-100 rounded-full overflow-hidden",
            visualState === 'paused' && "bg-stripes" // Adiciona listras para projetos pausados
          )} 
          // A cor vem do cálculo baseado no status ou percentual
          indicatorClassName={cn(
            color,
            "transition-all rounded-full"
          )}
        />
        
        {/* Indicadores visuais de status especial */}
        {visualState !== 'normal' && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center justify-center rounded-full p-0.5",
                    size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
                    visualState === 'delayed' && "bg-rose-500",
                    visualState === 'paused' && "bg-gray-400",
                    visualState === 'cancelled' && "bg-gray-300",
                  )}>
                    {visualState === 'delayed' && <AlertTriangle className="h-2 w-2 text-white" />}
                    {visualState === 'paused' && <Pause className="h-2 w-2 text-white" />}
                    {visualState === 'cancelled' && <X className="h-2 w-2 text-white" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {visualState === 'delayed' && "Projeto atrasado"}
                  {visualState === 'paused' && "Projeto pausado"}
                  {visualState === 'cancelled' && "Projeto cancelado"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      
      {/* Label de progresso e etapas */}
      {(showLabel || showStages) && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          {showLabel && <span>{label}</span>}
          {showStages && (
            <span>
              {stagesCompleted} de {totalStages} etapas concluídas
            </span>
          )}
        </div>
      )}
    </div>
  );
}
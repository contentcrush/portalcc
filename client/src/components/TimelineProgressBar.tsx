import { cn } from "@/lib/utils";
import { useProjectProgress } from "../hooks/useProjectProgress";

interface TimelineProgressBarProps {
  project: any;
}

export function TimelineProgressBar({ project }: TimelineProgressBarProps) {
  const { calculateProgress } = useProjectProgress();
  const progressData = calculateProgress(project);
  
  const stageSteps = [
    { key: 'proposta', label: 'Proposta', color: 'bg-green-500' },
    { key: 'proposta_aceita', label: 'Aceita', color: 'bg-green-500' },
    { key: 'pre_producao', label: 'Pré-prod.', color: 'bg-amber-500' },
    { key: 'producao', label: 'Produção', color: 'bg-purple-500' },
    { key: 'pos_revisao', label: 'Pós-prod.', color: 'bg-purple-500' },
    { key: 'entregue', label: 'Entregue', color: 'bg-green-500' },
    { key: 'concluido', label: 'Concluído', color: 'bg-green-500' }
  ];

  const currentStageIndex = stageSteps.findIndex(stage => stage.key === project.status);
  
  return (
    <div className="space-y-4">
      {/* Informações do Status Atual */}
      <div className="bg-gray-50 rounded-lg p-3 border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Status atual</p>
            <p className="text-xs text-gray-600 capitalize">
              {project.status?.replace('_', ' ') || 'Indefinido'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{Math.round(progressData.percentage)}%</p>
            <p className="text-xs text-gray-600">Progresso</p>
          </div>
        </div>
      </div>

      {/* Barra de Progresso Linear */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Próximo: {progressData.nextMilestone || 'Concluído'}</span>
        </div>
        
        {/* Barra visual */}
        <div className="relative">
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(progressData.percentage)}%` }}
            />
          </div>
          
          {/* Marcadores das etapas */}
          <div className="flex justify-between mt-3">
            {stageSteps.map((stage, index) => {
              const isCompleted = index <= currentStageIndex;
              const isCurrent = index === currentStageIndex;
              
              return (
                <div key={stage.key} className="flex flex-col items-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2 transition-colors",
                    isCompleted 
                      ? "bg-orange-500 border-orange-500" 
                      : "bg-gray-200 border-gray-300",
                    isCurrent && "ring-2 ring-orange-200"
                  )} />
                  <span className={cn(
                    "text-xs mt-1 text-center max-w-[60px]",
                    isCompleted ? "text-gray-900 font-medium" : "text-gray-500"
                  )}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
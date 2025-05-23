import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Clock, Pause, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  PROJECT_STATUS_CONFIG,
  isValidStatusTransition,
  type ProjectStatus,
  type SpecialStatus 
} from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProjectTimelineProps {
  project: any;
  onStatusUpdate: (newStatus: ProjectStatus) => void;
  className?: string;
}

interface TimelineStep {
  id: ProjectStatus;
  label: string;
  description: string;
  icon: typeof Check;
  color: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 'proposta',
    label: 'Proposta',
    description: 'Elaboração e envio da proposta',
    icon: Circle,
    color: 'blue'
  },
  {
    id: 'proposta_aceita',
    label: 'Proposta Aceita',
    description: 'Cliente aprovou a proposta',
    icon: Check,
    color: 'green'
  },
  {
    id: 'pre_producao',
    label: 'Pré-produção',
    description: 'Planejamento e preparação',
    icon: Circle,
    color: 'amber'
  },
  {
    id: 'producao',
    label: 'Produção',
    description: 'Execução do projeto',
    icon: Circle,
    color: 'purple'
  },
  {
    id: 'pos_revisao',
    label: 'Pós-revisão',
    description: 'Revisões e ajustes finais',
    icon: Circle,
    color: 'indigo'
  },
  {
    id: 'entregue',
    label: 'Entregue',
    description: 'Projeto entregue ao cliente',
    icon: Check,
    color: 'green'
  },
  {
    id: 'concluido',
    label: 'Concluído',
    description: 'Projeto finalizado e pago',
    icon: Check,
    color: 'emerald'
  }
];

const SPECIAL_STATUS_CONFIG = {
  'delayed': {
    label: 'Atrasado',
    icon: Clock,
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300'
  },
  'paused': {
    label: 'Pausado',
    icon: Pause,
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300'
  },
  'canceled': {
    label: 'Cancelado',
    icon: X,
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300'
  }
};

export function ProjectTimeline({ project, onStatusUpdate, className }: ProjectTimelineProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    targetStatus: ProjectStatus | null;
    title: string;
    description: string;
  }>({
    isOpen: false,
    targetStatus: null,
    title: '',
    description: ''
  });

  const currentStatus = project.status as ProjectStatus;
  const specialStatus = project.special_status as SpecialStatus;
  
  // Determinar qual etapa está ativa
  const currentStepIndex = TIMELINE_STEPS.findIndex(step => step.id === currentStatus);
  
  const handleStepClick = (targetStatus: ProjectStatus) => {
    // Verificar se a transição é válida
    if (!isValidStatusTransition(currentStatus, targetStatus)) {
      return;
    }

    // Definir confirmações especiais para ações críticas
    let title = '';
    let description = '';
    
    if (targetStatus === 'proposta' && currentStatus !== 'proposta') {
      title = 'Reverter para Proposta';
      description = 'Esta ação irá reverter o projeto para a fase de proposta e remover todos os documentos financeiros. Tem certeza?';
    } else if (targetStatus === 'concluido') {
      title = 'Marcar como Concluído';
      description = 'O projeto será marcado como concluído e pago. Esta ação indica que o projeto foi finalizado com sucesso.';
    } else if (targetStatus === 'entregue' && currentStatus !== 'entregue') {
      title = 'Marcar como Entregue';
      description = 'O projeto será marcado como entregue ao cliente. Confirma esta ação?';
    } else {
      // Transição normal, executar diretamente
      onStatusUpdate(targetStatus);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      targetStatus,
      title,
      description
    });
  };

  const confirmStatusUpdate = () => {
    if (confirmDialog.targetStatus) {
      onStatusUpdate(confirmDialog.targetStatus);
    }
    setConfirmDialog({
      isOpen: false,
      targetStatus: null,
      title: '',
      description: ''
    });
  };

  const getStepStatus = (step: TimelineStep, index: number) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const getStepColor = (step: TimelineStep, status: 'completed' | 'current' | 'upcoming') => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white border-green-500';
      case 'current':
        return `bg-${step.color}-500 text-white border-${step.color}-500`;
      case 'upcoming':
        return 'bg-gray-100 text-gray-400 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  const isStepClickable = (targetStatus: ProjectStatus) => {
    return isValidStatusTransition(currentStatus, targetStatus);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Status Especial Overlay */}
      {specialStatus && specialStatus !== 'none' && SPECIAL_STATUS_CONFIG[specialStatus] && (
        <div className={cn(
          "mb-4 p-3 rounded-lg border flex items-center gap-2",
          SPECIAL_STATUS_CONFIG[specialStatus].bgColor,
          SPECIAL_STATUS_CONFIG[specialStatus].borderColor
        )}>
          {(() => {
            const IconComponent = SPECIAL_STATUS_CONFIG[specialStatus].icon;
            return <IconComponent className={cn(
              "h-4 w-4",
              SPECIAL_STATUS_CONFIG[specialStatus].textColor
            )} />;
          })()}
          <span className={cn(
            "text-sm font-medium",
            SPECIAL_STATUS_CONFIG[specialStatus].textColor
          )}>
            Status Especial: {SPECIAL_STATUS_CONFIG[specialStatus].label}
          </span>
        </div>
      )}

      {/* Timeline Linear */}
      <div className="relative">
        {/* Linha de conexão */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {/* Indicador de progresso */}
        <div 
          className="absolute left-6 top-0 w-0.5 bg-blue-500 transition-all duration-500"
          style={{ 
            height: `${((currentStepIndex + 1) / TIMELINE_STEPS.length) * 100}%` 
          }}
        ></div>

        {/* Etapas */}
        <div className="space-y-4">
          {TIMELINE_STEPS.map((step, index) => {
            const stepStatus = getStepStatus(step, index);
            const StepIcon = stepStatus === 'completed' ? Check : step.icon;
            const isClickable = isStepClickable(step.id);
            
            return (
              <div key={step.id} className="relative flex items-center">
                {/* Ícone da etapa */}
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                    getStepColor(step, stepStatus),
                    isClickable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed",
                    stepStatus === 'current' && "ring-4 ring-blue-100"
                  )}
                >
                  <StepIcon className="h-5 w-5" />
                </button>

                {/* Conteúdo da etapa */}
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={cn(
                        "text-sm font-medium",
                        stepStatus === 'current' ? "text-gray-900" : 
                        stepStatus === 'completed' ? "text-green-700" : "text-gray-500"
                      )}>
                        {step.label}
                      </h4>
                      <p className={cn(
                        "text-xs",
                        stepStatus === 'current' ? "text-gray-600" : 
                        stepStatus === 'completed' ? "text-green-600" : "text-gray-400"
                      )}>
                        {step.description}
                      </p>
                    </div>
                    
                    {/* Badge de status */}
                    {stepStatus === 'current' && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        Atual
                      </Badge>
                    )}
                    {stepStatus === 'completed' && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Concluído
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Informações do Status</h5>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Status atual: <span className="font-medium">{PROJECT_STATUS_CONFIG[currentStatus]?.label}</span></p>
          <p>• Progresso: <span className="font-medium">{Math.round(((currentStepIndex + 1) / TIMELINE_STEPS.length) * 100)}%</span></p>
          {specialStatus && specialStatus !== 'none' && (
            <p>• Status especial: <span className="font-medium">{SPECIAL_STATUS_CONFIG[specialStatus]?.label}</span></p>
          )}
        </div>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => 
        setConfirmDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusUpdate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { useMemo } from 'react';

interface ProgressData {
  percentage: number;
  nextMilestone: string | null;
  completedMilestones: string[];
  currentPhase: string;
}

export function useProjectProgress() {
  const calculateProgress = (project: any): ProgressData => {
    if (!project) {
      return {
        percentage: 0,
        nextMilestone: 'Proposta',
        completedMilestones: [],
        currentPhase: 'indefinido'
      };
    }

    const status = project.status || 'proposta';
    
    // Timeline oficial do projeto - fonte única de verdade
    const timelineSteps = [
      { key: 'proposta', label: 'Proposta', weight: 14.3 }, // 1/7 = ~14.3%
      { key: 'proposta_aceita', label: 'Proposta Aceita', weight: 28.6 }, // 2/7 = ~28.6%
      { key: 'pre_producao', label: 'Pré-produção', weight: 42.9 }, // 3/7 = ~42.9%
      { key: 'producao', label: 'Produção', weight: 57.1 }, // 4/7 = ~57.1%
      { key: 'pos_revisao', label: 'Pós-revisão', weight: 71.4 }, // 5/7 = ~71.4%
      { key: 'entregue', label: 'Entregue', weight: 85.7 }, // 6/7 = ~85.7%
      { key: 'concluido', label: 'Concluído', weight: 100 } // 7/7 = 100%
    ];

    const currentStepIndex = timelineSteps.findIndex(step => step.key === status);
    const currentStep = timelineSteps[currentStepIndex];
    
    if (!currentStep) {
      return {
        percentage: 0,
        nextMilestone: 'Proposta',
        completedMilestones: [],
        currentPhase: status
      };
    }

    // Progresso baseado APENAS na posição da timeline
    const percentage = Math.round(currentStep.weight);

    const completedMilestones = timelineSteps
      .slice(0, currentStepIndex + 1)
      .map(step => step.label);
    
    const nextMilestone = currentStepIndex < timelineSteps.length - 1 
      ? timelineSteps[currentStepIndex + 1].label 
      : null;

    return {
      percentage,
      nextMilestone,
      completedMilestones,
      currentPhase: currentStep.label
    };
  };

  return { calculateProgress };
}
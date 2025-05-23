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
    
    // Definir marcos baseados no status do projeto
    const milestones = [
      { key: 'proposta', label: 'Proposta', weight: 10 },
      { key: 'proposta_aceita', label: 'Proposta Aceita', weight: 20 },
      { key: 'pre_producao', label: 'Pré-produção', weight: 30 },
      { key: 'producao', label: 'Produção', weight: 50 },
      { key: 'pos_revisao', label: 'Pós-revisão', weight: 75 },
      { key: 'entregue', label: 'Entregue', weight: 90 },
      { key: 'concluido', label: 'Concluído', weight: 100 }
    ];

    const currentMilestoneIndex = milestones.findIndex(m => m.key === status);
    const currentMilestone = milestones[currentMilestoneIndex];
    
    if (!currentMilestone) {
      return {
        percentage: 0,
        nextMilestone: 'Proposta',
        completedMilestones: [],
        currentPhase: status
      };
    }

    // Calcular progresso baseado no marco atual
    let baseProgress = currentMilestone.weight;
    
    // Verificar marcos específicos dentro da fase atual
    const hasTeam = project.team_members && project.team_members.length > 0;
    const hasBudget = project.budget && project.budget > 0;
    const hasFinancials = project.financial_documents && project.financial_documents.length > 0;
    
    // Ajustar progresso baseado em critérios específicos
    let adjustedProgress = baseProgress;
    
    if (status === 'pre_producao') {
      // Na pré-produção, considerar se tem equipe e orçamento
      if (hasTeam && hasBudget) {
        adjustedProgress = Math.min(baseProgress + 10, 45);
      } else if (hasTeam || hasBudget) {
        adjustedProgress = Math.min(baseProgress + 5, 40);
      }
    } else if (status === 'proposta_aceita') {
      // Na proposta aceita, considerar se tem documentos financeiros
      if (hasFinancials) {
        adjustedProgress = Math.min(baseProgress + 5, 25);
      }
    }

    const completedMilestones = milestones
      .slice(0, currentMilestoneIndex + 1)
      .map(m => m.label);
    
    const nextMilestone = currentMilestoneIndex < milestones.length - 1 
      ? milestones[currentMilestoneIndex + 1].label 
      : null;

    return {
      percentage: Math.round(adjustedProgress),
      nextMilestone,
      completedMilestones,
      currentPhase: currentMilestone.label
    };
  };

  return { calculateProgress };
}
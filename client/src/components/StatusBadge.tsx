import { Badge } from "@/components/ui/badge";
import { getStatusColor, getNormalizedProjectStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { 
  ProjectStatus,
  ProjectStageStatus,
  ProjectSpecialStatus,
  TaskStatus, 
  TaskPriority, 
  StatusLabels,
  isProjectStage,
  isProjectSpecialStatus,
  Project
} from "@/lib/types";

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus | TaskPriority | null | undefined;
  small?: boolean;
  minimal?: boolean;
  className?: string;
  stageStatus?: ProjectStageStatus | null; // Status de etapa para quando precisamos exibir ambos
  specialStatus?: ProjectSpecialStatus | null; // Status especial para quando precisamos exibir ambos
  project?: Project | null; // Projeto completo para verificação inteligente de status
}

export default function StatusBadge({ 
  status, 
  small = false, 
  minimal = false,
  className = "",
  stageStatus = null,
  specialStatus = null,
  project = null
}: StatusBadgeProps) {
  // Se temos um projeto, usamos getNormalizedProjectStatus para obter o status real
  let activeStageStatus = stageStatus;
  let activeSpecialStatus = specialStatus;
  
  // Prioridade 1: Se temos projeto completo, usamos a função global para normalizar o status
  if (project) {
    const normalizedStatus = getNormalizedProjectStatus(project);
    activeStageStatus = normalizedStatus.stageStatus;
    activeSpecialStatus = normalizedStatus.specialStatus;
  }
  // Prioridade 2: Se já temos stage e special status definidos, usamos eles
  else if (activeStageStatus || activeSpecialStatus) {
    // Manter os valores existentes
  }
  // Prioridade 3: Se só temos um status único, analisamos
  else if (status) {
    // Verificamos se esse status é uma etapa ou status especial
    const normalizedStatus = status === "novo" ? "Novo" : status;
    
    if (isProjectStage(normalizedStatus)) {
      activeStageStatus = normalizedStatus;
    } else if (isProjectSpecialStatus(normalizedStatus)) {
      // Se o status é especial, precisamos definir um status de etapa padrão
      activeSpecialStatus = normalizedStatus;
      activeStageStatus = 'producao'; // etapa padrão
    }
  }
  
  // Verificar se não temos nenhum status para exibir
  if (!status && !activeStageStatus && !activeSpecialStatus) return null;
  
  // Determine background and text colors based on status
  const getBadgeStyles = (statusValue: string) => {
    switch (statusValue) {
      // Status de projetos
      case "proposta":
        return "bg-slate-100 text-slate-800";
      case "pre_producao":
        return "bg-indigo-100 text-indigo-800";
      case "producao":
        return "bg-yellow-100 text-yellow-800";
      case "pos_revisao":
        return "bg-purple-100 text-purple-800";
      case "entregue":
        return "bg-green-100 text-green-800";
      case "concluido":
        return "bg-emerald-100 text-emerald-800";
      case "atrasado":
        return "bg-rose-100 text-rose-800";
      case "pausado":
        return "bg-amber-100 text-amber-800";
      case "cancelado":
        return "bg-gray-100 text-gray-800";
      
      // Status legados de projetos
      case "novo":
      case "Novo":
        return "bg-slate-100 text-slate-800";
      case "em_orcamento":
        return "bg-orange-100 text-orange-800";
      case "em_producao":
        return "bg-yellow-100 text-yellow-800";
      case "em_andamento":
        return "bg-green-100 text-green-800";
      case "revisao_cliente":
        return "bg-purple-100 text-purple-800";
      
      // Status de tarefas
      case "pendente":
        return "bg-amber-100 text-amber-800";
      case "cancelada":
        return "bg-red-100 text-red-800";
      case "bloqueada":
        return "bg-red-100 text-red-800";
      
      // Prioridades
      case "alta":
        return "bg-red-100 text-red-800";
      case "media":
        return "bg-amber-100 text-amber-800";
      case "baixa":
        return "bg-green-100 text-green-800";
      case "critica":
        return "bg-red-200 text-red-900";
      
      default:
        return "bg-slate-100 text-slate-800";
    }
  };
  
  // Função para gerar um badge individual
  const renderBadge = (statusValue: string | null | undefined) => {
    if (!statusValue) return null;
    
    // Get the properly capitalized label from StatusLabels or capitalize the first letter
    const label = StatusLabels[statusValue] || 
      (typeof statusValue === 'string' ? 
        statusValue.charAt(0).toUpperCase() + statusValue.slice(1).replace(/_/g, ' ') : 
        statusValue);
    
    // Status especiais (atrasado, pausado, cancelado) sempre mostram badge mesmo no modo minimal
    const isSpecialStatus = ['atrasado', 'pausado', 'cancelado'].includes(statusValue);
    
    if (minimal && !isSpecialStatus) {
      // Render just a colored dot for minimal style (apenas para status regular)
      return (
        <div className={cn("w-2 h-2 rounded-full", {
          "bg-green-500": statusValue === "em_andamento",
          "bg-blue-500": statusValue === "pre_producao" || statusValue === "concluido",
          "bg-yellow-500": statusValue === "em_producao",
          "bg-orange-500": statusValue === "em_orcamento",
          "bg-slate-500": statusValue === "Novo" || statusValue === "novo",
          "bg-gray-500": !["em_andamento", "pre_producao", "em_producao", "em_orcamento", "Novo", "novo", "concluido"].includes(statusValue),
        })}></div>
      );
    }
    
    // Para status especiais, sempre usamos o badge mesmo no modo minimal
    // também para o modo default de exibição
    return (
      <div className={cn(
        "inline-flex items-center justify-center rounded-full text-xs font-medium px-2.5 py-0.5",
        getBadgeStyles(statusValue),
        small ? "text-xs px-2 py-0.5" : "px-3 py-1",
        className
      )}>
        {label}
      </div>
    );
  };
  
  // Exibimos os dois badges, mas apenas mostramos o badge de status especial se ele existir
  return (
    <div className="inline-flex gap-1">
      {activeStageStatus && renderBadge(activeStageStatus)}
      {activeSpecialStatus && renderBadge(activeSpecialStatus)}
    </div>
  );
}

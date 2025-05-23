import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS_CONFIG, type ProjectStatus, type SpecialStatus } from "@shared/schema";

interface StatusBadgeProps {
  status?: string | null | undefined;
  specialStatus?: string | null | undefined;
  small?: boolean;
  minimal?: boolean;
  className?: string;
  project?: any;
}

export default function StatusBadge({ 
  status, 
  specialStatus,
  small = false, 
  minimal = false,
  className = "",
  project = null
}: StatusBadgeProps) {
  // Determinar o status a ser exibido
  let displayStatus = status;
  let displaySpecialStatus = specialStatus;
  
  // Se temos um projeto, extrair status dele
  if (project) {
    displayStatus = project.status;
    displaySpecialStatus = project.special_status;
  }

  // Priorizar status especial se existir e não for "none"
  if (displaySpecialStatus && displaySpecialStatus !== 'none') {
    const specialStatusColors = {
      delayed: "#F59E0B", // Amber-500
      paused: "#3B82F6",  // Blue-500
      canceled: "#EF4444" // Red-500
    };

    const specialStatusLabels = {
      delayed: "Atrasado",
      paused: "Pausado",
      canceled: "Cancelado"
    };

    const backgroundColor = specialStatusColors[displaySpecialStatus as keyof typeof specialStatusColors] || "#6B7280";
    const label = specialStatusLabels[displaySpecialStatus as keyof typeof specialStatusLabels] || displaySpecialStatus;

    return (
      <Badge 
        variant="secondary"
        className={cn(
          "text-white font-medium shadow-sm",
          small ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
          minimal && "bg-transparent text-current",
          className
        )}
        style={{ 
          backgroundColor: minimal ? 'transparent' : backgroundColor,
          color: minimal ? backgroundColor : 'white',
          border: `1px solid ${backgroundColor}`
        }}
      >
        {label}
      </Badge>
    );
  }

  // Usar status regular do projeto
  if (displayStatus && PROJECT_STATUS_CONFIG[displayStatus as ProjectStatus]) {
    const config = PROJECT_STATUS_CONFIG[displayStatus as ProjectStatus];
    
    return (
      <Badge 
        variant="secondary"
        className={cn(
          "text-white font-medium shadow-sm",
          small ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
          minimal && "bg-transparent text-current",
          className
        )}
        style={{ 
          backgroundColor: minimal ? 'transparent' : config.color,
          color: minimal ? config.color : 'white',
          border: `1px solid ${config.color}`
        }}
      >
        {config.label}
      </Badge>
    );
  }

  // Status padrão para tarefas e outros
  const taskStatusColors = {
    todo: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    done: "bg-green-100 text-green-800",
    blocked: "bg-red-100 text-red-800"
  };

  const taskStatusLabels = {
    todo: "A fazer",
    in_progress: "Em andamento", 
    done: "Concluído",
    blocked: "Bloqueado"
  };

  if (displayStatus && taskStatusColors[displayStatus as keyof typeof taskStatusColors]) {
    const colorClass = taskStatusColors[displayStatus as keyof typeof taskStatusColors];
    const label = taskStatusLabels[displayStatus as keyof typeof taskStatusLabels] || displayStatus;

    return (
      <Badge 
        variant="outline"
        className={cn(
          colorClass,
          small ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
          minimal && "border-0 bg-transparent text-current",
          className
        )}
      >
        {label}
      </Badge>
    );
  }

  // Fallback
  return (
    <Badge 
      variant="outline"
      className={cn(
        "bg-gray-100 text-gray-800",
        small ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
        minimal && "border-0 bg-transparent text-current",
        className
      )}
    >
      {displayStatus || "N/A"}
    </Badge>
  );
}
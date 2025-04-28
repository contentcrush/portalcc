import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { 
  ProjectStatus, 
  TaskStatus, 
  TaskPriority, 
  StatusLabels
} from "@/lib/types";

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus | TaskPriority | null | undefined;
  small?: boolean;
  minimal?: boolean;
  className?: string;
}

export default function StatusBadge({ 
  status, 
  small = false, 
  minimal = false,
  className = "" 
}: StatusBadgeProps) {
  if (!status) return null;
  
  // Capitalize "novo" if it's lowercase
  const normalizedStatus = status === "novo" ? "Novo" : status;
  
  // Get the properly capitalized label from StatusLabels or capitalize the first letter
  const label = StatusLabels[normalizedStatus] || 
    (typeof normalizedStatus === 'string' ? 
      normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1).replace(/_/g, ' ') : 
      normalizedStatus);
  
  // Determine background and text colors based on status
  const getBadgeStyles = () => {
    switch (normalizedStatus) {
      case "novo":
      case "Novo":
        return "bg-slate-100 text-slate-800";
      case "em_orcamento":
        return "bg-orange-100 text-orange-800";
      case "pre_producao":
        return "bg-indigo-100 text-indigo-800";
      case "em_producao":
        return "bg-yellow-100 text-yellow-800";
      case "em_andamento":
        return "bg-green-100 text-green-800";
      case "revisao_cliente":
        return "bg-purple-100 text-purple-800";
      case "concluido":
        return "bg-blue-100 text-blue-800";
      case "pendente":
        return "bg-amber-100 text-amber-800";
      case "cancelada":
        return "bg-red-100 text-red-800";
      case "bloqueada":
        return "bg-red-100 text-red-800";
      case "alta":
        return "bg-red-100 text-red-800";
      case "media":
        return "bg-amber-100 text-amber-800";
      case "baixa":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };
  
  if (minimal) {
    // Render just a colored dot for minimal style
    return (
      <div className={cn("w-2 h-2 rounded-full", {
        "bg-green-500": normalizedStatus === "em_andamento",
        "bg-blue-500": normalizedStatus === "pre_producao" || normalizedStatus === "concluido",
        "bg-yellow-500": normalizedStatus === "em_producao",
        "bg-orange-500": normalizedStatus === "em_orcamento",
        "bg-slate-500": normalizedStatus === "Novo" || normalizedStatus === "novo",
        "bg-gray-500": !["em_andamento", "pre_producao", "em_producao", "em_orcamento", "Novo", "novo", "concluido"].includes(normalizedStatus),
      })}></div>
    );
  }
  
  // Default badge style
  return (
    <div className={cn(
      "inline-flex items-center justify-center rounded-full text-xs font-medium px-2.5 py-0.5",
      getBadgeStyles(),
      small ? "text-xs px-2 py-0.5" : "px-3 py-1",
      className
    )}>
      {label}
    </div>
  );
}

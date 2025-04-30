import { Badge } from "@/components/ui/badge";
import { PRIORITY_COLOR_CLASSES } from "@/lib/constants";

interface PriorityBadgeProps {
  priority: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

/**
 * Componente para exibir badges de prioridade padronizados,
 * usando as cores definidas nas constantes globais
 */
export default function PriorityBadge({ 
  priority, 
  size = "md",
  showText = true
}: PriorityBadgeProps) {
  const normalizedPriority = priority.toLowerCase().replace('é', 'e').replace('í', 'i') as keyof typeof PRIORITY_COLOR_CLASSES;
  const colorClass = PRIORITY_COLOR_CLASSES[normalizedPriority] || PRIORITY_COLOR_CLASSES.default;
  
  // Tamanhos configuráveis
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-3 py-0.5",
    lg: "text-sm px-3 py-1"
  };
  
  // Formatar texto de prioridade (primeira letra maiúscula)
  const formattedText = priority.charAt(0).toUpperCase() + priority.slice(1);
  
  return (
    <Badge 
      className={`rounded-full text-white ${colorClass} ${sizeClasses[size]}`}
    >
      {showText ? formattedText : null}
    </Badge>
  );
}
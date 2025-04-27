import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";
import { 
  ProjectStatus, 
  TaskStatus, 
  TaskPriority, 
  StatusLabels
} from "@/lib/types";

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus | TaskPriority | null | undefined;
  small?: boolean;
  className?: string;
}

export default function StatusBadge({ status, small = false, className = "" }: StatusBadgeProps) {
  if (!status) return null;
  
  const color = getStatusColor(status);
  const label = StatusLabels[status] || status;
  
  const getVariant = () => {
    switch (color) {
      case "green": return "success";
      case "yellow": return "warning";
      case "red": return "destructive";
      case "blue": return "blue";
      case "purple": return "purple";
      case "indigo": return "indigo";
      default: return "secondary";
    }
  };
  
  return (
    <Badge 
      variant={getVariant()} 
      className={`${small ? 'text-xs px-2 py-0.5' : ''} ${className}`}
    >
      {label}
    </Badge>
  );
}

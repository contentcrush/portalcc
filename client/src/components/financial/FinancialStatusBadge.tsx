import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Pause
} from "lucide-react";
import { isBefore } from "date-fns";

interface FinancialStatusBadgeProps {
  status: string;
  paid?: boolean;
  approved?: boolean;
  dueDate?: string | Date | null;
  type: "receivable" | "payable";
  className?: string;
}

export function FinancialStatusBadge({ 
  status, 
  paid, 
  approved, 
  dueDate, 
  type,
  className = "" 
}: FinancialStatusBadgeProps) {
  const now = new Date();
  const isOverdue = dueDate && !paid && isBefore(new Date(dueDate), now);
  
  // Para recebíveis (A Receber)
  if (type === "receivable") {
    if (paid) {
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 hover:bg-green-100 ${className}`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    }
    
    if (isOverdue) {
      return (
        <Badge variant="destructive" className={className}>
          <AlertCircle className="h-3 w-3 mr-1" />
          Vencida
        </Badge>
      );
    }
    
    if (status === 'pending') {
      return (
        <Badge variant="secondary" className={`bg-amber-100 text-amber-800 hover:bg-amber-100 ${className}`}>
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    }
    
    if (status === 'archived') {
      return (
        <Badge variant="outline" className={`bg-blue-50 text-blue-700 ${className}`}>
          <Pause className="h-3 w-3 mr-1" />
          Arquivada
        </Badge>
      );
    }
  }
  
  // Para pagáveis (A Pagar)
  if (type === "payable") {
    if (approved === true) {
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 hover:bg-green-100 ${className}`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Aprovada
        </Badge>
      );
    }
    
    if (approved === false) {
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1" />
          Rejeitada
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className={`bg-amber-100 text-amber-800 hover:bg-amber-100 ${className}`}>
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  }
  
  // Fallback
  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  );
}
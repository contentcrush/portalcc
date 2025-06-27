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
  
  // Para recebíveis (A Receber) - lógica simplificada e linguagem clara
  if (type === "receivable") {
    // 1. Pago = Verde (concluído com sucesso)
    if (paid) {
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 hover:bg-green-100 ${className}`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Recebido
        </Badge>
      );
    }
    
    // 2. Vencido = Vermelho (requer ação urgente)
    if (isOverdue) {
      return (
        <Badge variant="destructive" className={className}>
          <AlertCircle className="h-3 w-3 mr-1" />
          Em atraso
        </Badge>
      );
    }
    
    // 3. Pendente = Amarelo (aguardando, mas dentro do prazo)
    return (
      <Badge variant="secondary" className={`bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 ${className}`}>
        <Clock className="h-3 w-3 mr-1" />
        A receber
      </Badge>
    );
  }
  
  // Para pagáveis (A Pagar) - lógica simplificada e linguagem clara
  if (type === "payable") {
    // 1. Aprovada = Verde (pode ser paga)
    if (approved === true) {
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 hover:bg-green-100 ${className}`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Aprovada
        </Badge>
      );
    }
    
    // 2. Rejeitada = Vermelho (negada)
    if (approved === false) {
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="h-3 w-3 mr-1" />
          Negada
        </Badge>
      );
    }
    
    // 3. Aguardando = Azul (pendente de análise)
    return (
      <Badge variant="secondary" className={`bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 ${className}`}>
        <Clock className="h-3 w-3 mr-1" />
        Aguardando
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
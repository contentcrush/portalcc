import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { formatDateToLocal, formatDateTimeToLocal, formatDateTimeWithTZ } from '@/lib/date-utils';

interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: string;
  showTime?: boolean;
  showTooltip?: boolean;
  className?: string;
}

/**
 * Componente para exibição padronizada de datas com timezone consistente
 * 
 * Este componente formata as datas de acordo com o timezone do usuário
 * e opcionalmente exibe um tooltip com detalhes do timezone para maior clareza
 */
export const DateDisplay: React.FC<DateDisplayProps> = ({ 
  date, 
  format, 
  showTime = false, 
  showTooltip = false,
  className = ''
}) => {
  if (!date) return <span className={className}>-</span>;
  
  // Formatar de acordo com os parâmetros
  const formattedDate = showTime 
    ? formatDateTimeToLocal(date, format)
    : formatDateToLocal(date, format);
    
  // Obter versão completa para tooltip
  const fullFormattedDate = formatDateTimeWithTZ(date);
  
  // Se não precisar de tooltip, retornar apenas a data formatada
  if (!showTooltip) {
    return <span className={className}>{formattedDate}</span>;
  }
  
  // Com tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={`flex items-center ${className}`}>
          <span>{formattedDate}</span>
          <Info className="ml-1 h-3 w-3 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{fullFormattedDate}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Componente para exibição de datas em relatórios
 */
export const ReportDateDisplay: React.FC<DateDisplayProps> = ({ 
  date, 
  className = '' 
}) => {
  if (!date) return <span className={className}>-</span>;
  
  // Formatação específica para relatórios, sempre com timezone
  const formattedDate = formatDateTimeWithTZ(date, 'dd MMM yyyy, HH:mm (z)');
  
  return <span className={className}>{formattedDate}</span>;
};

/**
 * Componente para exibição do período entre duas datas (duração)
 */
export const DateRangeDisplay: React.FC<{
  startDate: string | Date | null | undefined;
  endDate: string | Date | null | undefined;
  className?: string;
}> = ({ startDate, endDate, className = '' }) => {
  if (!startDate || !endDate) return <span className={className}>-</span>;
  
  const start = formatDateToLocal(startDate);
  const end = formatDateToLocal(endDate);
  
  return (
    <div className={className}>
      <div className="flex items-center space-x-2">
        <span>De:</span> 
        <DateDisplay date={startDate} showTooltip />
      </div>
      <div className="flex items-center space-x-2">
        <span>Até:</span> 
        <DateDisplay date={endDate} showTooltip />
      </div>
    </div>
  );
};

export default DateDisplay;
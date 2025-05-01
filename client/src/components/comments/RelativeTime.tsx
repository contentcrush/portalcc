import { useState, useEffect } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RelativeTimeProps {
  date: Date | string | null;
  className?: string;
  useTooltip?: boolean;
}

export function RelativeTime({ 
  date, 
  className = "", 
  useTooltip = true 
}: RelativeTimeProps) {
  const [formattedDate, setFormattedDate] = useState("");
  const [relativeDateText, setRelativeDateText] = useState("");
  
  useEffect(() => {
    if (!date) {
      setFormattedDate("Data inválida");
      setRelativeDateText("Data inválida");
      return;
    }
    
    const dateObj = typeof date === "string" ? new Date(date) : date;
    
    // Formato completo para o tooltip ou texto quando não usar tooltip
    const fullFormat = format(dateObj, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    setFormattedDate(fullFormat);
    
    // Para o texto relativo mostrado por padrão
    if (isToday(dateObj)) {
      // Se for hoje, mostra "Hoje às HH:MM"
      setRelativeDateText(`Hoje às ${format(dateObj, "HH:mm")}`);
    } else if (isYesterday(dateObj)) {
      // Se for ontem, mostra "Ontem às HH:MM"
      setRelativeDateText(`Ontem às ${format(dateObj, "HH:mm")}`);
    } else {
      // Do contrário, usa o formatDistanceToNow para mostrar algo como "há 3 dias"
      const distance = formatDistanceToNow(dateObj, { locale: ptBR, addSuffix: true });
      setRelativeDateText(distance);
    }
  }, [date]);
  
  if (!date) return null;
  
  if (useTooltip) {
    return (
      <span title={formattedDate} className={`text-muted-foreground ${className}`}>
        {relativeDateText}
      </span>
    );
  }
  
  return (
    <span className={`text-muted-foreground ${className}`}>
      {formattedDate}
    </span>
  );
}
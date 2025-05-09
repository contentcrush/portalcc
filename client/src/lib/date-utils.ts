import { DateTime } from 'luxon';
import { parseISO, format as dateFormat } from 'date-fns';
import { formatInTimeZone, zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Obtém o timezone do navegador do usuário
export const getUserTimeZone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Converte uma data ISO para o formato de exibição específico do usuário
export const formatDateToLocal = (
  isoDate: string | Date | null | undefined,
  formatString: string = 'dd/MM/yyyy'
): string => {
  if (!isoDate) return '-';
  
  try {
    // Se for uma string ISO, converter para objeto Date
    const date = typeof isoDate === 'string' ? parseISO(isoDate) : isoDate;
    
    // Formatar usando o timezone do usuário
    const userTimeZone = getUserTimeZone();
    return formatInTimeZone(date, userTimeZone, formatString, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '-';
  }
};

// Formata data com hora para exibição local
export const formatDateTimeToLocal = (
  isoDate: string | Date | null | undefined,
  formatString: string = 'dd/MM/yyyy HH:mm'
): string => {
  return formatDateToLocal(isoDate, formatString);
};

// Formata data com hora e exibe o identificador de fuso horário
export const formatDateTimeWithTZ = (
  isoDate: string | Date | null | undefined,
  formatString: string = 'dd/MM/yyyy HH:mm (z)'
): string => {
  if (!isoDate) return '-';
  
  try {
    // Usar Luxon para formatação com timezone explícito
    const date = typeof isoDate === 'string' 
      ? DateTime.fromISO(isoDate) 
      : DateTime.fromJSDate(isoDate as Date);
    
    // Converter para o timezone do usuário e formatar
    return date.setZone(getUserTimeZone()).toFormat(formatString);
  } catch (error) {
    console.error('Erro ao formatar data com timezone:', error);
    return '-';
  }
};

// Retorna uma data ISO em UTC a partir de uma data local
export const localDateToUTC = (localDate: Date): string => {
  return zonedTimeToUtc(localDate, getUserTimeZone()).toISOString();
};

// Converte uma data UTC para o timezone do usuário
export const utcToLocalDate = (utcDate: string | Date): Date => {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return utcToZonedTime(date, getUserTimeZone());
};

// Formata duração entre duas datas
export const formatDateDifference = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string => {
  if (!startDate || !endDate) return '-';
  
  try {
    // Converter para objetos DateTime do Luxon
    const start = typeof startDate === 'string' 
      ? DateTime.fromISO(startDate) 
      : DateTime.fromJSDate(startDate as Date);
    
    const end = typeof endDate === 'string' 
      ? DateTime.fromISO(endDate) 
      : DateTime.fromJSDate(endDate as Date);
    
    // Calcular a diferença
    const diff = end.diff(start, ['days']).toObject();
    
    if (!diff.days) return '-';
    
    return diff.days === 1 
      ? '1 dia' 
      : `${Math.floor(diff.days)} dias`;
  } catch (error) {
    console.error('Erro ao calcular diferença entre datas:', error);
    return '-';
  }
};

// Retorna uma data formatada para exibição em relatórios, incluindo o fuso
export const formatDateForReport = (
  isoDate: string | Date | null | undefined
): string => {
  if (!isoDate) return '-';
  
  const date = typeof isoDate === 'string' ? parseISO(isoDate) : isoDate;
  
  // Formatar com nome do mês abreviado e incluir GMT
  const userTZ = getUserTimeZone();
  const format = 'dd MMM yyyy, HH:mm';
  
  try {
    const formatted = formatInTimeZone(date, userTZ, format, { locale: ptBR });
    
    // Adicionar GMT ou fuso específico para maior clareza
    const tzOffset = DateTime.fromJSDate(
      typeof isoDate === 'string' ? parseISO(isoDate) : isoDate
    ).setZone(userTZ).toFormat('ZZZZ');
    
    return `${formatted} (${tzOffset})`;
  } catch (error) {
    console.error('Erro ao formatar data para relatório:', error);
    return '-';
  }
};

// Converte uma string de data no formato brasileiro (DD/MM/YYYY) para ISO UTC
export const brDateStringToISOUTC = (dateString: string): string | null => {
  if (!dateString || !dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return null;
  }
  
  try {
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    const [day, month, year] = dateString.split('/');
    const isoLocal = `${year}-${month}-${day}T00:00:00.000`;
    
    // Converter para UTC
    return DateTime.fromISO(isoLocal, { zone: getUserTimeZone() })
      .toUTC()
      .toISO();
  } catch (error) {
    console.error('Erro ao converter data brasileira para ISO UTC:', error);
    return null;
  }
};

// Função para verificar se uma data está no passado (considerando apenas a data, não a hora)
export const isDateInPast = (isoDate: string | Date | null | undefined): boolean => {
  if (!isoDate) return false;
  
  try {
    const date = typeof isoDate === 'string' ? parseISO(isoDate) : isoDate;
    const today = new Date();
    
    // Resetar as horas para comparar apenas as datas
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    return compareDate < today;
  } catch (error) {
    console.error('Erro ao verificar se data está no passado:', error);
    return false;
  }
};
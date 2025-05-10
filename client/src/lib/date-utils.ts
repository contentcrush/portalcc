import { parseISO, format as dateFormat, addDays, subDays, differenceInDays, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone, toZonedTime, getTimezoneOffset } from 'date-fns-tz';
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
    const date = typeof isoDate === 'string' ? parseISO(isoDate) : isoDate;
    const userTimeZone = getUserTimeZone();
    
    // Formatar usando date-fns-tz formatInTimeZone
    return formatInTimeZone(date, userTimeZone, formatString, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data com timezone:', error);
    return '-';
  }
};

// Retorna uma data ISO em UTC a partir de uma data local
export const localDateToUTC = (localDate: Date): string => {
  const userTZ = getUserTimeZone();
  const tzOffset = getTimezoneOffset(userTZ); // Em minutos
  
  // Ajustar para UTC (subtraindo o offset, que já tem o sinal correto)
  const utcDate = new Date(localDate.getTime() - tzOffset);
  
  return utcDate.toISOString();
};

// Converte uma data UTC para o timezone do usuário
export const utcToLocalDate = (utcDate: string | Date): Date => {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  // Converter para o timezone do usuário usando date-fns-tz
  return toZonedTime(date, getUserTimeZone());
};

// Formata duração entre duas datas
export const formatDateDifference = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string => {
  if (!startDate || !endDate) return '-';
  
  try {
    // Converter para objetos Date
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    // Calcular a diferença em dias
    const diffDays = differenceInDays(end, start);
    
    return diffDays === 1 
      ? '1 dia' 
      : `${diffDays} dias`;
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
  
  // Formatar com nome do mês abreviado e incluir timezone
  const userTZ = getUserTimeZone();
  const format = 'dd MMM yyyy, HH:mm (z)';
  
  try {
    // formatInTimeZone já formata o timezone adequadamente
    return formatInTimeZone(date, userTZ, format, { locale: ptBR });
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
    
    // Criar um objeto Date com o horário definido para o fim do dia no fuso local
    const localDate = new Date(`${year}-${month}-${day}T23:59:59.999`);
    
    // Converter para UTC usando a função que já temos
    return localDateToUTC(localDate);
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
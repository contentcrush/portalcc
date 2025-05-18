import { 
  parseISO, 
  isValid, 
  format,
  addDays,
  isEqual,
  startOfDay
} from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

/**
 * Função para padronizar datas para UTC com hora fixa (meio-dia)
 * Garante consistência no armazenamento de datas sem problemas de fuso horário
 */
export function standardizeToUTC(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    // Converter para objeto Date se for string
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (!isValid(dateObj)) return null;
    
    // Padronizar para meio-dia em UTC para evitar problemas de fuso horário
    // Meio-dia é escolhido para garantir que a data seja a mesma em todos os fusos
    const standardizedDate = new Date(
      Date.UTC(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        12, 0, 0
      )
    );
    
    return standardizedDate;
  } catch (error) {
    console.error("Erro ao padronizar data para UTC:", error);
    return null;
  }
}

/**
 * Formata uma data para exibição ao usuário no formato DD/MM/YYYY
 * Considera o fuso horário do usuário para exibição correta
 */
export function formatDateForDisplay(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  try {
    // Timezone do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (!isValid(dateObj)) return "";
    
    // Formatar data no timezone do usuário
    return formatInTimeZone(dateObj, userTz, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data para exibição:", error);
    return "";
  }
}

/**
 * Calcula a data de vencimento com base na data de emissão e prazo de pagamento
 * @param issueDate Data de emissão 
 * @param paymentTerm Prazo de pagamento em dias
 * @returns Data de vencimento calculada ou null se dados inválidos
 */
export function calculateDueDate(issueDate: Date | string | null | undefined, paymentTerm: number | null | undefined): Date | null {
  if (!issueDate || !paymentTerm) return null;
  
  try {
    // Padronizar a data de emissão
    const standardizedIssueDate = standardizeToUTC(issueDate);
    if (!standardizedIssueDate) return null;
    
    // Calcular a data de vencimento adicionando os dias do prazo
    const dueDate = addDays(standardizedIssueDate, paymentTerm);
    
    return dueDate;
  } catch (error) {
    console.error("Erro ao calcular data de vencimento:", error);
    return null;
  }
}

/**
 * Verifica se uma data foi alterada comparando duas datas
 * Ignora diferenças de milissegundos e fuso horário, compara apenas ano, mês e dia
 * @param date1 Primeira data a comparar
 * @param date2 Segunda data a comparar
 * @returns true se as datas são diferentes, false se são iguais ou inválidas
 */
export function hasDateChanged(date1: Date | string | null | undefined, date2: Date | string | null | undefined): boolean {
  // Se ambas forem null/undefined, não houve alteração
  if (!date1 && !date2) return false;
  
  // Se uma é null e a outra não, houve alteração
  if (!date1 || !date2) return true;
  
  try {
    // Converter para objeto Date
    const dateObj1 = typeof date1 === "string" ? parseISO(date1) : date1;
    const dateObj2 = typeof date2 === "string" ? parseISO(date2) : date2;
    
    // Verificar se ambas são válidas
    if (!isValid(dateObj1) || !isValid(dateObj2)) return true;
    
    // Normalizar para início do dia para comparação
    const day1 = startOfDay(dateObj1);
    const day2 = startOfDay(dateObj2);
    
    // Comparar se são o mesmo dia
    return !isEqual(day1, day2);
  } catch (error) {
    console.error("Erro ao comparar datas:", error);
    return true; // Em caso de erro, considerar como alterada
  }
}

/**
 * Formata a diferença de prazo em dias para exibição amigável ao usuário
 * @param dueDate Data de vencimento
 * @param issueDate Data de referência (geralmente a emissão)
 * @returns String formatada (exemplo: "30 dias (vence em 01/06/2025)")
 */
export function formatPaymentTermDisplay(dueDate: Date | string | null | undefined, issueDate: Date | string | null | undefined): string {
  if (!dueDate || !issueDate) return "";
  
  try {
    const dueDateObj = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
    const issueDateObj = typeof issueDate === "string" ? parseISO(issueDate) : issueDate;
    
    if (!isValid(dueDateObj) || !isValid(issueDateObj)) return "";
    
    // Calcular diferença em dias
    const daysUntil = Math.round((dueDateObj.getTime() - issueDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // Formatar data de vencimento
    const formattedDueDate = formatDateForDisplay(dueDateObj);
    
    return `${daysUntil} dias (vence em ${formattedDueDate})`;
  } catch (error) {
    console.error("Erro ao formatar prazo de pagamento:", error);
    return "";
  }
}

/**
 * Cria um objeto com todas as datas padronizadas para serem usadas em um projeto
 * @param startDate Data de início
 * @param endDate Data de conclusão
 * @param issueDate Data de emissão
 * @param paymentTerm Prazo de pagamento (em dias)
 * @returns Objeto com todas as datas padronizadas
 */
export function standardizeProjectDates(startDate: Date | string | null | undefined, 
                                       endDate: Date | string | null | undefined,
                                       issueDate: Date | string | null | undefined,
                                       paymentTerm: number | null | undefined) {
  // Padronizar datas de início e fim
  const standardizedStartDate = standardizeToUTC(startDate);
  const standardizedEndDate = standardizeToUTC(endDate);
  
  // Padronizar data de emissão
  const standardizedIssueDate = standardizeToUTC(issueDate);
  
  // Calcular data de vencimento baseada na data de emissão e prazo
  let standardizedDueDate = null;
  if (standardizedIssueDate && paymentTerm) {
    standardizedDueDate = calculateDueDate(standardizedIssueDate, paymentTerm);
  }
  
  return {
    startDate: standardizedStartDate,
    endDate: standardizedEndDate,
    issueDate: standardizedIssueDate,
    dueDate: standardizedDueDate,
    paymentTerm
  };
}
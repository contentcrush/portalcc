import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastActionElement } from "@/components/ui/toast";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  format, 
  parseISO, 
  isValid, 
  isToday, 
  isTomorrow, 
  differenceInCalendarDays, 
  startOfDay,
  addDays,
  endOfDay,
  differenceInDays
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { 
  ProjectStatus, ProjectStageStatus, ProjectSpecialStatus,
  TaskStatus, TaskPriority, InteractionType, DocumentType, 
  StatusColors, isProjectStage, isProjectSpecialStatus 
} from "./types";
import { 
  Project, Client, Task 
} from "@shared/schema";
import { 
  TASK_PRIORITY_WEIGHTS, 
  TASK_STATUS_WEIGHTS 
} from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Função para determinar o ícone pelo tipo de arquivo
export function getFileTypeIcon(fileType: string | null | undefined) {
  if (!fileType) return 'file';
  
  // Normaliza o tipo do arquivo para minúsculas
  const type = fileType.toLowerCase();
  
  // Documentos
  if (type.includes('pdf')) return 'file-text';
  if (type.includes('doc') || type.includes('word') || type.includes('rtf') || type.includes('txt')) return 'file-text';
  
  // Planilhas
  if (type.includes('xls') || type.includes('sheet') || type.includes('csv')) return 'file-spreadsheet';
  
  // Apresentações
  if (type.includes('ppt') || type.includes('presentation')) return 'file-presentation';
  
  // Imagens
  if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || 
      type.includes('png') || type.includes('gif') || type.includes('svg') || 
      type.includes('webp')) return 'image';
  
  // Áudio
  if (type.includes('audio') || type.includes('mp3') || type.includes('wav') || 
      type.includes('ogg') || type.includes('flac')) return 'file-audio';
  
  // Vídeo
  if (type.includes('video') || type.includes('mp4') || type.includes('avi') || 
      type.includes('mov') || type.includes('webm')) return 'file-video';
  
  // Compactados
  if (type.includes('zip') || type.includes('rar') || type.includes('tar') || 
      type.includes('gz') || type.includes('7z')) return 'file-archive';
      
  // Código
  if (type.includes('html') || type.includes('css') || type.includes('js') || 
      type.includes('json') || type.includes('xml') || type.includes('php') || 
      type.includes('java') || type.includes('py')) return 'file-code';
  
  // Padrão
  return 'file';
}

// Função getInitials foi movida para baixo no arquivo

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
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
    console.error("Erro ao formatar data:", error, date);
    return "";
  }
}

/**
 * Formata uma data com horário (analisa o timestamp para detectar se tem hora específica)
 * @param date A data (Date ou string ISO)
 * @returns Data formatada com o horário se disponível
 */
export function formatDateWithTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  try {
    // Timezone do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (!isValid(dateObj)) return "";
    
    // Verificar se a data tem um horário específico (diferente de 23:59:59)
    const hasSpecificTime = dateObj && (
      dateObj.getUTCHours() !== 23 || 
      dateObj.getUTCMinutes() !== 59 || 
      dateObj.getUTCSeconds() !== 59
    );
    
    // Formatar data com ou sem horário dependendo se tem horário específico
    if (hasSpecificTime) {
      return formatInTimeZone(dateObj, userTz, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } else {
      return formatInTimeZone(dateObj, userTz, "dd/MM/yyyy", { locale: ptBR });
    }
  } catch (error) {
    console.error("Erro ao formatar data com horário:", error, date);
    return "";
  }
}

// Importações necessárias para formatação de datas
import { formatDateToLocal } from './date-utils';

// Formata a data no formato natural "Vence em X dias (DD/MM/YYYY)"
export function formatDueDateWithDaysRemaining(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  try {
    // Obter o timezone do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    // Converter para o timezone do usuário
    const localDate = toZonedTime(dateObj, userTz);
    
    // Remover hora/minuto/segundo para comparação de dias
    const dueDate = startOfDay(localDate);
    const today = startOfDay(new Date());
    
    // Calcular diferença em dias
    const diffDays = differenceInCalendarDays(dueDate, today);
    
    // Formatação da data para exibição (DD/MM/YYYY)
    const formattedDate = formatInTimeZone(localDate, userTz, "dd/MM/yyyy", { locale: ptBR });
    
    if (diffDays < 0) {
      return `Atrasada em ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dia' : 'dias'} (${formattedDate})`;
    } else if (diffDays === 0) {
      return `Vence hoje (${formattedDate})`;
    } else if (diffDays === 1) {
      return `Vence amanhã (${formattedDate})`;
    } else {
      return `Vence em ${diffDays} dias (${formattedDate})`;
    }
  } catch (error) {
    console.error("Erro ao formatar data de vencimento:", error, date);
    return "Data inválida";
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  try {
    // Timezone do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (!isValid(dateObj)) return "";
    
    // Verificar se a data tem um horário específico (diferente de 23:59:59)
    const hasSpecificTime = dateObj && (
      dateObj.getUTCHours() !== 23 || 
      dateObj.getUTCMinutes() !== 59 || 
      dateObj.getUTCSeconds() !== 59
    );
    
    // Formatar com ou sem horário dependendo se tem horário específico
    if (hasSpecificTime) {
      return formatInTimeZone(dateObj, userTz, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } else {
      return formatInTimeZone(dateObj, userTz, "dd/MM/yyyy", { locale: ptBR });
    }
  } catch (error) {
    console.error("Erro ao formatar data e hora:", error, date);
    return "";
  }
}

export function getRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  try {
    // Timezone do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    
    if (!isValid(dateObj)) return "";
    
    // Converter para o timezone do usuário para comparações corretas
    const localDate = toZonedTime(dateObj, userTz);
    
    // Verificar se é hoje ou amanhã no timezone do usuário
    if (isToday(localDate)) {
      return `Hoje, ${formatInTimeZone(localDate, userTz, "HH:mm", { locale: ptBR })}`;
    }
    
    if (isTomorrow(localDate)) {
      return `Amanhã, ${formatInTimeZone(localDate, userTz, "HH:mm", { locale: ptBR })}`;
    }
    
    // Formato padrão para outras datas
    return formatInTimeZone(localDate, userTz, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error("Erro ao formatar data relativa:", error, date);
    return "";
  }
}

/**
 * Obtém as iniciais do nome de uma pessoa
 * @param name Nome completo
 * @param length Número de letras a retornar (padrão: 2)
 * @returns Iniciais do nome (ex: "João Silva" => "JS")
 */
export function getInitials(name?: string | null, length: number = 2): string {
  if (!name) return '??';
  
  const nameParts = name.trim().split(/\s+/);
  let initials = nameParts[0].charAt(0).toUpperCase();
  
  // Se tiver mais partes no nome e quisermos pelo menos 2 iniciais
  if (nameParts.length > 1 && length >= 2) {
    // Obter a inicial do último nome
    initials += nameParts[nameParts.length - 1].charAt(0).toUpperCase();
  }
  
  return initials;
}

export function generateAvatarColor(name: string): string {
  if (!name) return "#5046E5"; // Default to primary color
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate HSL color with high saturation and limited lightness range for readability
  const h = hash % 360;
  const s = 65 + (hash % 20); // 65-85% saturation
  const l = 45 + (hash % 15); // 45-60% lightness
  
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function getStatusColor(status: ProjectStatus | TaskStatus | TaskPriority | null | undefined): string {
  if (!status) return "#6b7280"; // cinza padrão
  
  // Para status de tarefas
  if (status === "pendente") return "#f97316"; // laranja
  if (status === "em_andamento") return "#3b82f6"; // azul
  if (status === "concluida") return "#10b981"; // verde
  if (status === "bloqueada") return "#ef4444"; // vermelho
  if (status === "cancelada") return "#6b7280"; // cinza
  
  // Para prioridades de tarefas
  if (status === "baixa") return "#a3e635"; // verde claro
  if (status === "media") return "#facc15"; // amarelo
  if (status === "alta") return "#f43f5e"; // vermelho rosado
  if (status === "critica") return "#7c3aed"; // roxo
  
  // Fallback para outras cores em StatusColors 
  return StatusColors[status] || "#6b7280";
}

/**
 * Calcula o percentual de progresso de um projeto com base no status
 * Segue as regras específicas para cada etapa e status especial
 * 
 * @param project - Objeto do projeto contendo status, budget e outras informações
 * @returns Objeto contendo percentual e informações visuais para a barra de progresso
 */
export function calculateProjectProgress(project: Project): {
  percent: number;
  color: string;
  label: string;
  stagesCompleted: number;
  totalStages: number;
  visualState: 'normal' | 'paused' | 'delayed' | 'cancelled';
} {
  if (!project) {
    return {
      percent: 0,
      color: 'bg-gray-200',
      label: '0%',
      stagesCompleted: 0,
      totalStages: 6,
      visualState: 'normal'
    };
  }
  
  // Status normalizado
  const { stageStatus, specialStatus } = getNormalizedProjectStatus(project);
  
  // Variáveis de retorno
  let percent = 0;
  let color = 'bg-gray-200';
  let visualState: 'normal' | 'paused' | 'delayed' | 'cancelled' = 'normal';
  
  // Total de etapas
  const totalStages = 6; // Proposta, Pré-Produção, Produção, Pós-Revisão, Entregue/Aprovado, Concluído
  
  // Contar etapas concluídas com base no status
  let stagesCompleted = 0;
  
  // Determinar o percentual base com base no status do projeto
  switch (stageStatus) {
    case 'proposta':
      // 0% ao criar o job; vira 10% quando o orçamento é enviado ao cliente
      percent = project.budget ? 10 : 0;
      stagesCompleted = project.budget ? 1 : 0;
      break;
    case 'pre_producao':
      // Avança a 30% quando roteiro, cronograma e equipe são fechados
      percent = 30;
      stagesCompleted = 2;
      break;
    case 'producao':
      // Início da captação = 50%; fim da filmagem = 70%
      percent = project.stage_dates?.production_end ? 70 : 50;
      stagesCompleted = 2;
      break;
    case 'pos_revisao':
      // Rough-cut aprovado = 80%; aprovação final = 90%
      percent = project.stage_dates?.final_approval ? 90 : 80;
      stagesCompleted = 3;
      break;
    case 'entregue':
      // Arquivos finais enviados / publicações concluídas
      percent = 95;
      stagesCompleted = 4;
      break;
    case 'concluido':
      // Pagamento compensado e job arquivado
      percent = 100;
      stagesCompleted = 6;
      break;
    default:
      percent = 0;
      stagesCompleted = 0;
  }
  
  // Aplicar regras visuais para status especiais
  if (specialStatus) {
    switch (specialStatus) {
      case 'atrasado':
        color = 'bg-rose-500';
        visualState = 'delayed';
        // Mantém o percentual, mas altera visual
        break;
      case 'pausado':
        color = 'bg-gray-400';
        visualState = 'paused';
        // Mantém o percentual, mas altera visual
        break;
      case 'cancelado':
        color = 'bg-gray-300';
        visualState = 'cancelled';
        // Mantém o percentual, mas altera visual
        break;
    }
  } else {
    // Coloração baseada no percentual para projetos normais
    if (percent === 100) {
      color = 'bg-green-500';
    } else if (percent >= 70) {
      color = 'bg-blue-500';
    } else if (percent >= 30) {
      color = 'bg-yellow-500';
    } else if (percent > 0) {
      color = 'bg-indigo-500';
    }
  }
  
  // Formatação da label
  const label = `${percent}%`;
  
  return {
    percent,
    color,
    label,
    stagesCompleted,
    totalStages,
    visualState
  };
}

export function calculateDaysRemaining(endDate: Date | string | null | undefined): number {
  if (!endDate) return 0;
  
  try {
    // Obter o timezone do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof endDate === "string" ? parseISO(endDate) : endDate;
    
    // Converter para o timezone do usuário e remover o componente de hora
    const targetDate = startOfDay(toZonedTime(dateObj, userTz));
    const today = startOfDay(new Date());
    
    // Calcular diferença em dias
    return differenceInCalendarDays(targetDate, today);
  } catch (error) {
    console.error("Erro ao calcular dias restantes:", error, endDate);
    return 0;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function getInteractionIcon(type: InteractionType): string {
  switch (type) {
    case "reuniao": return "video";
    case "email": return "mail";
    case "feedback": return "message-square";
    case "documento": return "file-text";
    case "telefonema": return "phone";
    default: return "message-circle";
  }
}

export function getDocumentIcon(type: DocumentType): string {
  switch (type) {
    case "invoice": return "file-text";
    case "contract": return "file-contract";
    case "proposal": return "file-plus";
    case "receipt": return "receipt";
    default: return "file";
  }
}

export function getFileIconByType(fileType: string): string {
  if (!fileType) return "file";
  
  if (fileType.includes("pdf")) return "file-text";
  if (fileType.includes("image") || fileType.includes("jpg") || fileType.includes("png")) return "image";
  if (fileType.includes("video")) return "video";
  if (fileType.includes("audio")) return "music";
  if (fileType.includes("zip") || fileType.includes("rar")) return "archive";
  if (fileType.includes("excel") || fileType.includes("sheet")) return "table";
  if (fileType.includes("word") || fileType.includes("document")) return "file-text";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "presentation";
  
  return "file";
}

export function formatFileSize(sizeInBytes: number | null | undefined): string {
  if (sizeInBytes === null || sizeInBytes === undefined) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = sizeInBytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function findClientById(clients: Client[], id: number): Client | undefined {
  return clients.find(client => client.id === id);
}

export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function getMonthName(monthNumber: number): string {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return format(date, "MMM", { locale: ptBR });
}

/**
 * Função global para processar o status de um projeto.
 * Verifica se o projeto possui data de entrega no futuro, mesmo que o status esteja "atrasado"
 * e retorna o status apropriado para exibição.
 * 
 * @param project O objeto do projeto
 * @returns Um objeto contendo o status de etapa e status especial (se houver)
 */
export function getNormalizedProjectStatus(project: Project | undefined | null): {
  stageStatus: ProjectStageStatus;
  specialStatus: ProjectSpecialStatus | null;
} {
  if (!project) {
    // Valor padrão caso não exista projeto
    return { stageStatus: 'producao', specialStatus: null };
  }
  
  const today = new Date();
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const status = project.status || 'producao';
  
  // Se o status atual é atrasado, mantemos esse status especial independentemente da data
  if (status === 'atrasado') {
    // Determinar o status subjacente (etapa) para o projeto atrasado
    const underlyingStatus = project.underlying_status || project.original_status || 'producao';
    // Verificamos se o underlyingStatus é uma etapa válida
    if (isProjectStage(underlyingStatus)) {
      return { stageStatus: underlyingStatus, specialStatus: 'atrasado' };
    } else {
      return { stageStatus: 'producao', specialStatus: 'atrasado' };
    }
  }
  
  // Verificar proativamente se o projeto está atrasado
  if (isProjectStage(status) && endDate && endDate < today) {
    // O projeto está atrasado mas ainda não foi marcado como tal
    return { stageStatus: status, specialStatus: 'atrasado' };
  }
  
  // Verificamos se o status atual é uma etapa ou especial
  if (isProjectStage(status)) {
    return { stageStatus: status, specialStatus: null };
  } else if (isProjectSpecialStatus(status)) {
    // Para status especiais, usamos a variável stage_history para determinar a última etapa
    if (project.stage_history) {
      try {
        const history = JSON.parse(project.stage_history);
        // Procurar a última etapa válida no histórico
        const stages: ProjectStageStatus[] = ['proposta', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'];
        for (let i = stages.length - 1; i >= 0; i--) {
          const stage = stages[i];
          if (history[stage]) {
            return { stageStatus: stage, specialStatus: status as ProjectSpecialStatus };
          }
        }
      } catch (e) {
        console.error('Erro ao processar histórico de estágios:', e);
      }
    }
    
    // Se não encontrar histórico ou ocorrer erro, retorna etapa padrão
    return { stageStatus: 'producao', specialStatus: status as ProjectSpecialStatus };
  }
  
  // Verificar novamente se está atrasado
  if (endDate && endDate < today) {
    return { stageStatus: 'producao', specialStatus: 'atrasado' };
  }
  
  // Caso não seja reconhecido, volta para o status padrão
  return { stageStatus: 'producao', specialStatus: null };
}

/**
 * Verifica se um projeto tem um status especial (atrasado, pausado, cancelado)
 * mas deve ter suas etapas de produção interativas.
 * 
 * @param project O objeto do projeto
 * @returns Se o projeto tem status especial mas etapas interativas
 */
export function hasInteractiveStages(project: Project | undefined | null): boolean {
  if (!project) return false;
  
  const { specialStatus } = getNormalizedProjectStatus(project);
  // Se tiver um status especial, as etapas devem estar interativas
  return specialStatus !== null;
}

export function calculateTaskDaysOverdue(task: Task): number {
  if (!task.due_date || task.completed) return 0;
  
  try {
    // Usar o fuso horário do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof task.due_date === 'string' 
      ? parseISO(task.due_date) 
      : task.due_date as Date;
    
    if (!isValid(dateObj)) return 0;
    
    // Converter para o timezone do usuário
    const localDueDate = toZonedTime(dateObj, userTz);
    
    // Início do dia para comparação correta
    const dueDateStartOfDay = startOfDay(localDueDate);
    const todayStartOfDay = startOfDay(new Date());
    
    // Se ainda não está atrasada, retornar 0
    if (dueDateStartOfDay > todayStartOfDay) return 0;
    
    // Calcular a diferença em dias
    return Math.abs(differenceInCalendarDays(dueDateStartOfDay, todayStartOfDay));
  } catch (error) {
    console.error("Erro ao calcular dias de atraso:", error);
    return 0;
  }
}

export function isTaskOverdue(task: Task): boolean {
  return calculateTaskDaysOverdue(task) > 0;
}

export function isTaskDueSoon(task: Task, days: number = 2): boolean {
  if (!task.due_date || task.completed) return false;
  
  try {
    // Usar o fuso horário do usuário
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Converter para objeto Date
    const dateObj = typeof task.due_date === 'string' 
      ? parseISO(task.due_date) 
      : task.due_date as Date;
    
    if (!isValid(dateObj)) return false;
    
    // Converter para o timezone do usuário
    const localDueDate = toZonedTime(dateObj, userTz);
    
    // Início do dia para comparação correta
    const dueDateStartOfDay = startOfDay(localDueDate);
    const todayStartOfDay = startOfDay(new Date());
    
    // Se já está atrasada, não é "em breve", já é atrasada
    if (dueDateStartOfDay < todayStartOfDay) return false;
    
    // Calcular a diferença em dias
    const diffDays = differenceInCalendarDays(dueDateStartOfDay, todayStartOfDay);
    
    return diffDays <= days;
  } catch (error) {
    console.error("Erro ao verificar se tarefa vence em breve:", error);
    return false;
  }
}

/**
 * Calcula um score de prioridade para uma tarefa com base em múltiplos fatores
 * - Data de vencimento (vencidas > prestes a vencer > futuras) - MAIOR PESO
 * - Prioridade explícita (alta, média, baixa)
 * - Status (bloqueada > pendente > em andamento > concluída)
 * - Data de início (tarefas que já deviam ter começado > futuras)
 */
export function calculateTaskPriorityScore(task: Task): number {
  if (!task) return 0;
  
  // Começamos com pontuação base
  let score = 0;
  
  // Peso da data de vencimento - MAIOR PESO AGORA (até 150 pontos)
  // Tarefas atrasadas ganham pontos extras
  const overdueWeight = Math.min(calculateTaskDaysOverdue(task) * 15, 150);
  score += overdueWeight;
  
  // Adicionar pontos para tarefas prestes a vencer (até 100 pontos extras)
  if (isTaskDueSoon(task, 5)) {
    const daysUntilDue = calculateDaysRemaining(task.due_date);
    // Quanto mais próximo do vencimento, mais pontos
    const urgencyWeight = (5 - daysUntilDue) * 20; // 20, 40, 60, 80 ou 100 pontos
    score += urgencyWeight;
  } else if (task.due_date) {
    // Para tarefas com data de vencimento no futuro, menor pontuação baseada na proximidade
    const daysRemaining = calculateDaysRemaining(task.due_date);
    if (daysRemaining > 0) {
      // Quanto menor o número de dias restantes, maior a pontuação (inversa)
      const daysScore = Math.max(100 - (daysRemaining * 2), 0);
      score += daysScore;
    }
  }
  
  // Peso da prioridade (0-40 pontos) - Aumentado para equilibrar com data
  const priorityWeight = task.priority 
    ? TASK_PRIORITY_WEIGHTS[task.priority] || 0 
    : TASK_PRIORITY_WEIGHTS.media; // padrão para média
  
  // Peso do status (0-40 pontos) - Reduzido de importância
  const statusWeight = task.status
    ? Math.floor(TASK_STATUS_WEIGHTS[task.status] * 0.5) || 0 // 50% do original
    : Math.floor(TASK_STATUS_WEIGHTS.pendente * 0.5); // 50% do original
  
  score += priorityWeight + statusWeight;
  
  // Se for uma tarefa completada, reduzir muito a prioridade
  if (task.completed) {
    score = Math.floor(score * 0.1); // Apenas 10% do score original
  }
  
  return score;
}

/**
 * Compara duas tarefas para ordenação baseada em prioridade inteligente
 */
export function sortTasksByPriority(a: Task, b: Task): number {
  const scoreA = calculateTaskPriorityScore(a);
  const scoreB = calculateTaskPriorityScore(b);
  
  return scoreB - scoreA; // Ordem decrescente
}

/**
 * Retorna uma função de ordenação que combina múltiplos critérios 
 * para organizar tarefas de acordo com prioridade, vencimento e status
 */
export function getTaskSortFunction(): (a: Task, b: Task) => number {
  return (a: Task, b: Task) => {
    try {
      // Timezone do usuário para comparações de data
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Primeiro critério: tarefas concluídas vão para o fim (dividimos a lista em duas partes)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // Segundo critério: se ambas tarefas têm a mesma prioridade, ordenamos diretamente pela data
      if (a.priority === b.priority && a.due_date && b.due_date) {
        // Converter para objeto Date
        const dateObjA = typeof a.due_date === 'string' 
          ? parseISO(a.due_date) 
          : a.due_date as Date;
          
        const dateObjB = typeof b.due_date === 'string' 
          ? parseISO(b.due_date) 
          : b.due_date as Date;
        
        // Converter para o timezone do usuário
        const dateA = startOfDay(toZonedTime(dateObjA, userTz));
        const dateB = startOfDay(toZonedTime(dateObjB, userTz));
        
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
    }
    
      // Verificamos diretamente a data de vencimento para tarefas próximas do vencimento, 
      // independente da prioridade, dando prioridade às tarefas vencidas ou prestes a vencer
      if (a.due_date && b.due_date) {
        // Converter para objeto Date
        const dateObjA = typeof a.due_date === 'string' 
          ? parseISO(a.due_date) 
          : a.due_date as Date;
          
        const dateObjB = typeof b.due_date === 'string' 
          ? parseISO(b.due_date) 
          : b.due_date as Date;
        
        // Converter para o timezone do usuário
        const dateA = startOfDay(toZonedTime(dateObjA, userTz));
        const dateB = startOfDay(toZonedTime(dateObjB, userTz));
        const today = startOfDay(new Date());
        
        // Se uma tarefa está vencida e a outra não, a vencida tem prioridade
        const aIsOverdue = dateA < today;
        const bIsOverdue = dateB < today;
        
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;
        
        // Se ambas estão vencidas, a que venceu primeiro tem prioridade
        if (aIsOverdue && bIsOverdue) {
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
        }
      }
      
      // Terceiro critério: aplicamos o cálculo de score para ordenar o restante
      return sortTasksByPriority(a, b);
    } catch (error) {
      console.error("Erro ao ordenar tarefas:", error);
      return 0;
    }
  };
}

/**
 * Função para obter a classe CSS correta para o badge de prioridade
 */
export function getPriorityBadgeClasses(priority: TaskPriority): string {
  switch (priority) {
    case 'critica':
      return 'bg-purple-100 text-purple-800 border-purple-300 font-medium';
    case 'alta':
      return 'bg-rose-100 text-rose-800 border-rose-300 font-medium';
    case 'media': 
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'baixa':
      return 'bg-lime-100 text-lime-800 border-lime-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Função para obter a classe CSS correta para o badge de status
 */
export function getStatusBadgeClasses(status: TaskStatus): string {
  switch (status) {
    case 'bloqueada':
      return 'bg-red-100 text-red-800 border-red-300 font-medium';
    case 'pendente':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'em_andamento': 
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'concluida':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'cancelada':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Formata o nome da função da equipe (team role) para exibição
 */
export function formatTeamRole(role: string): string {
  if (!role) return "";
  
  const roleMap: Record<string, string> = {
    // Valores do backend
    'coordenacao': 'Coordenação',
    'producao': 'Produção',
    'creator': 'Creator',
    'editor_mobile': 'Editor Mobile',
    'motion': 'Motion',
    'direcao_arte': 'Direção de Arte',
    'redacao': 'Redação',
    'estrategista': 'Estrategista de Conteúdo',
    'direcao_foto': 'Direção de Foto',
    'assistente_foto': 'Assistente de Foto',
    'culinarista': 'Culinarista',
    'apresentadora': 'Apresentadora',
    
    // Valores legados (para compatibilidade)
    'coordenador': 'Coordenação',
    'designer': 'Direção de Arte',
    'desenvolvedor': 'Creator',
    'analista': 'Estrategista de Conteúdo',
    'revisor': 'Redação',
    'membro': 'Membro Regular'
  };
  
  return roleMap[role] || role;
}

/**
 * Retorna a classe CSS para a cor da barra de progresso com base no valor do progresso
 * Verde para progresso >= 80%
 * Amarelo para progresso entre 50% e 80%
 * Vermelho para progresso < 50%
 */
export function getProgressBarColor(progress: number): string {
  if (progress >= 80) {
    return 'bg-green-600'; // verde para alto progresso
  } else if (progress >= 50) {
    return 'bg-yellow-500'; // amarelo para progresso médio
  } else {
    return 'bg-red-500'; // vermelho para progresso baixo
  }
}

type ToastParams = {
  title: string;
  description?: string | React.ReactNode;
  action?: ToastActionElement;
  duration?: number;
};

/**
 * Função utilitária para criar e exibir toasts de sucesso com estilo padrão
 * Usa a variante 'success' com fundo verde claro em todo o sistema
 * 
 * @param params Objeto contendo título, descrição, ação opcional e duração do toast
 */
export function showSuccessToast({ title, description, action, duration = 3000 }: ToastParams) {
  toast({
    title,
    description,
    action,
    variant: "success" as const,
    duration,
  });
}

/**
 * Função utilitária para criar toasts de sucesso com estilo padrão
 * Usa a variante 'success' com fundo verde claro em todo o sistema
 * 
 * @param params Objeto contendo título, descrição e ação opcional do toast
 * @returns Objeto de configuração do toast com a variante success aplicada
 */
export function createSuccessToast({ title, description, action }: ToastParams) {
  return {
    title,
    description,
    action,
    variant: "success" as const,
  };
}

/**
 * Variantes de animação para diferentes propósitos de UI
 * Pode ser usado com framer-motion para adicionar animações consistentes
 */
export const animations = {
  // Animação para itens sendo adicionados a uma lista
  itemAdded: {
    initial: { opacity: 0, scale: 0.8, height: 0 },
    animate: { opacity: 1, scale: 1, height: "auto" },
    exit: { opacity: 0, scale: 0.8, height: 0 },
    transition: { type: "spring", damping: 15, stiffness: 300 }
  },
  
  // Animação para itens sendo removidos de uma lista
  itemRemoved: {
    initial: { opacity: 1, scale: 1, height: "auto" },
    animate: { opacity: 1, scale: 1, height: "auto" },
    exit: { opacity: 0, y: -10, height: 0 },
    transition: { duration: 0.2 }
  },
  
  // Animação para ações de sucesso (como salvar ou completar)
  success: {
    initial: { backgroundColor: "transparent" },
    animate: { 
      backgroundColor: ["transparent", "rgba(34, 197, 94, 0.2)", "transparent"],
      transition: { duration: 1, times: [0, 0.1, 1] }
    }
  },
  
  // Animação para ações de falha ou erro
  error: {
    initial: { backgroundColor: "transparent" },
    animate: { 
      backgroundColor: ["transparent", "rgba(239, 68, 68, 0.2)", "transparent"],
      transition: { duration: 1, times: [0, 0.1, 1] }
    }
  },
  
  // Animação para marcar tarefa como completa
  taskComplete: {
    initial: { backgroundColor: "transparent" },
    animate: { 
      backgroundColor: ["transparent", "rgba(34, 197, 94, 0.2)", "transparent"],
      scale: [1, 1.02, 1],
      transition: { duration: 0.7, times: [0, 0.2, 1] }
    }
  },
  
  // Pulso sutil para chamar atenção
  pulse: {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.03, 1],
      transition: { duration: 0.5, repeat: 1, repeatType: "reverse" }
    }
  },
  
  // Fade in
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  },
  
  // Slide in de baixo
  slideInBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring", damping: 18, stiffness: 500 }
  },
  
  // Slide in do lado
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { type: "spring", damping: 18, stiffness: 500 }
  }
};

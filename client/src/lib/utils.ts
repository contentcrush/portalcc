import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Project, Client, Task, ProjectStatus, TaskStatus, 
  TaskPriority, InteractionType, DocumentType, StatusColors 
} from "./types";
import { 
  TASK_PRIORITY_WEIGHTS, 
  TASK_STATUS_WEIGHTS 
} from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return "";
  
  return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return "";
  
  return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function getRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return "";
  
  if (isToday(dateObj)) {
    return `Hoje, ${format(dateObj, "HH:mm", { locale: ptBR })}`;
  }
  
  if (isTomorrow(dateObj)) {
    return `Amanhã, ${format(dateObj, "HH:mm", { locale: ptBR })}`;
  }
  
  return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function getInitials(name: string): string {
  if (!name) return "";
  
  const parts = name.split(" ");
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

export function calculateProjectProgress(project: Project): number {
  if (!project) return 0;
  return project.progress || 0;
}

export function calculateDaysRemaining(endDate: Date | string | null | undefined): number {
  if (!endDate) return 0;
  
  const dateObj = typeof endDate === "string" ? parseISO(endDate) : endDate;
  
  if (!isValid(dateObj)) return 0;
  
  const today = new Date();
  const diffTime = dateObj.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

export function calculateTaskDaysOverdue(task: Task): number {
  if (!task.due_date || task.completed) return 0;
  
  const dueDate = typeof task.due_date === "string" ? parseISO(task.due_date) : task.due_date;
  
  if (!isValid(dueDate)) return 0;
  
  const today = new Date();
  if (dueDate > today) return 0;
  
  const diffTime = today.getTime() - dueDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function isTaskOverdue(task: Task): boolean {
  return calculateTaskDaysOverdue(task) > 0;
}

export function isTaskDueSoon(task: Task, days: number = 2): boolean {
  if (!task.due_date || task.completed) return false;
  
  const dueDate = typeof task.due_date === "string" ? parseISO(task.due_date) : task.due_date;
  
  if (!isValid(dueDate)) return false;
  
  const today = new Date();
  if (dueDate < today) return false;
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= days;
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
    // Primeiro critério: tarefas concluídas vão para o fim (dividimos a lista em duas partes)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // Verificamos diretamente a data de vencimento para tarefas críticas/alta prioridade
    if (a.due_date && b.due_date && 
        (a.priority === 'critica' || a.priority === 'alta') && 
        (b.priority === 'critica' || b.priority === 'alta')) {
      const dateA = new Date(a.due_date);
      const dateB = new Date(b.due_date);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
    }
    
    // Aplicamos o cálculo de score para ordenar o restante
    return sortTasksByPriority(a, b);
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

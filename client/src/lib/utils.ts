import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Project, Client, Task, ProjectStatus, TaskStatus, 
  TaskPriority, InteractionType, DocumentType, StatusColors 
} from "./types";

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
  if (!status) return "gray";
  return StatusColors[status] || "gray";
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

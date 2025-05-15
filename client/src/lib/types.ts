import { 
  User, Client, Project, ProjectMember, ProjectStage,
  Task, TaskComment, TaskAttachment, ClientInteraction,
  FinancialDocument, Expense, Event 
} from "@shared/schema";

// Extended types with computed properties or additional client-side properties
export interface ProjectWithClient extends Project {
  client?: Client;
}

export interface ProjectWithDetails extends Project {
  client?: Client;
  members?: (ProjectMember & { user?: User })[];
  stages?: ProjectStage[];
}

export interface TaskWithDetails extends Task {
  project?: ProjectWithClient;
  assignedUser?: User;
  comments?: (TaskComment & { user?: User })[];
  attachments?: TaskAttachment[];
  _isOptimistic?: boolean; // Flag para indicar que é uma tarefa em estado otimista (ainda não confirmada pelo servidor)
}

export interface ClientWithDetails extends Client {
  projects?: Project[];
  interactions?: (ClientInteraction & { user?: User })[];
  financialDocuments?: FinancialDocument[];
}

export interface EventWithDetails extends Event {
  project?: Project;
  client?: Client;
  task?: Task;
  user?: User;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByProject: { projectId: number, projectName: string, clientName: string, amount: number }[];
  revenueByMonth: { month: string, revenue: number, expenses: number }[];
  expensesByCategory: { category: string, amount: number }[];
  upcomingTransactions: { type: string, entity: string, amount: number, date: Date }[];
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface DashboardSummary {
  activeProjects: number;
  projectsAtRisk: number;
  completedProjects: number;
  pendingTasks: number;
  revenue: {
    current: number;
    previous: number;
    percentChange: number;
  };
  expenses: {
    current: number;
    previous: number;
    percentChange: number;
  };
  profit: {
    current: number;
    previous: number;
    percentChange: number;
  };
}

export type ProjectStageStatus = 'proposta' | 'pre_producao' | 'producao' | 'pos_revisao' | 'entregue' | 'concluido';

export type ProjectSpecialStatus = 'atrasado' | 'pausado' | 'cancelado';

export type ProjectStatus = ProjectStageStatus | ProjectSpecialStatus;

// Função para verificar se o status é um status de etapa do projeto
export function isProjectStage(status: string): status is ProjectStageStatus {
  return ['proposta', 'pre_producao', 'producao', 'pos_revisao', 'entregue', 'concluido'].includes(status);
}

// Função para verificar se o status é um status especial
export function isProjectSpecialStatus(status: string): status is ProjectSpecialStatus {
  return ['atrasado', 'pausado', 'cancelado'].includes(status);
}

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada' | 'cancelada';

export type TaskPriority = 'baixa' | 'media' | 'alta';

export type InteractionType = 'reuniao' | 'email' | 'feedback' | 'documento' | 'telefonema';

export type DocumentType = 'invoice' | 'contract' | 'proposal' | 'receipt';

export type DocumentStatus = 'pendente' | 'assinado' | 'pago' | 'aprovado' | 'cancelado';

export type EventType = 'reuniao' | 'gravacao' | 'entrega' | 'edicao' | 'financeiro';

export const StatusColors = {
  // Project Status
  proposta: 'slate',
  pre_producao: 'indigo',
  producao: 'yellow',
  pos_revisao: 'purple',
  entregue: 'green',
  concluido: 'emerald',
  atrasado: 'rose',
  pausado: 'amber',
  cancelado: 'gray',
  
  // Task Status
  pendente: 'yellow',
  em_andamento: 'blue',
  concluida: 'green',
  bloqueada: 'red',
  cancelada: 'gray',
  
  // Priority
  baixa: 'blue',
  media: 'yellow',
  alta: 'orange',
  critica: 'red',
};

export const StatusLabels = {
  // Project Status
  proposta: 'Proposta',
  pre_producao: 'Pré-produção',
  producao: 'Produção',
  pos_revisao: 'Pós / Revisão',
  entregue: 'Entregue / Aprovado',
  concluido: 'Concluído (Pago)',
  atrasado: 'Atrasado',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
  
  // Task Status
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
  cancelada: 'Cancelada',
  
  // Priority
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

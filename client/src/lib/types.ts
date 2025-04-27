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
  project?: Project;
  assignedUser?: User;
  comments?: (TaskComment & { user?: User })[];
  attachments?: TaskAttachment[];
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

export type ProjectStatus = 'draft' | 'em_orcamento' | 'pre_producao' | 'em_producao' | 'em_andamento' | 'revisao_cliente' | 'concluido';

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada' | 'cancelada';

export type TaskPriority = 'baixa' | 'media' | 'alta';

export type InteractionType = 'reuniao' | 'email' | 'feedback' | 'documento' | 'telefonema';

export type DocumentType = 'invoice' | 'contract' | 'proposal' | 'receipt';

export type DocumentStatus = 'pendente' | 'assinado' | 'pago' | 'aprovado' | 'cancelado';

export type EventType = 'reuniao' | 'gravacao' | 'entrega' | 'edicao' | 'financeiro';

export const StatusColors = {
  draft: 'gray',
  em_orcamento: 'blue',
  pre_producao: 'indigo',
  em_producao: 'yellow',
  em_andamento: 'green',
  revisao_cliente: 'purple',
  concluido: 'green',
  
  pendente: 'yellow',
  bloqueada: 'red',
  cancelada: 'gray',
  
  baixa: 'blue',
  media: 'yellow',
  alta: 'red',
};

export const StatusLabels = {
  draft: 'Rascunho',
  em_orcamento: 'Em Orçamento',
  pre_producao: 'Pré-produção',
  em_producao: 'Em Produção',
  em_andamento: 'Em Andamento',
  revisao_cliente: 'Revisão Cliente',
  concluido: 'Concluído',
  
  pendente: 'Pendente',
  bloqueada: 'Bloqueada',
  cancelada: 'Cancelada',
  
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

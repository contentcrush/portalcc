export const APP_NAME = "Content Crush";
export const APP_DESCRIPTION = "Gerenciamento de projetos e tarefas para produtoras de conteúdo";

export const SIDEBAR_ITEMS = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "gauge" // Ícone de painel/dashboard com estilo de medidor
  },
  {
    path: "/team",
    name: "Equipe",
    icon: "user-circle-2" // Ícone de pessoas em uma equipe de trabalho
  },
  {
    path: "/clients",
    name: "Clientes",
    icon: "users" // Mantemos users para clientes conforme a imagem de referência
  },
  {
    path: "/projects",
    name: "Projetos",
    icon: "clapperboard" // Ícone de claquete para projetos, conforme referência
  },
  {
    path: "/tasks",
    name: "Tarefas",
    icon: "list-checks" // Ícone de lista com checkboxes para tarefas
  },
  {
    path: "/financial",
    name: "Financeiro",
    icon: "chart" // Ícone de gráfico para financeiro, conforme referência
  },
  {
    path: "/calendar",
    name: "Calendário",
    icon: "calendar" // Mantemos o calendário
  },
  {
    path: "/files",
    name: "Arquivos",
    icon: "folder-open" // Ícone mais moderno para arquivos
  }
];

export const PROJECT_STATUS_OPTIONS = [
  { value: "proposta", label: "Proposta" },
  { value: "pre_producao", label: "Pré-produção" },
  { value: "producao", label: "Produção" },
  { value: "pos_revisao", label: "Pós / Revisão" },
  { value: "entregue", label: "Entregue / Aprovado" },
  { value: "concluido", label: "Concluído (Pago)" },
  // Status complementares
  { value: "atrasado", label: "Atrasado" },
  { value: "pausado", label: "Pausado" },
  { value: "cancelado", label: "Cancelado" }
];

export const TASK_STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "cancelada", label: "Cancelada" }
];

export const TASK_STATUS_COLORS = {
  pendente: "#f97316", // amber-500 (laranja)
  em_andamento: "#3b82f6", // blue-500 (azul)
  concluido: "#10b981", // emerald-500 (verde)
  bloqueada: "#ef4444", // red-500 (vermelho)
  cancelada: "#6b7280" // gray-500 (cinza)
};

export const TASK_PRIORITY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" }
];

export const TASK_PRIORITY_COLORS = {
  baixa: "#10B981", // emerald-500 (Verde 500)
  media: "#F59E0B", // amber-500 (Amarelo 500)
  alta: "#FB923C", // orange-500 (Laranja 500)
  critica: "#EF4444" // red-600 (Vermelho 600)
};

// Classes Tailwind para as cores de prioridade
export const PRIORITY_COLOR_CLASSES = {
  baixa: "bg-emerald-500", // Verde 500 - #10B981
  media: "bg-amber-500",   // Amarelo 500 - #F59E0B
  alta: "bg-orange-500",   // Laranja 500 - #FB923C
  critica: "bg-red-600",    // Vermelho 600 - #EF4444
  default: "bg-gray-500"
};

// Valores numéricos para ordenação de prioridades
export const TASK_PRIORITY_WEIGHTS = {
  critica: 40,
  alta: 30,
  media: 20,
  baixa: 10
};

// Valores numéricos para ordenação de status
export const TASK_STATUS_WEIGHTS = {
  bloqueada: 40,
  pendente: 30,
  em_andamento: 20,
  concluido: 10,
  cancelada: 0
};

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "invoice", label: "Fatura" },
  { value: "contract", label: "Contrato" },
  { value: "proposal", label: "Proposta" },
  { value: "receipt", label: "Recibo" }
];

export const DOCUMENT_STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "assinado", label: "Assinado" },
  { value: "pago", label: "Pago" },
  { value: "aprovado", label: "Aprovado" },
  { value: "cancelado", label: "Cancelado" }
];

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "equipment", label: "Equipamentos" },
  { value: "travel", label: "Viagens" },
  { value: "location", label: "Locações" },
  { value: "personnel", label: "Pessoal" },
  { value: "software", label: "Software" },
  { value: "services", label: "Serviços" },
  { value: "other", label: "Outros" }
];

export const EVENT_TYPE_OPTIONS = [
  { value: "reuniao", label: "Reunião" },
  { value: "gravacao", label: "Gravação" },
  { value: "entrega", label: "Entrega" },
  { value: "edicao", label: "Edição" },
  { value: "financeiro", label: "Financeiro" },
  { value: "prazo", label: "Prazo de Entrega" },
  { value: "externo", label: "Evento Externo" },
  { value: "planejamento", label: "Planejamento" },
  { value: "capacitacao", label: "Capacitação" },
  { value: "projeto", label: "Início de Projeto" }
];

export const CLIENT_TYPE_OPTIONS = [
  { value: "Corporate", label: "Corporativo" },
  { value: "Agency", label: "Agência" },
  { value: "Education", label: "Educação" },
  { value: "Startup", label: "Startup" },
  { value: "NGO", label: "ONG" },
  { value: "Government", label: "Governo" },
  { value: "Other", label: "Outro" }
];

export const CLIENT_CATEGORY_OPTIONS = [
  { value: "Premium", label: "Premium" },
  { value: "Standard", label: "Standard" },
  { value: "Basic", label: "Básico" }
];

export const USER_ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gestor" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Visualizador" }
];

export const TEAM_ROLE_OPTIONS = [
  { value: "coordenacao", label: "Coordenação" },
  { value: "producao", label: "Produção" },
  { value: "creator", label: "Creator" },
  { value: "editor_mobile", label: "Editor Mobile" },
  { value: "motion", label: "Motion" },
  { value: "direcao_arte", label: "Direção de Arte" },
  { value: "redacao", label: "Redação" },
  { value: "estrategista", label: "Estrategista de Conteúdo" },
  { value: "direcao_foto", label: "Direção de Foto" },
  { value: "assistente_foto", label: "Assistente de Foto" },
  { value: "culinarista", label: "Culinarista" },
  { value: "apresentadora", label: "Apresentadora" }
];

export const DEPARTMENT_OPTIONS = [
  { value: "Production", label: "Produção" },
  { value: "Post-production", label: "Pós-produção" },
  { value: "Sales", label: "Vendas" },
  { value: "Creative", label: "Criação" },
  { value: "Management", label: "Gestão" },
  { value: "Finance", label: "Financeiro" }
];

export const INTERACTION_TYPE_OPTIONS = [
  { value: "reuniao", label: "Reunião" },
  { value: "email", label: "Email" },
  { value: "telefonema", label: "Telefonema" },
  { value: "feedback", label: "Feedback" },
  { value: "documento", label: "Documento" }
];

export const EVENT_COLORS = {
  reuniao: "#2563EB",    // blue-600 (mais intenso para reuniões)
  gravacao: "#D97706",   // amber-600 (laranja distinto)
  entrega: "#7C3AED",    // violet-600 (roxo para entregas)
  edicao: "#DC2626",     // red-600 (vermelho mais forte)
  financeiro: "#059669", // emerald-600 (verde distinto)
  prazo: "#DB2777",      // pink-600 (rosa para prazos)
  externo: "#4F46E5",    // indigo-600 (azul-roxo)
  planejamento: "#0284C7", // sky-600 (azul claro)
  capacitacao: "#0D9488", // teal-600 (verde-azulado)
  projeto: "#4B5563"     // gray-600 (cinza mais escuro)
};

export const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export const WEEKDAYS = [
  "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"
];

export const CURRENT_QUARTER = `Q${Math.floor((new Date().getMonth() + 3) / 3)} ${new Date().getFullYear()}`;

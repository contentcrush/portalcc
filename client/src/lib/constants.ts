export const APP_NAME = "Content Crush";
export const APP_DESCRIPTION = "Gerenciamento de projetos e tarefas para produtoras de conteúdo";

export const SIDEBAR_ITEMS = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "layout-dashboard"
  },
  {
    path: "/projects",
    name: "Projetos",
    icon: "folder"
  },
  {
    path: "/tasks",
    name: "Tarefas",
    icon: "list-todo"
  },
  {
    path: "/clients",
    name: "Clientes",
    icon: "users"
  },
  {
    path: "/financial",
    name: "Financeiro",
    icon: "wallet"
  },
  {
    path: "/calendar",
    name: "Calendário",
    icon: "calendar"
  },
  {
    path: "/team",
    name: "Equipe",
    icon: "users"
  }
];

export const PROJECT_STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "em_orcamento", label: "Em Orçamento" },
  { value: "pre_producao", label: "Pré-produção" },
  { value: "em_producao", label: "Em Produção" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "revisao_cliente", label: "Revisão Cliente" },
  { value: "concluido", label: "Concluído" }
];

export const TASK_STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "cancelada", label: "Cancelada" }
];

export const TASK_PRIORITY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" }
];

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
  { value: "financeiro", label: "Financeiro" }
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
  { value: "director", label: "Diretor" },
  { value: "manager", label: "Gerente" },
  { value: "producer", label: "Produtor" },
  { value: "editor", label: "Editor" },
  { value: "photographer", label: "Fotógrafo" },
  { value: "designer", label: "Designer" }
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
  reuniao: "#3B82F6", // blue
  gravacao: "#F59E0B", // yellow
  entrega: "#6366F1", // purple
  edicao: "#EF4444", // red
  financeiro: "#10B981" // green
};

export const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export const WEEKDAYS = [
  "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"
];

export const CURRENT_QUARTER = `Q${Math.floor((new Date().getMonth() + 3) / 3)} ${new Date().getFullYear()}`;

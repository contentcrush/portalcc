import { pgTable, text, serial, integer, timestamp, boolean, doublePrecision, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { parseISO } from "date-fns";

// Enum para roles/funções de usuário
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'editor', 'viewer']);
export const userTypeEnum = pgEnum('user_type', ['pf', 'pj']); // Pessoa Física ou Pessoa Jurídica
export const accountTypeEnum = pgEnum('account_type', ['corrente', 'poupanca', 'investimento', 'pagamento']);
export const themeEnum = pgEnum('theme_type', ['light', 'dark', 'system']);
export const accentColorEnum = pgEnum('accent_color', ['blue', 'green', 'purple', 'orange', 'red', 'pink']);
export const viewModeEnum = pgEnum('view_mode', ['grid', 'list', 'table']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default('viewer'),
  department: text("department"),
  position: text("position"),
  bio: text("bio"),
  avatar: text("avatar"),
  
  // Campos básicos
  user_type: userTypeEnum("user_type"), // PF ou PJ
  document: text("document"), // CPF ou CNPJ
  phone: text("phone"),
  mobile_phone: text("mobile_phone"),
  website: text("website"),
  address: text("address"),
  area: text("area"), // Área de atuação

  // Contato principal (para PJ)
  contact_name: text("contact_name"),
  contact_position: text("contact_position"),
  contact_email: text("contact_email"),
  
  // Dados bancários
  bank: text("bank"),
  bank_agency: text("bank_agency"),
  bank_account: text("bank_account"),
  account_type: accountTypeEnum("account_type"),
  pix_key: text("pix_key"),
  
  // Outros campos
  notes: text("notes"),
  permissions: json("permissions").$type<string[]>().default([]),
  last_login: timestamp("last_login"),
  is_active: boolean("is_active").default(true),
  timezone: text("timezone"), // Fuso horário do usuário
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Tabela para refresh tokens
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  revoked: boolean("revoked").default(false),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  theme: themeEnum("theme").default('light'),
  accent_color: accentColorEnum("accent_color").default('blue'),
  clients_view_mode: viewModeEnum("clients_view_mode").default('grid'),
  sidebar_collapsed: boolean("sidebar_collapsed").default(false),
  dashboard_widgets: json("dashboard_widgets").$type<string[]>().default(['tasks', 'projects', 'clients']),
  quick_actions: json("quick_actions").$type<string[]>().default(['new-task', 'new-project', 'new-client']),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  type: text("type"),
  category: text("category"),
  cnpj: text("cnpj"),
  website: text("website"),
  contactName: text("contact_name"),
  contactPosition: text("contact_position"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  city: text("city"),
  since: timestamp("since"),
  notes: text("notes"),
  logo: text("logo"),
  active: boolean("active").default(true),
  segments: text("segments"), // Adicionando campo para segmentos/tags
});

// Enums para sistema de status de projetos
export const projectStatusEnum = pgEnum('project_status', [
  'proposta',
  'proposta_aceita', 
  'pre_producao',
  'producao',
  'pos_revisao', 
  'entregue',
  'concluido'
]);

export const specialStatusEnum = pgEnum('special_status', ['delayed', 'paused', 'canceled', 'none']);

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  client_id: integer("client_id").notNull(),
  status: text("status").notNull().default("proposta"),
  special_status: specialStatusEnum("special_status").default('none'),
  budget: doublePrecision("budget"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  issue_date: timestamp("issue_date"), // Data de emissão para documentos financeiros
  payment_term: integer("payment_term").default(30), // Prazo de pagamento em dias: 30, 60 ou 75
  progress: integer("progress").default(0),
  thumbnail: text("thumbnail"),
  creation_date: timestamp("creation_date").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").notNull(),
  user_id: integer("user_id").notNull(),
  role: text("role"),
});

export const projectStages = pgTable("project_stages", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  completed: boolean("completed").default(false),
  completion_date: timestamp("completion_date"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  project_id: integer("project_id"),
  assigned_to: integer("assigned_to"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").default("medium"),
  due_date: timestamp("due_date"), // Armazena data de vencimento
  due_time: text("due_time"), // Armazena hora de vencimento separadamente
  start_date: timestamp("start_date"),
  estimated_hours: doublePrecision("estimated_hours"),
  completed: boolean("completed").default(false),
  completion_date: timestamp("completion_date"),
  creation_date: timestamp("creation_date").defaultNow(),
});

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").notNull(),
  user_id: integer("user_id").notNull(),
  comment: text("comment").notNull(),
  parent_id: integer("parent_id"), // para respostas a outros comentários
  creation_date: timestamp("creation_date").defaultNow(),
  edited: boolean("edited").default(false),
  edit_date: timestamp("edit_date"),
  deleted: boolean("deleted").default(false),
  delete_date: timestamp("delete_date"),
});

// Reações aos comentários (like, etc)
export const commentReactions = pgTable("comment_reactions", {
  id: serial("id").primaryKey(),
  comment_id: integer("comment_id").notNull(),
  user_id: integer("user_id").notNull(),
  reaction_type: text("reaction_type").notNull().default("like"), // like, heart, etc
  creation_date: timestamp("creation_date").defaultNow(),
});

// Comentários de projeto
export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").notNull(),
  user_id: integer("user_id").notNull(),
  comment: text("comment").notNull(),
  parent_id: integer("parent_id"), // para respostas a outros comentários
  creation_date: timestamp("creation_date").defaultNow(),
  edited: boolean("edited").default(false),
  edit_date: timestamp("edit_date"),
  deleted: boolean("deleted").default(false),
  delete_date: timestamp("delete_date"),
});

// Reações aos comentários de projeto
export const projectCommentReactions = pgTable("project_comment_reactions", {
  id: serial("id").primaryKey(),
  comment_id: integer("comment_id").notNull(),
  user_id: integer("user_id").notNull(),
  reaction_type: text("reaction_type").notNull().default("like"), // like, heart, etc
  creation_date: timestamp("creation_date").defaultNow(),
});

export const taskAttachments = pgTable("task_attachments", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").notNull(),
  file_name: text("file_name").notNull(),
  file_size: integer("file_size"),
  file_type: text("file_type"),
  file_url: text("file_url").notNull(),
  uploaded_by: integer("uploaded_by"),
  upload_date: timestamp("upload_date").defaultNow(),
  // Campos para criptografia
  encrypted: boolean("encrypted").default(false),
  encryption_iv: text("encryption_iv"), // Vetor de inicialização para AES-256
  encryption_key_id: text("encryption_key_id"), // Identificador da chave usada
});

export const projectAttachments = pgTable("project_attachments", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").notNull(),
  file_name: text("file_name").notNull(),
  file_size: integer("file_size"),
  file_type: text("file_type"),
  file_url: text("file_url").notNull(),
  uploaded_by: integer("uploaded_by"),
  upload_date: timestamp("upload_date").defaultNow(),
  // Campos para criptografia
  encrypted: boolean("encrypted").default(false),
  encryption_iv: text("encryption_iv"), // Vetor de inicialização para AES-256
  encryption_key_id: text("encryption_key_id"), // Identificador da chave usada
});

export const clientAttachments = pgTable("client_attachments", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").notNull(),
  file_name: text("file_name").notNull(),
  file_size: integer("file_size"),
  file_type: text("file_type"),
  file_url: text("file_url").notNull(),
  uploaded_by: integer("uploaded_by"),
  upload_date: timestamp("upload_date").defaultNow(),
  description: text("description"), // Campo opcional para descrever o arquivo
  tags: text("tags"), // Tags para facilitar a busca e organização
  // Campos para criptografia
  encrypted: boolean("encrypted").default(false),
  encryption_iv: text("encryption_iv"),
  encryption_key_id: text("encryption_key_id"),
});

export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").notNull(),
  name: text("name").notNull(),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  is_primary: boolean("is_primary").default(false),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
});

export const clientInteractions = pgTable("client_interactions", {
  id: serial("id").primaryKey(),
  client_id: integer("client_id").notNull(),
  user_id: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow(),
});

// Enum para status de documentos financeiros
export const financialStatusEnum = pgEnum('financial_status', [
  'pending',     // Pendente de aprovação
  'approved',    // Aprovado para pagamento/recebimento
  'paid',        // Pago/Recebido
  'cancelled',   // Cancelado
  'archived'     // Arquivado (dados antigos)
]);

export const financialDocuments = pgTable("financial_documents", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id"),
  client_id: integer("client_id").notNull(),
  document_type: text("document_type").notNull(),
  document_number: text("document_number"),
  amount: doublePrecision("amount").notNull(),
  due_date: timestamp("due_date"),
  issue_date: timestamp("issue_date"), // Data de emissão
  paid: boolean("paid").default(false),
  payment_date: timestamp("payment_date"),
  payment_notes: text("payment_notes"),
  status: financialStatusEnum("status").default("pending"),
  description: text("description"),
  invoice_file: text("invoice_file"),
  invoice_file_name: text("invoice_file_name"),
  invoice_file_uploaded_at: timestamp("invoice_file_uploaded_at"),
  invoice_file_uploaded_by: integer("invoice_file_uploaded_by"),
  
  // Campos de auditoria
  created_at: timestamp("created_at").defaultNow(),
  created_by: integer("created_by").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
  updated_by: integer("updated_by"),
  
  // Campos de controle
  version: integer("version").default(1), // Versionamento para controle de concorrência
  archived: boolean("archived").default(false), // Para marcar documentos antigos
  archived_at: timestamp("archived_at"),
  archived_by: integer("archived_by"),
  archive_reason: text("archive_reason"),
});

// Tabela de auditoria para todas as operações financeiras
export const financialAuditLog = pgTable("financial_audit_log", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull(),
  action: text("action").notNull(), // create, update, approve, pay, cancel, archive
  user_id: integer("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  
  // Dados antes da mudança (JSON)
  old_values: json("old_values"),
  
  // Dados depois da mudança (JSON)
  new_values: json("new_values"),
  
  // Informações adicionais
  reason: text("reason"), // Motivo da mudança
  ip_address: text("ip_address"), // IP do usuário
  user_agent: text("user_agent"), // Browser/App usado
  
  // Campos de segurança
  checksum: text("checksum"), // Hash dos dados para verificar integridade
  session_id: text("session_id"), // ID da sessão
});

export const projectStatusHistory = pgTable("project_status_history", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id").notNull(),
  previous_status: specialStatusEnum("previous_status").notNull(),
  new_status: specialStatusEnum("new_status").notNull(),
  changed_by: integer("changed_by").notNull(),
  change_date: timestamp("change_date").defaultNow(),
  reason: text("reason"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  paid_by: integer("paid_by"),
  paid: boolean("paid").default(false),
  reimbursement: boolean("reimbursement").default(false),
  receipt: text("receipt"),
  approved: boolean("approved").default(false),
  creation_date: timestamp("creation_date").defaultNow(),
  invoice_file: text("invoice_file"), // URL para o arquivo da nota fiscal
  invoice_file_name: text("invoice_file_name"), // Nome original do arquivo
  invoice_file_uploaded_at: timestamp("invoice_file_uploaded_at"), // Data do upload
  invoice_file_uploaded_by: integer("invoice_file_uploaded_by"), // Usuário que fez o upload
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  user_id: integer("user_id").notNull(),
  project_id: integer("project_id"),
  client_id: integer("client_id"),
  task_id: integer("task_id"),
  financial_document_id: integer("financial_document_id"), // Referência ao documento financeiro
  expense_id: integer("expense_id"), // Referência à despesa
  type: text("type").notNull(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  all_day: boolean("all_day").default(false),
  location: text("location"),
  color: text("color"),
  creation_date: timestamp("creation_date").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true, 
  last_login: true, 
  permissions: true 
});
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({ 
  id: true, 
  created_at: true 
});
// Schema para preferências do usuário
export const insertUserPreferenceSchema = createInsertSchema(userPreferences).omit({ id: true, updated_at: true });

// Schema base para clientes
const clientBaseSchema = createInsertSchema(clients).omit({ id: true });
// Schema personalizado com transformações para data 'since'
export const insertClientSchema = clientBaseSchema.extend({
  since: z.union([z.string(), z.date(), z.null()]).transform(val => 
    val === null || val === undefined ? null : 
    typeof val === 'string' ? new Date(val) : val
  ).nullable().optional(),
  active: z.boolean().optional().default(true)
});
// Define schema base e customiza para adicionar transformação de strings para dates
const projectBaseSchema = createInsertSchema(projects).omit({ id: true, creation_date: true });
export const insertProjectSchema = projectBaseSchema.extend({
  startDate: z.union([z.string(), z.date(), z.null()]).transform(val => 
    val === null ? null : typeof val === 'string' ? new Date(val) : val
  ).nullable().optional(),
  endDate: z.union([z.string(), z.date(), z.null()]).transform(val => 
    val === null ? null : typeof val === 'string' ? new Date(val) : val
  ).nullable().optional(),
  issue_date: z.union([z.string(), z.date(), z.null()]).transform(val => 
    val === null ? null : typeof val === 'string' ? new Date(val) : val
  ).nullable().optional(),
  payment_term: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  ).default(30).refine(val => [30, 60, 75].includes(val), {
    message: "Prazo de pagamento deve ser 30, 60 ou 75 dias"
  }),
  // Lista de IDs dos usuários que farão parte da equipe
  team_members: z.array(z.number()).optional(),
  // Mapa de funções para cada membro da equipe (chave: userId, valor: função)
  team_members_roles: z.record(z.string(), z.string()).optional()
});
// Criamos um schema base e depois estendemos para forçar a conversão do project_id para número
const projectMemberBaseSchema = createInsertSchema(projectMembers).omit({ id: true });
export const insertProjectMemberSchema = projectMemberBaseSchema.extend({
  project_id: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  ),
  user_id: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  )
});
export const insertProjectStageSchema = createInsertSchema(projectStages).omit({ id: true, completion_date: true });

// Schema base para tarefas - simplificado para aceitar valores nulos e strings como datas
const taskBaseSchema = createInsertSchema(tasks).omit({ id: true, creation_date: true, completion_date: true });

// Schema simplificado para tarefas
export const insertTaskSchema = taskBaseSchema.extend({
  // Campos não obrigatórios com valores nulos permitidos
  project_id: z.number().nullable().optional(),
  assigned_to: z.number().nullable().optional(),
  priority: z.string().nullable().optional(),
  estimated_hours: z.number().nullable().optional(),
  start_date: z.union([z.string(), z.date(), z.null()]).nullable().optional(),
  // due_date agora armazena data e hora completas no formato ISO
  due_date: z.union([z.string(), z.date(), z.null()]).nullable().optional()
    .transform(value => {
      if (!value) return null;
      
      try {
        // Converter para objeto Date se for string
        const dateObj = typeof value === 'string' ? parseISO(value) : value;
        return dateObj;
      } catch (error) {
        console.error("Erro ao transformar due_date:", error);
        return null;
      }
    })
});
export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ 
  id: true, 
  creation_date: true, 
  edited: true, 
  edit_date: true, 
  deleted: true, 
  delete_date: true 
});
export const insertCommentReactionSchema = createInsertSchema(commentReactions).omit({ id: true, creation_date: true });

// Schemas para comentários de projeto
export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({ 
  id: true, 
  creation_date: true, 
  edited: true, 
  edit_date: true, 
  deleted: true, 
  delete_date: true 
});
export const insertProjectCommentReactionSchema = createInsertSchema(projectCommentReactions).omit({ id: true, creation_date: true });

export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({ 
  id: true, 
  upload_date: true,
  encrypted: true,
  encryption_iv: true,
  encryption_key_id: true
});

export const insertProjectAttachmentSchema = createInsertSchema(projectAttachments).omit({ 
  id: true, 
  upload_date: true,
  encrypted: true,
  encryption_iv: true,
  encryption_key_id: true
});

export const insertClientAttachmentSchema = createInsertSchema(clientAttachments).omit({ 
  id: true, 
  upload_date: true,
  encrypted: true,
  encryption_iv: true,
  encryption_key_id: true
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertClientInteractionSchema = createInsertSchema(clientInteractions).omit({ id: true, date: true });
// Schema base para documentos financeiros
const financialDocumentBaseSchema = createInsertSchema(financialDocuments).omit({ id: true, creation_date: true, payment_date: true });

// Schema personalizado com transformações para datas usando Luxon
export const insertFinancialDocumentSchema = financialDocumentBaseSchema.extend({
  issue_date: z.union([z.string(), z.date(), z.null()]).transform(val => {
    if (val === null || val === undefined) return null;
    
    if (typeof val === 'string') {
      // Converte a string para um objeto Date
      const date = parseISO(val);
      
      // Padroniza a hora para meio-dia (12:00) UTC
      date.setUTCHours(12, 0, 0, 0);
      return date;
    }
    
    // Se já for um objeto Date, padroniza para meio-dia UTC
    const date = new Date(val);
    date.setUTCHours(12, 0, 0, 0);
    return date;
  }).nullable().optional(),
  
  due_date: z.union([z.string(), z.date(), z.null()]).transform(val => {
    if (val === null || val === undefined) return null;
    
    if (typeof val === 'string') {
      // Converte a string para um objeto Date
      const date = parseISO(val);
      
      // Verifica se a data não tem informação de hora (é meia-noite no fuso local)
      if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
        // Definir para 23:59:59 UTC para garantir que a data seja considerada como fim do dia
        date.setUTCHours(23, 59, 59, 999);
      }
      
      return date;
    }
    
    // Se já for um objeto Date, garante que está em UTC com horário ajustado
    if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
      // Criar uma nova instância para não modificar o objeto original
      const date = new Date(val);
      date.setUTCHours(23, 59, 59, 999);
      return date;
    }
    
    return val; // Retorna a data como está se já tem horário definido
  }).nullable().optional(),
});
// Schema base para despesas
const expenseBaseSchema = createInsertSchema(expenses).omit({ id: true, creation_date: true });

// Schema personalizado com transformações para datas usando date-fns
export const insertExpenseSchema = expenseBaseSchema.extend({
  date: z.union([z.string(), z.date()]).transform(val => {
    if (typeof val === 'string') {
      // Converte a string para um objeto Date
      const date = parseISO(val);
      
      // Verifica se a data não tem informação de hora (é meia-noite no fuso local)
      if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
        // Definir para 23:59:59 UTC para garantir que a data seja considerada como fim do dia
        date.setUTCHours(23, 59, 59, 999);
      }
      
      return date;
    }
    
    // Se já for um objeto Date, garante que está em UTC com horário ajustado
    if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
      // Criar uma nova instância para não modificar o objeto original
      const date = new Date(val);
      date.setUTCHours(23, 59, 59, 999);
      return date;
    }
    
    return val; // Retorna a data como está se já tem horário definido
  }),
  paid: z.boolean().optional().default(false),
});
// Schema base para eventos
const eventBaseSchema = createInsertSchema(events).omit({ id: true, creation_date: true });
// Schema personalizado com transformações para datas usando date-fns
export const insertEventSchema = eventBaseSchema.extend({
  start_date: z.union([z.string(), z.date(), z.null()]).transform(val => {
    if (val === null) return val;
    
    if (typeof val === 'string') {
      // Converte a string para um objeto Date
      const date = parseISO(val);
      
      // Verifica se a data não tem informação de hora (é meia-noite no fuso local)
      if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
        // Definir para 23:59:59 UTC para garantir que a data seja considerada como fim do dia
        date.setUTCHours(23, 59, 59, 999);
      }
      
      return date;
    }
    
    // Se já for um objeto Date, garante que está em UTC com horário ajustado
    if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
      // Criar uma nova instância para não modificar o objeto original
      const date = new Date(val);
      date.setUTCHours(23, 59, 59, 999);
      return date;
    }
    
    return val; // Retorna a data como está se já tem horário definido
  }),
  end_date: z.union([z.string(), z.date(), z.null()]).transform(val => {
    if (val === null) return val;
    
    if (typeof val === 'string') {
      // Converte a string para um objeto Date
      const date = parseISO(val);
      
      // Verifica se a data não tem informação de hora (é meia-noite no fuso local)
      if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
        // Definir para 23:59:59 UTC para garantir que a data seja considerada como fim do dia
        date.setUTCHours(23, 59, 59, 999);
      }
      
      return date;
    }
    
    // Se já for um objeto Date, garante que está em UTC com horário ajustado
    if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
      // Criar uma nova instância para não modificar o objeto original
      const date = new Date(val);
      date.setUTCHours(23, 59, 59, 999);
      return date;
    }
    
    return val; // Retorna a data como está se já tem horário definido
  })
});

// Select types
export type User = typeof users.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type ProjectStage = typeof projectStages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskComment = typeof taskComments.$inferSelect & {
  reactions?: CommentReaction[];
};
export type CommentReaction = typeof commentReactions.$inferSelect;
export type ProjectComment = typeof projectComments.$inferSelect & {
  reactions?: ProjectCommentReaction[];
};
export type ProjectCommentReaction = typeof projectCommentReactions.$inferSelect;
export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type ProjectAttachment = typeof projectAttachments.$inferSelect;
export type ClientContact = typeof clientContacts.$inferSelect;
export type ClientInteraction = typeof clientInteractions.$inferSelect;
export type FinancialDocument = typeof financialDocuments.$inferSelect;
export type FinancialAuditLog = typeof financialAuditLog.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Event = typeof events.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type InsertProjectStage = z.infer<typeof insertProjectStageSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type InsertCommentReaction = z.infer<typeof insertCommentReactionSchema>;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type InsertProjectCommentReaction = z.infer<typeof insertProjectCommentReactionSchema>;
export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type InsertProjectAttachment = z.infer<typeof insertProjectAttachmentSchema>;
export type InsertClientContact = z.infer<typeof insertClientContactSchema>;
export type InsertClientInteraction = z.infer<typeof insertClientInteractionSchema>;
export type InsertFinancialDocument = z.infer<typeof insertFinancialDocumentSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// Schemas para auditoria financeira
export const insertFinancialAuditLogSchema = createInsertSchema(financialAuditLog).omit({ 
  id: true, 
  timestamp: true 
});
export type InsertFinancialAuditLog = z.infer<typeof insertFinancialAuditLogSchema>;

// Definição de relações
export const usersRelations = relations(users, ({ many, one }) => ({
  tasks: many(tasks, { relationName: "user_tasks" }),
  projectMembers: many(projectMembers),
  taskComments: many(taskComments),
  projectComments: many(projectComments),
  taskAttachments: many(taskAttachments),
  clientInteractions: many(clientInteractions),
  expenses: many(expenses),
  events: many(events),
  refreshTokens: many(refreshTokens),
  statusChanges: many(projectStatusHistory),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.user_id]
  })
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.user_id],
    references: [users.id]
  })
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.user_id],
    references: [users.id]
  })
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  clientInteractions: many(clientInteractions),
  clientContacts: many(clientContacts),
  financialDocuments: many(financialDocuments),
  events: many(events),
  attachments: many(clientAttachments, { relationName: "client_attachments" })
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.client_id],
    references: [clients.id]
  }),
  members: many(projectMembers, { relationName: "project_members" }),
  stages: many(projectStages, { relationName: "project_stages" }),
  tasks: many(tasks, { relationName: "project_tasks" }),
  comments: many(projectComments, { relationName: "project_comments" }),
  attachments: many(projectAttachments, { relationName: "project_attachments" }),
  financialDocuments: many(financialDocuments, { relationName: "project_financial_documents" }),
  expenses: many(expenses, { relationName: "project_expenses" }),
  events: many(events, { relationName: "project_events" }),
  statusHistory: many(projectStatusHistory, { relationName: "project_status_history" })
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.project_id],
    references: [projects.id],
    relationName: "project_members",
    onDelete: "cascade"
  }),
  user: one(users, {
    fields: [projectMembers.user_id],
    references: [users.id]
  })
}));

export const projectStagesRelations = relations(projectStages, ({ one }) => ({
  project: one(projects, {
    fields: [projectStages.project_id],
    references: [projects.id],
    relationName: "project_stages",
    onDelete: "cascade"
  })
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.project_id],
    references: [projects.id],
    relationName: "project_tasks",
    onDelete: "cascade"
  }),
  assignedUser: one(users, {
    fields: [tasks.assigned_to],
    references: [users.id],
    relationName: "user_tasks"
  }),
  comments: many(taskComments),
  attachments: many(taskAttachments),
  events: many(events)
}));

export const taskCommentsRelations = relations(taskComments, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskComments.task_id],
    references: [tasks.id],
    onDelete: "cascade"
  }),
  user: one(users, {
    fields: [taskComments.user_id],
    references: [users.id]
  }),
  reactions: many(commentReactions),
  parent: one(taskComments, {
    fields: [taskComments.parent_id],
    references: [taskComments.id]
  })
}));

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  comment: one(taskComments, {
    fields: [commentReactions.comment_id],
    references: [taskComments.id],
    onDelete: "cascade"
  }),
  user: one(users, {
    fields: [commentReactions.user_id],
    references: [users.id]
  })
}));

// Relações para comentários de projeto
export const projectCommentsRelations = relations(projectComments, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectComments.project_id],
    references: [projects.id],
    relationName: "project_comments",
    onDelete: "cascade"
  }),
  user: one(users, {
    fields: [projectComments.user_id],
    references: [users.id]
  }),
  reactions: many(projectCommentReactions),
  parent: one(projectComments, {
    fields: [projectComments.parent_id],
    references: [projectComments.id]
  })
}));

// Relações para reações de comentários de projeto
export const projectCommentReactionsRelations = relations(projectCommentReactions, ({ one }) => ({
  comment: one(projectComments, {
    fields: [projectCommentReactions.comment_id],
    references: [projectComments.id],
    onDelete: "cascade"
  }),
  user: one(users, {
    fields: [projectCommentReactions.user_id],
    references: [users.id]
  })
}));

export const taskAttachmentsRelations = relations(taskAttachments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAttachments.task_id],
    references: [tasks.id],
    onDelete: "cascade"
  }),
  uploader: one(users, {
    fields: [taskAttachments.uploaded_by],
    references: [users.id]
  })
}));

export const projectAttachmentsRelations = relations(projectAttachments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAttachments.project_id],
    references: [projects.id],
    relationName: "project_attachments",
    onDelete: "cascade"
  }),
  uploader: one(users, {
    fields: [projectAttachments.uploaded_by],
    references: [users.id]
  })
}));

export const clientAttachmentsRelations = relations(clientAttachments, ({ one }) => ({
  client: one(clients, {
    fields: [clientAttachments.client_id],
    references: [clients.id],
    relationName: "client_attachments",
    onDelete: "cascade"
  }),
  uploader: one(users, {
    fields: [clientAttachments.uploaded_by],
    references: [users.id]
  })
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.client_id],
    references: [clients.id],
    onDelete: "cascade"
  })
}));

export const clientInteractionsRelations = relations(clientInteractions, ({ one }) => ({
  client: one(clients, {
    fields: [clientInteractions.client_id],
    references: [clients.id]
  }),
  user: one(users, {
    fields: [clientInteractions.user_id],
    references: [users.id]
  })
}));

export const financialDocumentsRelations = relations(financialDocuments, ({ one }) => ({
  client: one(clients, {
    fields: [financialDocuments.client_id],
    references: [clients.id]
  }),
  project: one(projects, {
    fields: [financialDocuments.project_id],
    references: [projects.id],
    relationName: "project_financial_documents",
    onDelete: "cascade" // Adiciona exclusão em cascata
  })
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  project: one(projects, {
    fields: [expenses.project_id],
    references: [projects.id],
    relationName: "project_expenses",
    onDelete: "cascade"
  }),
  paidBy: one(users, {
    fields: [expenses.paid_by],
    references: [users.id]
  })
}));

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.user_id],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [events.project_id],
    references: [projects.id],
    relationName: "project_events",
    onDelete: "cascade"
  }),
  client: one(clients, {
    fields: [events.client_id],
    references: [clients.id]
  }),
  task: one(tasks, {
    fields: [events.task_id],
    references: [tasks.id],
    onDelete: "cascade"
  })
}));


// ===== SISTEMA DE STATUS SIMPLIFICADO =====

// Constantes para Status de Projetos (fluxo principal)
export const PROJECT_STATUSES = [
  'proposta',
  'proposta_aceita', 
  'pre_producao',
  'producao',
  'pos_revisao', 
  'entregue',
  'concluido'
] as const;

// Constantes para Status Especiais (sobreposições)
export const SPECIAL_STATUSES = ['delayed', 'paused', 'canceled', 'none'] as const;

// Tipos TypeScript derivados
export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type SpecialStatus = typeof SPECIAL_STATUSES[number];

// Configuração de cada status com progressos e validações
export const PROJECT_STATUS_CONFIG = {
  proposta: {
    label: 'Proposta',
    description: 'Projeto em fase de orçamento e negociação',
    baseProgress: 5,
    progressWithBudget: 15,
    canCreateFinancialDocuments: false,
    color: '#6B7280',
    nextStatuses: ['proposta_aceita', 'pre_producao', 'producao'] as ProjectStatus[],
    allowBackward: [] as ProjectStatus[]
  },
  proposta_aceita: {
    label: 'Proposta Aceita',
    description: 'Proposta aprovada, iniciando preparação',
    baseProgress: 25,
    canCreateFinancialDocuments: true,
    color: '#10B981',
    nextStatuses: ['pre_producao', 'producao', 'pos_revisao'] as ProjectStatus[],
    allowBackward: ['proposta'] as ProjectStatus[]
  },
  pre_producao: {
    label: 'Pré-Produção',
    description: 'Planejamento e preparação para execução',
    baseProgress: 40,
    canCreateFinancialDocuments: true,
    color: '#3B82F6',
    nextStatuses: ['producao', 'pos_revisao', 'entregue'] as ProjectStatus[],
    allowBackward: ['proposta_aceita', 'proposta'] as ProjectStatus[]
  },
  producao: {
    label: 'Produção',
    description: 'Execução ativa do projeto',
    baseProgress: 60,
    canCreateFinancialDocuments: true,
    color: '#F59E0B',
    nextStatuses: ['pos_revisao', 'entregue', 'concluido'] as ProjectStatus[],
    allowBackward: ['pre_producao', 'proposta_aceita', 'proposta'] as ProjectStatus[]
  },
  pos_revisao: {
    label: 'Pós-Revisão',
    description: 'Finalização e ajustes finais',
    baseProgress: 80,
    canCreateFinancialDocuments: true,
    color: '#8B5CF6',
    nextStatuses: ['entregue', 'concluido'] as ProjectStatus[],
    allowBackward: ['producao', 'pre_producao', 'proposta_aceita', 'proposta'] as ProjectStatus[]
  },
  entregue: {
    label: 'Entregue',
    description: 'Projeto finalizado e entregue ao cliente',
    baseProgress: 95,
    canCreateFinancialDocuments: true,
    color: '#EC4899', // Pink-500 - bem distinto
    nextStatuses: ['concluido'] as ProjectStatus[],
    allowBackward: ['pos_revisao', 'producao', 'pre_producao', 'proposta_aceita', 'proposta'] as ProjectStatus[]
  },
  concluido: {
    label: 'Concluído',
    description: 'Projeto totalmente finalizado e arquivado',
    baseProgress: 100,
    canCreateFinancialDocuments: true,
    color: '#059669', // Emerald-600 - verde mais escuro
    nextStatuses: [] as ProjectStatus[],
    allowBackward: ['entregue', 'pos_revisao', 'producao', 'pre_producao', 'proposta_aceita', 'proposta'] as ProjectStatus[]
  }
} as const;

// Função para validar transições de status - versão simplificada e mais flexível
export function isValidStatusTransition(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus,
  specialStatus?: SpecialStatus
): { valid: boolean; reason?: string } {
  
  // Verificar se projeto está cancelado
  if (specialStatus === 'canceled') {
    return { 
      valid: false, 
      reason: 'Projetos cancelados não podem ter seu status alterado' 
    };
  }
  
  // Se é o mesmo status, sempre permitir
  if (currentStatus === newStatus) {
    return { valid: true };
  }
  
  const config = PROJECT_STATUS_CONFIG[currentStatus];
  const newConfig = PROJECT_STATUS_CONFIG[newStatus];
  
  // Se não encontrar a configuração do status atual, permitir a transição
  if (!config) {
    console.warn(`Status configuration not found for: ${currentStatus}`);
    return { valid: true };
  }
  
  // Se não encontrar a configuração do novo status, negar a transição
  if (!newConfig) {
    console.warn(`Status configuration not found for: ${newStatus}`);
    return { 
      valid: false, 
      reason: `Status "${newStatus}" não está configurado no sistema` 
    };
  }
  
  // Permitir transições para frente (nextStatuses)
  if (config.nextStatuses && config.nextStatuses.includes(newStatus)) {
    return { valid: true };
  }
  
  // Permitir transições para trás (allowBackward)
  if (config.allowBackward && config.allowBackward.includes(newStatus)) {
    return { valid: true };
  }
  
  // Regra especial: permitir pular para "entregue" ou "concluido" de qualquer status
  // (para casos onde o projeto é finalizado rapidamente)
  if (newStatus === 'entregue' || newStatus === 'concluido') {
    return { valid: true };
  }
  
  // Regra especial: permitir voltar para "proposta" de qualquer status
  // (para casos de replanejamento ou mudanças de escopo)
  if (newStatus === 'proposta') {
    return { valid: true };
  }
  
  return { 
    valid: false, 
    reason: `Não é possível alterar de "${config.label}" para "${newConfig.label}"` 
  };
}

// Sistema de marcos inteligentes para cada status
export const PROJECT_MILESTONES = {
  proposta: [
    { id: 'briefing_received', label: 'Briefing Recebido', weight: 30 },
    { id: 'budget_created', label: 'Orçamento Criado', weight: 70 }
  ],
  proposta_aceita: [
    { id: 'contract_signed', label: 'Contrato Assinado', weight: 50 },
    { id: 'team_assigned', label: 'Equipe Designada', weight: 100 }
  ],
  pre_producao: [
    { id: 'planning_done', label: 'Planejamento Concluído', weight: 40 },
    { id: 'resources_allocated', label: 'Recursos Alocados', weight: 70 },
    { id: 'timeline_approved', label: 'Cronograma Aprovado', weight: 100 }
  ],
  producao: [
    { id: 'production_started', label: 'Produção Iniciada', weight: 20 },
    { id: 'first_draft', label: 'Primeira Versão', weight: 50 },
    { id: 'client_feedback', label: 'Feedback do Cliente', weight: 80 },
    { id: 'production_complete', label: 'Produção Finalizada', weight: 100 }
  ],
  pos_revisao: [
    { id: 'revision_complete', label: 'Revisão Concluída', weight: 50 },
    { id: 'final_approval', label: 'Aprovação Final', weight: 100 }
  ],
  entregue: [
    { id: 'delivery_confirmed', label: 'Entrega Confirmada', weight: 100 }
  ],
  concluido: [
    { id: 'project_archived', label: 'Projeto Arquivado', weight: 100 }
  ]
} as const;

// Função inteligente para calcular progresso baseado em status e marcos
export function calculateIntelligentProgress(
  status: ProjectStatus,
  completedMilestones: string[] = [],
  hasBudget: boolean = false,
  hasTeamMembers: boolean = false,
  hasFinancialDocuments: boolean = false
): { progress: number; nextMilestone?: string; details: any } {
  const config = PROJECT_STATUS_CONFIG[status];
  const milestones = PROJECT_MILESTONES[status] || [];
  
  // Progresso base do status
  let baseProgress = config.baseProgress;
  
  // Cálculo inteligente baseado em marcos completados
  let milestoneProgress = 0;
  if (milestones.length > 0) {
    const totalWeight = milestones[milestones.length - 1].weight;
    const completedWeight = milestones
      .filter(m => completedMilestones.includes(m.id))
      .reduce((acc, m) => Math.max(acc, m.weight), 0);
    
    milestoneProgress = (completedWeight / totalWeight) * 10; // 10% de variação dentro do status
  }
  
  // Ajustes automáticos baseados em indicadores do projeto
  let autoProgress = 0;
  
  if (status === 'proposta' && hasBudget) {
    autoProgress += 5; // Orçamento criado
  }
  
  if (status === 'proposta_aceita' && hasTeamMembers) {
    autoProgress += 3; // Equipe designada
  }
  
  if (['proposta_aceita', 'pre_producao', 'producao'].includes(status) && hasFinancialDocuments) {
    autoProgress += 2; // Documentos financeiros criados
  }
  
  const finalProgress = Math.min(100, baseProgress + milestoneProgress + autoProgress);
  
  // Encontrar próximo marco
  const nextMilestone = milestones.find(m => !completedMilestones.includes(m.id));
  
  return {
    progress: finalProgress,
    nextMilestone: nextMilestone?.label,
    details: {
      baseProgress,
      milestoneProgress,
      autoProgress,
      completedMilestones: completedMilestones.length,
      totalMilestones: milestones.length
    }
  };
}

// Função legada para compatibilidade
export function calculateProgressFromStatus(
  status: ProjectStatus,
  hasBudget: boolean = false
): number {
  return calculateIntelligentProgress(status, [], hasBudget).progress;
}

/**
 * Função para validar transições de status especiais
 */
export function isValidSpecialStatusTransition(
  currentProjectStatus: ProjectStatus,
  currentSpecialStatus: SpecialStatus,
  newSpecialStatus: SpecialStatus
): { valid: boolean; reason?: string } {
  // Sempre permitir voltar para "none" (remover status especial)
  if (newSpecialStatus === 'none') {
    return { valid: true };
  }
  
  // Projetos cancelados não podem mudar status especial (exceto para "none")
  if (currentSpecialStatus === 'canceled') {
    return {
      valid: false,
      reason: 'Projetos cancelados não podem ter status especial alterado'
    };
  }
  
  // Permitir qualquer transição para delayed, paused ou canceled
  if (['delayed', 'paused', 'canceled'].includes(newSpecialStatus)) {
    return { valid: true };
  }
  
  return {
    valid: false,
    reason: `Status especial "${newSpecialStatus}" não é válido`
  };
}

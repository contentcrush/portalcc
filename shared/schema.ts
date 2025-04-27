import { pgTable, text, serial, integer, timestamp, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  department: text("department"),
  position: text("position"),
  bio: text("bio"),
  avatar: text("avatar"),
  phone: text("phone"),
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
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  client_id: integer("client_id").notNull(),
  status: text("status").notNull().default("draft"),
  budget: doublePrecision("budget"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
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
  due_date: timestamp("due_date"),
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

export const financialDocuments = pgTable("financial_documents", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id"),
  client_id: integer("client_id").notNull(),
  document_type: text("document_type").notNull(),
  document_number: text("document_number"),
  amount: doublePrecision("amount").notNull(),
  due_date: timestamp("due_date"),
  paid: boolean("paid").default(false),
  payment_date: timestamp("payment_date"),
  status: text("status").default("pending"),
  creation_date: timestamp("creation_date").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  project_id: integer("project_id"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  paid_by: integer("paid_by"),
  reimbursement: boolean("reimbursement").default(false),
  receipt: text("receipt"),
  approved: boolean("approved").default(false),
  creation_date: timestamp("creation_date").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  user_id: integer("user_id").notNull(),
  project_id: integer("project_id"),
  client_id: integer("client_id"),
  task_id: integer("task_id"),
  type: text("type").notNull(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  all_day: boolean("all_day").default(false),
  location: text("location"),
  color: text("color"),
  creation_date: timestamp("creation_date").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, creation_date: true });
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({ id: true });
export const insertProjectStageSchema = createInsertSchema(projectStages).omit({ id: true, completion_date: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, creation_date: true, completion_date: true });
export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({ id: true, creation_date: true });
export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({ id: true, upload_date: true });
export const insertClientInteractionSchema = createInsertSchema(clientInteractions).omit({ id: true, date: true });
export const insertFinancialDocumentSchema = createInsertSchema(financialDocuments).omit({ id: true, creation_date: true, payment_date: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, creation_date: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, creation_date: true });

// Select types
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type ProjectStage = typeof projectStages.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskComment = typeof taskComments.$inferSelect;
export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type ClientInteraction = typeof clientInteractions.$inferSelect;
export type FinancialDocument = typeof financialDocuments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Event = typeof events.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type InsertProjectStage = z.infer<typeof insertProjectStageSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type InsertClientInteraction = z.infer<typeof insertClientInteractionSchema>;
export type InsertFinancialDocument = z.infer<typeof insertFinancialDocumentSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// Definição de relações
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks, { relationName: "user_tasks" }),
  projectMembers: many(projectMembers),
  taskComments: many(taskComments),
  taskAttachments: many(taskAttachments),
  clientInteractions: many(clientInteractions),
  expenses: many(expenses),
  events: many(events)
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  clientInteractions: many(clientInteractions),
  financialDocuments: many(financialDocuments),
  events: many(events)
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.client_id],
    references: [clients.id]
  }),
  members: many(projectMembers),
  stages: many(projectStages),
  tasks: many(tasks),
  financialDocuments: many(financialDocuments),
  expenses: many(expenses),
  events: many(events)
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.project_id],
    references: [projects.id]
  }),
  user: one(users, {
    fields: [projectMembers.user_id],
    references: [users.id]
  })
}));

export const projectStagesRelations = relations(projectStages, ({ one }) => ({
  project: one(projects, {
    fields: [projectStages.project_id],
    references: [projects.id]
  })
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.project_id],
    references: [projects.id]
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

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.task_id],
    references: [tasks.id]
  }),
  user: one(users, {
    fields: [taskComments.user_id],
    references: [users.id]
  })
}));

export const taskAttachmentsRelations = relations(taskAttachments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAttachments.task_id],
    references: [tasks.id]
  }),
  uploader: one(users, {
    fields: [taskAttachments.uploaded_by],
    references: [users.id]
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
    references: [projects.id]
  })
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  project: one(projects, {
    fields: [expenses.project_id],
    references: [projects.id]
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
    references: [projects.id]
  }),
  client: one(clients, {
    fields: [events.client_id],
    references: [clients.id]
  }),
  task: one(tasks, {
    fields: [events.task_id],
    references: [tasks.id]
  })
}));

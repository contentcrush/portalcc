import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, insertProjectSchema, insertTaskSchema, 
  insertProjectMemberSchema, insertProjectStageSchema, insertTaskCommentSchema, 
  insertClientInteractionSchema, insertFinancialDocumentSchema, 
  insertExpenseSchema, insertEventSchema 
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, authenticateJWT, requireRole, requirePermission } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticação
  setupAuth(app);

  // Helper function to validate request body
  function validateBody<T extends z.ZodSchema>(schema: T) {
    return (req: Request, res: Response, next: Function) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation error", errors: error.errors });
        } else {
          res.status(500).json({ message: "Internal server error" });
        }
      }
    };
  }

  // Users - requer autenticação e permissões adequadas
  app.get("/api/users", authenticateJWT, requireRole(['admin', 'manager']), async (_req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove senhas da resposta
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verifica se o usuário está solicitando seus próprios dados ou se é admin/manager
      if (req.user!.id !== id && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Você só pode visualizar seu próprio perfil." });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove a senha da resposta
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Clients - Adicionando autenticação e permissões
  app.get("/api/clients", authenticateJWT, async (_req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", authenticateJWT, requirePermission('manage_clients'), validateBody(insertClientSchema), async (req, res) => {
    try {
      const client = await storage.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", authenticateJWT, requirePermission('manage_clients'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedClient = await storage.updateClient(id, req.body);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(updatedClient);
    } catch (error) {
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", authenticateJWT, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Client Interactions
  app.get("/api/clients/:id/interactions", authenticateJWT, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const interactions = await storage.getClientInteractions(clientId);
      res.json(interactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client interactions" });
    }
  });

  app.post("/api/clients/:id/interactions", authenticateJWT, requirePermission('manage_clients'), validateBody(insertClientInteractionSchema), async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const interaction = await storage.createClientInteraction({
        ...req.body,
        client_id: clientId
      });
      res.status(201).json(interaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create client interaction" });
    }
  });

  // Projects - Adicionando autenticação e permissões
  app.get("/api/projects", authenticateJWT, async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", authenticateJWT, requirePermission('manage_projects'), validateBody(insertProjectSchema), async (req, res) => {
    try {
      const project = await storage.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedProject = await storage.updateProject(id, req.body);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", authenticateJWT, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });
  
  // Endpoint para duplicar um projeto
  app.post("/api/projects/:id/duplicate", authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const originalProject = await storage.getProject(projectId);
      
      if (!originalProject) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      
      // Criar novo projeto baseado no original (sem o ID)
      const newProjectData = {
        name: `${originalProject.name} (Cópia)`,
        description: originalProject.description,
        client_id: originalProject.client_id,
        status: originalProject.status,
        budget: originalProject.budget,
        startDate: originalProject.startDate,
        endDate: originalProject.endDate,
        progress: originalProject.progress,
        thumbnail: originalProject.thumbnail,
        creation_date: new Date()
      };
      
      const newProject = await storage.createProject(newProjectData);
      
      // Duplicar estágios do projeto
      const originalStages = await storage.getProjectStages(projectId);
      for (const stage of originalStages) {
        await storage.createProjectStage({
          project_id: newProject.id,
          name: stage.name,
          order: stage.order,
          description: stage.description,
          completed: false // Novo projeto começa com estágios não concluídos
        });
      }
      
      // Duplicar membros da equipe
      const originalMembers = await storage.getProjectMembers(projectId);
      for (const member of originalMembers) {
        await storage.addProjectMember({
          project_id: newProject.id,
          user_id: member.user_id,
          role: member.role
        });
      }
      
      res.json(newProject);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erro ao duplicar projeto" });
    }
  });

  // Project Members - Adicionando autenticação e permissões
  app.get("/api/projects/:id/members", authenticateJWT, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post("/api/projects/:id/members", authenticateJWT, requirePermission('manage_projects'), validateBody(insertProjectMemberSchema), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const member = await storage.addProjectMember({
        ...req.body,
        project_id: projectId
      });
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  app.delete("/api/projects/:projectId/members/:userId", authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      const success = await storage.removeProjectMember(projectId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Project member not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // Project Stages - Adicionando autenticação e permissões
  app.get("/api/projects/:id/stages", authenticateJWT, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const stages = await storage.getProjectStages(projectId);
      res.json(stages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project stages" });
    }
  });

  app.post("/api/projects/:id/stages", authenticateJWT, requirePermission('manage_projects'), validateBody(insertProjectStageSchema), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const stage = await storage.createProjectStage({
        ...req.body,
        project_id: projectId
      });
      res.status(201).json(stage);
    } catch (error) {
      res.status(500).json({ message: "Failed to create project stage" });
    }
  });

  app.patch("/api/projects/:projectId/stages/:stageId", authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
    try {
      const stageId = parseInt(req.params.stageId);
      const updatedStage = await storage.updateProjectStage(stageId, req.body);
      
      if (!updatedStage) {
        return res.status(404).json({ message: "Project stage not found" });
      }
      
      res.json(updatedStage);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project stage" });
    }
  });

  // Tasks - Adicionando autenticação e permissões
  app.get("/api/tasks", authenticateJWT, async (_req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.get("/api/projects/:id/tasks", authenticateJWT, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const tasks = await storage.getTasksByProject(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.get("/api/users/:id/tasks", authenticateJWT, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verifica se o usuário está solicitando suas próprias tarefas ou se é admin/manager
      if (req.user!.id !== userId && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Você só pode visualizar suas próprias tarefas." });
      }
      
      const tasks = await storage.getTasksByUser(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user tasks" });
    }
  });

  app.post("/api/tasks", authenticateJWT, requirePermission('manage_tasks'), validateBody(insertTaskSchema), async (req, res) => {
    try {
      const task = await storage.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", authenticateJWT, requirePermission('manage_tasks'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTask = await storage.updateTask(id, req.body);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", authenticateJWT, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(id);
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task Comments - Adicionando autenticação e permissões
  app.get("/api/tasks/:id/comments", authenticateJWT, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.post("/api/tasks/:id/comments", authenticateJWT, validateBody(insertTaskCommentSchema), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      // Adiciona o ID do usuário autenticado como autor do comentário
      const comment = await storage.createTaskComment({
        ...req.body,
        task_id: taskId,
        user_id: req.user!.id
      });
      
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });

  // Financial Documents - Adicionando autenticação e permissões
  app.get("/api/financial-documents", authenticateJWT, requireRole(['admin', 'manager']), async (_req, res) => {
    try {
      const documents = await storage.getFinancialDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch financial documents" });
    }
  });

  app.get("/api/clients/:id/financial-documents", authenticateJWT, requirePermission('view_financials'), async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const documents = await storage.getFinancialDocumentsByClient(clientId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client financial documents" });
    }
  });

  app.get("/api/projects/:id/financial-documents", authenticateJWT, requirePermission('view_financials'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const documents = await storage.getFinancialDocumentsByProject(projectId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project financial documents" });
    }
  });

  app.post("/api/financial-documents", authenticateJWT, requirePermission('manage_financials'), validateBody(insertFinancialDocumentSchema), async (req, res) => {
    try {
      const document = await storage.createFinancialDocument(req.body);
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to create financial document" });
    }
  });

  app.patch("/api/financial-documents/:id", authenticateJWT, requirePermission('manage_financials'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedDocument = await storage.updateFinancialDocument(id, req.body);
      
      if (!updatedDocument) {
        return res.status(404).json({ message: "Financial document not found" });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      res.status(500).json({ message: "Failed to update financial document" });
    }
  });

  // Expenses - Adicionando autenticação e permissões
  app.get("/api/expenses", authenticateJWT, requirePermission('view_financials'), async (_req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/projects/:id/expenses", authenticateJWT, requirePermission('view_financials'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const expenses = await storage.getExpensesByProject(projectId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project expenses" });
    }
  });

  app.post("/api/expenses", authenticateJWT, requirePermission('manage_financials'), validateBody(insertExpenseSchema), async (req, res) => {
    try {
      const expense = await storage.createExpense(req.body);
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", authenticateJWT, requirePermission('manage_financials'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedExpense = await storage.updateExpense(id, req.body);
      
      if (!updatedExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(updatedExpense);
    } catch (error) {
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  // Events - Adicionando autenticação e permissões
  app.get("/api/events", authenticateJWT, async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/users/:id/events", authenticateJWT, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Verifica se o usuário está solicitando seus próprios eventos ou se é admin/manager
      if (req.user!.id !== userId && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Você só pode visualizar seus próprios eventos." });
      }
      
      const events = await storage.getEventsByUser(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user events" });
    }
  });

  app.get("/api/projects/:id/events", authenticateJWT, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const events = await storage.getEventsByProject(projectId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project events" });
    }
  });

  app.get("/api/clients/:id/events", authenticateJWT, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const events = await storage.getEventsByClient(clientId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client events" });
    }
  });

  app.post("/api/events", authenticateJWT, validateBody(insertEventSchema), async (req, res) => {
    try {
      // Adiciona o ID do usuário autenticado como criador do evento
      const event = await storage.createEvent({
        ...req.body,
        user_id: req.user!.id
      });
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verifica se o usuário é o criador do evento ou admin/manager
      if (event.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Você só pode editar seus próprios eventos." });
      }
      
      const updatedEvent = await storage.updateEvent(id, req.body);
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Verifica se o usuário é o criador do evento ou admin/manager
      if (event.user_id !== req.user!.id && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Você só pode excluir seus próprios eventos." });
      }
      
      const success = await storage.deleteEvent(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

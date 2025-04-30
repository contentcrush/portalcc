import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, insertProjectSchema, insertTaskSchema, 
  insertProjectMemberSchema, insertProjectStageSchema, insertTaskCommentSchema, 
  insertClientInteractionSchema, insertFinancialDocumentSchema, 
  insertExpenseSchema, insertEventSchema, insertUserSchema, insertUserPreferenceSchema
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, authenticateJWT, requireRole, requirePermission } from "./auth";
import { runAutomations, checkOverdueProjects, checkProjectsWithUpdatedDates } from "./automation";

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
  
  // Criar um novo usuário (somente admin)
  app.post("/api/users", authenticateJWT, requireRole(['admin']), validateBody(insertUserSchema), async (req, res) => {
    try {
      // Forçar papel 'viewer' para novos usuários criados pela UI
      const userData = {
        ...req.body,
        role: "viewer" // Garante que novos usuários sejam sempre criados como Visualizadores
      };
      
      const newUser = await storage.createUser(userData);
      
      // Remove a senha da resposta
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Atualizar um usuário existente
  app.put("/api/users/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Só admins podem atualizar outros usuários ou alterar funções
      if (req.user!.id !== id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas admins podem atualizar outros usuários." });
      }
      
      // Só admins podem alterar a função de um usuário
      if (req.body.role && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas admins podem alterar funções de usuários." });
      }
      
      // Verifica se o usuário existe
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Atualiza o usuário
      const updatedUser = await storage.updateUser(id, req.body);
      
      // Remove a senha da resposta
      const userWithoutPassword = { ...updatedUser };
      delete (userWithoutPassword as any).password;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  app.patch("/api/users/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Só admins podem atualizar outros usuários ou alterar funções
      if (req.user!.id !== id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas admins podem atualizar outros usuários." });
      }
      
      // Só admins podem alterar a função de um usuário
      if (req.body.role && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas admins podem alterar funções de usuários." });
      }
      
      // Verifica se o usuário existe
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Atualiza o usuário
      const updatedUser = await storage.updateUser(id, req.body);
      
      // Remove a senha da resposta
      const userWithoutPassword = { ...updatedUser };
      delete (userWithoutPassword as any).password;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Excluir um usuário (somente admin)
  app.delete("/api/users/:id", authenticateJWT, requireRole(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Não permitir que o admin exclua a si mesmo
      if (req.user!.id === id) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta de admin" });
      }
      
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Obter detalhes de um usuário específico (requer admin ou manager)
  app.get("/api/users/:id", authenticateJWT, async (req, res) => {
    try {
      // Verifica se o usuário autenticado é admin ou manager
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Apenas admins e gestores podem visualizar detalhes de usuários." });
      }
      
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remove a senha da resposta
      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as any).password;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error retrieving user:", error);
      res.status(500).json({ message: "Failed to retrieve user details" });
    }
  });
  
  // Obter projetos associados a um usuário (requer admin ou manager)
  app.get("/api/users/:id/projects", authenticateJWT, async (req, res) => {
    try {
      // Verifica se o usuário autenticado é admin ou manager
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Apenas admins e gestores podem visualizar projetos de usuários." });
      }
      
      const userId = parseInt(req.params.id);
      const projects = await storage.getProjectsByUserId(userId);
      
      res.json(projects);
    } catch (error) {
      console.error("Error retrieving user projects:", error);
      res.status(500).json({ message: "Failed to retrieve user projects" });
    }
  });
  
  // Obter tarefas associadas a um usuário (requer admin ou manager)
  app.get("/api/users/:id/tasks", authenticateJWT, async (req, res) => {
    try {
      // Verifica se o usuário autenticado é admin ou manager
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: "Acesso negado. Apenas admins e gestores podem visualizar tarefas de usuários." });
      }
      
      const userId = parseInt(req.params.id);
      const tasks = await storage.getTasksByUserId(userId);
      
      res.json(tasks);
    } catch (error) {
      console.error("Error retrieving user tasks:", error);
      res.status(500).json({ message: "Failed to retrieve user tasks" });
    }
  });
  
  // Obter transações financeiras associadas a um usuário (requer admin)
  app.get("/api/users/:id/transactions", authenticateJWT, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const transactions = await storage.getTransactionsByUserId(userId);
      
      res.json(transactions);
    } catch (error) {
      console.error("Error retrieving user transactions:", error);
      res.status(500).json({ message: "Failed to retrieve user financial transactions" });
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
      // Verificar se o logo está presente e é uma string (URL ou base64)
      if (req.body.logo) {
        // Se é base64, garantir que começa com o formato correto
        if (typeof req.body.logo === 'string' && req.body.logo.length > 0) {
          console.log(`Recebendo logo com ${req.body.logo.length} caracteres`);
          // Garantir que é válido
          if (!req.body.logo.startsWith('data:image/')) {
            console.warn("Formato de logo inválido, deve começar com data:image/");
            // Não salvar um logo inválido
            req.body.logo = null;
          }
        }
      }
      
      // Garantir que a data since é um objeto Date ou null
      if (req.body.since !== undefined && req.body.since !== null) {
        try {
          // Tentar converter para Date se for string
          if (typeof req.body.since === 'string') {
            req.body.since = new Date(req.body.since);
            console.log(`Data convertida para: ${req.body.since}`);
          }
          
          // Verificar se é uma data válida
          if (!(req.body.since instanceof Date) || isNaN(req.body.since.getTime())) {
            console.warn("Data 'since' inválida, definindo como null");
            req.body.since = null;
          }
        } catch (e) {
          console.warn("Erro ao processar data 'since', definindo como null:", e);
          req.body.since = null;
        }
      }

      const client = await storage.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      res.status(500).json({ message: "Failed to create client", error: String(error) });
    }
  });

  app.patch("/api/clients/:id", authenticateJWT, requirePermission('manage_clients'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o logo está presente e é uma string (URL ou base64)
      if (req.body.logo) {
        // Se é base64, garantir que começa com o formato correto
        if (typeof req.body.logo === 'string' && req.body.logo.length > 0) {
          console.log(`Atualizando: Recebendo logo com ${req.body.logo.length} caracteres`);
          // Garantir que é válido
          if (!req.body.logo.startsWith('data:image/')) {
            console.warn("Atualizando: Formato de logo inválido, deve começar com data:image/");
            // Não salvar um logo inválido
            req.body.logo = null;
          }
        }
      }
      
      // Garantir que a data since é um objeto Date ou null
      if (req.body.since !== undefined && req.body.since !== null) {
        try {
          // Tentar converter para Date se for string
          if (typeof req.body.since === 'string') {
            req.body.since = new Date(req.body.since);
            console.log(`Data convertida para: ${req.body.since}`);
          }
          
          // Verificar se é uma data válida
          if (!(req.body.since instanceof Date) || isNaN(req.body.since.getTime())) {
            console.warn("Data 'since' inválida, definindo como null");
            req.body.since = null;
          }
        } catch (e) {
          console.warn("Erro ao processar data 'since', definindo como null:", e);
          req.body.since = null;
        }
      }
      
      const updatedClient = await storage.updateClient(id, req.body);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(updatedClient);
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      res.status(500).json({ message: "Failed to update client", error: String(error) });
    }
  });
  
  // Rota OPTIONS para obter informações sobre itens relacionados sem excluir o cliente
  app.options("/api/clients/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o cliente existe
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Contar itens relacionados
      const projects = await storage.getProjectsByClient(id);
      const interactions = await storage.getClientInteractions(id);
      const financialDocuments = await storage.getFinancialDocumentsByClient(id);
      
      res.json({
        client,
        relatedItems: {
          projects: projects.length,
          interactions: interactions.length,
          financialDocuments: financialDocuments.length
        }
      });
    } catch (error) {
      console.error("Erro ao obter informações relacionadas ao cliente:", error);
      res.status(500).json({ message: "Falha ao obter informações relacionadas ao cliente" });
    }
  });

  // Excluir cliente
  app.delete("/api/clients/:id", authenticateJWT, requirePermission('manage_clients'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o cliente existe
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Excluir o cliente
      const result = await storage.deleteClient(id);
      
      if (!result.success) {
        return res.status(500).json({ message: "Não foi possível excluir o cliente" });
      }
      
      res.status(200).json({ 
        message: "Cliente excluído com sucesso",
        deletedItems: result.deletedItems
      });
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      res.status(500).json({ message: "Falha ao excluir cliente" });
    }
  });

  // Client Interactions
  // Obter projetos de um cliente específico
  app.get("/api/clients/:id/projects", authenticateJWT, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const projects = await storage.getProjectsByClient(clientId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client projects" });
    }
  });
  
  // Obter documentos financeiros de um cliente específico
  app.get("/api/clients/:id/financial-documents", authenticateJWT, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const documents = await storage.getFinancialDocumentsByClient(clientId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client financial documents" });
    }
  });
  
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
      // O Zod já está fazendo a conversão de string para Date através do transform no schema
      const project = await storage.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", authenticateJWT, requirePermission('manage_projects'), validateBody(insertProjectSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // O Zod já está fazendo a conversão de string para Date através do transform no schema
      const updatedProject = await storage.updateProject(id, req.body);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Após atualizar um projeto, verificar se ele deve ser marcado como atrasado
      // Isso é especialmente importante quando a data de entrega é atualizada para uma data no passado
      if (updatedProject.status && 
          ['proposta', 'pre_producao', 'producao', 'pos_revisao'].includes(updatedProject.status)) {
        
        const endDate = new Date(updatedProject.endDate);
        const today = new Date();
        
        // Se a data de entrega já passou e o projeto está em fase de desenvolvimento
        if (endDate < today) {
          console.log(`[Automação] Projeto ${id} foi atualizado com data de entrega (${endDate.toISOString()}) no passado. Verificando status...`);
          
          // Verificar se o projeto está atrasado
          await checkOverdueProjects();
          
          // Recarregar o projeto para retornar o status mais atualizado
          const refreshedProject = await storage.getProject(id);
          if (refreshedProject) {
            return res.json(refreshedProject);
          }
        }
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Adicionar PUT como alternativa ao PATCH (para compatibilidade com alguns clientes)
  app.put("/api/projects/:id", authenticateJWT, requirePermission('manage_projects'), validateBody(insertProjectSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // O Zod já está fazendo a conversão de string para Date através do transform no schema
      const updatedProject = await storage.updateProject(id, req.body);
      
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Após atualizar um projeto, verificar se ele deve ser marcado como atrasado
      // Isso é especialmente importante quando a data de entrega é atualizada para uma data no passado
      if (updatedProject.status && 
          ['proposta', 'pre_producao', 'producao', 'pos_revisao'].includes(updatedProject.status)) {
        
        const endDate = new Date(updatedProject.endDate);
        const today = new Date();
        
        // Se a data de entrega já passou e o projeto está em fase de desenvolvimento
        if (endDate < today) {
          console.log(`[Automação] Projeto ${id} foi atualizado com data de entrega (${endDate.toISOString()}) no passado. Verificando status...`);
          
          // Verificar se o projeto está atrasado
          await checkOverdueProjects();
          
          // Recarregar o projeto para retornar o status mais atualizado
          const refreshedProject = await storage.getProject(id);
          if (refreshedProject) {
            return res.json(refreshedProject);
          }
        }
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project with PUT:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.post("/api/projects/:id/duplicate", authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const duplicatedProject = await storage.duplicateProject(id);
      
      if (!duplicatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(201).json(duplicatedProject);
    } catch (error) {
      console.error("Error duplicating project:", error);
      res.status(500).json({ message: "Failed to duplicate project" });
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

  app.post("/api/projects/:id/members", authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log('Tentando adicionar membro ao projeto:', projectId);
      console.log('Dados recebidos:', req.body);
      
      // Garantir que project_id seja numérico explicitamente
      const memberData = {
        ...req.body,
        project_id: projectId,
        user_id: typeof req.body.user_id === 'string' ? parseInt(req.body.user_id, 10) : req.body.user_id
      };
      
      console.log('Dados após transformação:', memberData);
      
      // Validação com o schema que agora trata conversões de string para número
      try {
        const validatedData = insertProjectMemberSchema.parse(memberData);
        console.log('Dados validados:', validatedData);
        
        const member = await storage.addProjectMember(validatedData);
        console.log('Membro adicionado com sucesso:', member);
        res.status(201).json(member);
      } catch (validationError) {
        console.error('Erro de validação:', validationError);
        if (validationError instanceof z.ZodError) {
          res.status(400).json({ message: "Validation error", errors: validationError.errors });
        } else {
          throw validationError; // passa para o catch externo
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      res.status(500).json({ message: "Failed to add project member", error: error.message });
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

  app.post("/api/tasks", authenticateJWT, requirePermission('manage_tasks'), async (req, res) => {
    try {
      console.log("Recebendo dados do cliente:", JSON.stringify(req.body, null, 2));
      
      // Tentar validar manualmente para verificar onde está o erro
      try {
        const validatedData = insertTaskSchema.parse(req.body);
        console.log("Dados validados com sucesso:", JSON.stringify(validatedData, null, 2));
        
        const task = await storage.createTask(validatedData);
        res.status(201).json(task);
      } catch (validationError) {
        console.error("Erro de validação:", validationError);
        res.status(400).json({ 
          message: "Erro de validação na criação da tarefa", 
          errors: validationError.errors || validationError.message 
        });
      }
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", authenticateJWT, requirePermission('manage_tasks'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Limpa campos de data quando são strings vazias
      const cleanedData = { ...req.body };
      if (cleanedData.start_date === '') cleanedData.start_date = null;
      if (cleanedData.due_date === '') cleanedData.due_date = null;
      if (cleanedData.estimated_hours === '') cleanedData.estimated_hours = null;
      
      // Conversão de datas de string para Date
      if (cleanedData.start_date && typeof cleanedData.start_date === 'string') {
        cleanedData.start_date = new Date(cleanedData.start_date);
      }
      
      if (cleanedData.due_date && typeof cleanedData.due_date === 'string') {
        cleanedData.due_date = new Date(cleanedData.due_date);
      }
      
      // Verifica se o campo de conclusão foi marcado
      if (cleanedData.completed === true && cleanedData.completion_date === undefined) {
        cleanedData.completion_date = new Date();
      } else if (cleanedData.completed === false) {
        cleanedData.completion_date = null;
      }
      
      console.log("Atualizando tarefa:", id, cleanedData);
      
      const updatedTask = await storage.updateTask(id, cleanedData);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      res.status(500).json({ message: "Failed to update task", error: String(error) });
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

  app.post("/api/tasks/:id/comments", authenticateJWT, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      if (!req.body.comment) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: [{ code: "invalid_type", expected: "string", received: "undefined", path: ["comment"], message: "Required" }] 
        });
      }
      
      // Adiciona o ID do usuário autenticado como autor do comentário
      const comment = await storage.createTaskComment({
        comment: req.body.comment,
        task_id: taskId,
        user_id: req.user!.id
      });
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });
  
  // Task Attachments - Rotas para gerenciar anexos de tarefas
  app.get("/api/tasks/:id/attachments", authenticateJWT, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const attachments = await storage.getTaskAttachments(taskId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching task attachments:", error);
      res.status(500).json({ message: "Failed to fetch task attachments" });
    }
  });
  
  app.post("/api/tasks/:id/attachments", authenticateJWT, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      if (!req.body.file_name || !req.body.file_url) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: [{ code: "invalid_type", path: ["file_name", "file_url"], message: "Required fields missing" }] 
        });
      }
      
      // Adiciona o ID do usuário autenticado e a tarefa
      const attachment = await storage.createTaskAttachment({
        ...req.body,
        task_id: taskId,
        uploaded_by: req.user!.id
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error creating task attachment:", error);
      res.status(500).json({ message: "Failed to create task attachment" });
    }
  });
  
  app.delete("/api/tasks/attachments/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o anexo existe e se o usuário tem permissão
      const attachment = await storage.getTaskAttachment(id);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Verificar se o usuário é o criador do anexo ou tem permissão de administrador/gerente
      if (attachment.uploaded_by !== req.user!.id && 
          req.user!.role !== 'admin' && 
          req.user!.role !== 'manager') {
        return res.status(403).json({ 
          message: "Permission denied. You can only delete your own attachments." 
        });
      }
      
      const success = await storage.deleteTaskAttachment(id);
      if (!success) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting task attachment:", error);
      res.status(500).json({ message: "Failed to delete task attachment" });
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
  
  // User Preferences - Rotas para gerenciar preferências do usuário
  app.get("/api/user-preferences", authenticateJWT, async (req, res) => {
    try {
      const userId = req.user!.id;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || { theme: 'light', accent_color: 'blue', clients_view_mode: 'grid' });
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.post("/api/user-preferences", authenticateJWT, validateBody(insertUserPreferenceSchema), async (req, res) => {
    try {
      const userId = req.user!.id;
      // Verifica se já existem preferências para este usuário
      const existingPrefs = await storage.getUserPreferences(userId);
      
      if (existingPrefs) {
        // Atualiza as preferências existentes
        const updatedPrefs = await storage.updateUserPreferences(userId, req.body);
        return res.json(updatedPrefs);
      } else {
        // Cria novas preferências
        const prefData = {
          ...req.body,
          user_id: userId
        };
        const newPrefs = await storage.createUserPreferences(prefData);
        return res.status(201).json(newPrefs);
      }
    } catch (error) {
      console.error("Error saving user preferences:", error);
      res.status(500).json({ message: "Failed to save user preferences" });
    }
  });

  app.patch("/api/user-preferences", authenticateJWT, async (req, res) => {
    try {
      const userId = req.user!.id;
      // Verifica se existem preferências para este usuário
      const existingPrefs = await storage.getUserPreferences(userId);
      
      if (!existingPrefs) {
        // Se não existir, cria um novo
        const prefData = {
          ...req.body,
          user_id: userId,
          theme: req.body.theme || 'light',
          accent_color: req.body.accent_color || 'blue',
          clients_view_mode: req.body.clients_view_mode || 'grid',
          sidebar_collapsed: req.body.sidebar_collapsed !== undefined ? req.body.sidebar_collapsed : false,
          dashboard_widgets: req.body.dashboard_widgets || ['tasks', 'projects', 'clients'],
          quick_actions: req.body.quick_actions || ['new-task', 'new-project', 'new-client']
        };
        const newPrefs = await storage.createUserPreferences(prefData);
        return res.status(201).json(newPrefs);
      }
      
      // Atualiza apenas os campos fornecidos
      const updatedPrefs = await storage.updateUserPreferences(userId, req.body);
      return res.json(updatedPrefs);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Endpoint para verificação manual de projetos atrasados (apenas admin)
  app.post("/api/automation/check-overdue", authenticateJWT, requireRole(['admin']), async (_req, res) => {
    try {
      const result = await checkOverdueProjects();
      res.json(result);
    } catch (error) {
      console.error("Erro ao executar verificação de projetos atrasados:", error);
      res.status(500).json({ 
        message: "Falha ao executar verificação de projetos atrasados",
        error: String(error)
      });
    }
  });
  
  // Endpoint para executar todas as automações (apenas admin)
  app.post("/api/automation/run-all", authenticateJWT, requireRole(['admin']), async (_req, res) => {
    try {
      const result = await runAutomations();
      res.json(result);
    } catch (error) {
      console.error("Erro ao executar automações:", error);
      res.status(500).json({ 
        message: "Falha ao executar automações",
        error: String(error)
      });
    }
  });

  const httpServer = createServer(app);
  
  // Executar automações ao iniciar o servidor
  console.log("🤖 Iniciando automações do sistema...");
  runAutomations()
    .then(result => {
      console.log(`🤖 Automações iniciais concluídas, ${result.overdue.updatedCount || 0} projetos atualizados`);
    })
    .catch(error => {
      console.error("🤖 Erro ao executar automações iniciais:", error);
    });
  
  return httpServer;
}

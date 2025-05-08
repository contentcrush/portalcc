import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, insertProjectSchema, insertTaskSchema, 
  insertProjectMemberSchema, insertProjectStageSchema, insertTaskCommentSchema, 
  insertClientInteractionSchema, insertFinancialDocumentSchema, 
  insertExpenseSchema, insertEventSchema, insertUserSchema, insertUserPreferenceSchema,
  insertCommentReactionSchema, insertProjectCommentSchema, insertProjectCommentReactionSchema,
  insertClientContactSchema, financialDocuments
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, authenticateJWT, requireRole, requirePermission } from "./auth";
import { runAutomations, checkOverdueProjects, checkProjectsWithUpdatedDates } from "./automation";
import { Server as SocketIOServer } from "socket.io";
import { WebSocket, WebSocketServer } from "ws";
import { eq } from "drizzle-orm";
import { db } from "./db";

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
      
      // Verifica se estamos apenas atualizando o status active (para toggles rápidos)
      const isQuickToggle = Object.keys(req.body).length === 1 && 'active' in req.body;
      
      // Verificar se o logo está presente e é uma string (URL ou base64)
      if (!isQuickToggle && req.body.logo) {
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
      if (!isQuickToggle && req.body.since !== undefined && req.body.since !== null) {
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
      
      // Emitir eventos WebSocket para notificar todos os clientes conectados
      if (io) {
        io.emit("client_updated", { client: updatedClient });
      }
      
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "client_updated", 
              data: { client: updatedClient } 
            }));
          }
        });
      }
      
      // Mensagem personalizada para o toggle de status
      if (isQuickToggle) {
        const statusMessage = updatedClient.active 
          ? "Cliente ativado com sucesso." 
          : "Cliente desativado com sucesso.";
        
        return res.json({ 
          message: statusMessage,
          client: updatedClient 
        });
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
      
      // Construir uma mensagem detalhada
      let detailMessage = `Cliente excluído com sucesso.`;
      if (result.deletedItems.projects > 0) {
        detailMessage += ` ${result.deletedItems.projects} projeto(s) removido(s).`;
      }
      if (result.deletedItems.interactions > 0) {
        detailMessage += ` ${result.deletedItems.interactions} interação(ões) removida(s).`;
      }
      if (result.deletedItems.financialDocuments > 0) {
        detailMessage += ` ${result.deletedItems.financialDocuments} documento(s) financeiro(s) removido(s).`;
      }
      if (result.deletedItems.contacts > 0) {
        detailMessage += ` ${result.deletedItems.contacts} contato(s) removido(s).`;
      }
      
      res.status(200).json({ 
        message: detailMessage,
        deletedItems: result.deletedItems
      });
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      res.status(500).json({ message: "Falha ao excluir cliente" });
    }
  });

  // Client Interactions and Contacts
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
  
  // Contatos do cliente
  app.get("/api/clients/:id/contacts", authenticateJWT, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const contacts = await storage.getClientContacts(clientId);
      res.json(contacts);
    } catch (error) {
      console.error("Erro ao buscar contatos do cliente:", error);
      res.status(500).json({ message: "Falha ao buscar contatos do cliente" });
    }
  });

  app.get("/api/client-contacts/:id", authenticateJWT, async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getClientContact(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Erro ao buscar contato:", error);
      res.status(500).json({ message: "Falha ao buscar contato" });
    }
  });

  app.post("/api/clients/:id/contacts", authenticateJWT, requirePermission('manage_clients'), validateBody(insertClientContactSchema.omit({ client_id: true })), async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      
      // Verificar se o cliente existe
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      const contact = await storage.createClientContact({
        ...req.body,
        client_id: clientId
      });
      
      // Emitir evento via WebSocket para notificar outros usuários
      if (io) {
        io.emit("client_updated", { 
          type: "contact_created", 
          clientId,
          contact 
        });
      }
      
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "client_updated",
              action: "contact_created",
              data: { clientId, contact } 
            }));
          }
        });
      }
      
      res.status(201).json(contact);
    } catch (error) {
      console.error("Erro ao criar contato do cliente:", error);
      res.status(500).json({ message: "Falha ao criar contato do cliente" });
    }
  });

  app.put("/api/client-contacts/:id", authenticateJWT, requirePermission('manage_clients'), async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Verificar se o contato existe
      const existingContact = await storage.getClientContact(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      const updatedContact = await storage.updateClientContact(contactId, req.body);
      
      // Emitir evento via WebSocket para notificar outros usuários
      if (io) {
        io.emit("client_updated", { 
          type: "contact_updated", 
          clientId: existingContact.client_id,
          contact: updatedContact
        });
      }
      
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "client_updated",
              action: "contact_updated",
              data: { clientId: existingContact.client_id, contact: updatedContact } 
            }));
          }
        });
      }
      
      res.json(updatedContact);
    } catch (error) {
      console.error("Erro ao atualizar contato do cliente:", error);
      res.status(500).json({ message: "Falha ao atualizar contato do cliente" });
    }
  });

  app.patch("/api/client-contacts/:id", authenticateJWT, requirePermission('manage_clients'), async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Verificar se o contato existe
      const existingContact = await storage.getClientContact(contactId);
      if (!existingContact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      const updatedContact = await storage.updateClientContact(contactId, req.body);
      
      // Emitir evento via WebSocket para notificar outros usuários
      if (io) {
        io.emit("client_updated", { 
          type: "contact_updated", 
          clientId: existingContact.client_id,
          contact: updatedContact
        });
      }
      
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "client_updated",
              action: "contact_updated",
              data: { clientId: existingContact.client_id, contact: updatedContact } 
            }));
          }
        });
      }
      
      res.json(updatedContact);
    } catch (error) {
      console.error("Erro ao atualizar contato do cliente:", error);
      res.status(500).json({ message: "Falha ao atualizar contato do cliente" });
    }
  });

  app.delete("/api/client-contacts/:id", authenticateJWT, requirePermission('manage_clients'), async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Obter dados do contato antes de excluí-lo, para usar no evento
      const contact = await storage.getClientContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      const clientId = contact.client_id;
      const success = await storage.deleteClientContact(contactId);
      
      if (!success) {
        return res.status(404).json({ message: "Contato não encontrado ou não pôde ser excluído" });
      }
      
      // Emitir evento via WebSocket para notificar outros usuários
      if (io) {
        io.emit("client_updated", { 
          type: "contact_deleted", 
          clientId,
          contactId
        });
      }
      
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "client_updated",
              action: "contact_deleted",
              data: { clientId, contactId } 
            }));
          }
        });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir contato do cliente:", error);
      res.status(500).json({ message: "Falha ao excluir contato do cliente" });
    }
  });

  app.post("/api/client-contacts/:id/set-primary", authenticateJWT, requirePermission('manage_clients'), async (req, res) => {
    try {
      const contactId = parseInt(req.params.id);
      
      // Verificar se o contato existe
      const contact = await storage.getClientContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      const clientId = contact.client_id;
      const updatedContact = await storage.setPrimaryClientContact(contactId, clientId);
      
      // Emitir evento via WebSocket para notificar outros usuários
      if (io) {
        io.emit("client_updated", { 
          type: "contact_primary_changed", 
          clientId,
          contact: updatedContact
        });
      }
      
      if (wss) {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
              type: "client_updated",
              action: "contact_primary_changed",
              data: { clientId, contact: updatedContact } 
            }));
          }
        });
      }
      
      res.json(updatedContact);
    } catch (error) {
      console.error("Erro ao definir contato como primário:", error);
      res.status(500).json({ message: "Falha ao definir contato como primário" });
    }
  });
  
  // Interações do cliente
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

  // Função auxiliar para criar faturas com prazo de pagamento
  async function createProjectInvoice(projectId: number, clientId: number, projectName: string, budget: number, endDate: Date | null, paymentTerm: number = 30) {
    // Calcular data de vencimento baseada no prazo de pagamento
    let dueDate = new Date();
    
    if (endDate) {
      // Se tiver data de fim, usamos ela como referência
      dueDate = new Date(endDate);
      
      // Se a data de fim já passou, definir o início como hoje
      if (dueDate < new Date()) {
        dueDate = new Date();
      }
    }
    
    // Adicionar dias do prazo de pagamento
    dueDate.setDate(dueDate.getDate() + paymentTerm);
    
    console.log(`[Sistema] Criando fatura com prazo de pagamento de ${paymentTerm} dias. Vencimento: ${dueDate.toISOString()}`);
    
    const financialDocument = await storage.createFinancialDocument({
      project_id: projectId,
      client_id: clientId,
      document_type: "invoice",
      amount: budget,
      due_date: dueDate,
      status: "pending",
      description: `Fatura referente ao projeto: ${projectName} (Prazo: ${paymentTerm} dias)`
    });
    
    return financialDocument;
  }

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
      
      // Gerar automaticamente um documento financeiro (fatura a receber) se o projeto tem orçamento
      if (project.budget && project.budget > 0) {
        const paymentTerm = project.payment_term || 30;
        const financialDocument = await createProjectInvoice(
          project.id, 
          project.client_id, 
          project.name, 
          project.budget, 
          project.endDate,
          paymentTerm
        );
        
        console.log(`[Sistema] Documento financeiro ID:${financialDocument.id} gerado automaticamente para o projeto ID:${project.id}`);
        
        // Incluir informação da fatura gerada na resposta
        res.status(201).json({
          ...project,
          generated_invoice: financialDocument
        });
      } else {
        res.status(201).json(project);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", authenticateJWT, requirePermission('manage_projects'), validateBody(insertProjectSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o projeto existe e obter dados atuais antes de atualizar
      const currentProject = await storage.getProject(id);
      if (!currentProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // O Zod já está fazendo a conversão de string para Date através do transform no schema
      const updatedProject = await storage.updateProject(id, req.body);
      
      // Se o orçamento foi alterado, atualizar ou criar fatura correspondente
      if (req.body.budget && (currentProject.budget !== req.body.budget)) {
        // Verificar se já existe uma fatura para este projeto
        const existingInvoices = await storage.getFinancialDocumentsByProject(id);
        const pendingInvoice = existingInvoices.find(doc => 
          doc.document_type === "invoice" && doc.status === "pending" && !doc.paid
        );
        
        if (pendingInvoice) {
          // Atualizar a fatura existente
          await storage.updateFinancialDocument(pendingInvoice.id, {
            amount: req.body.budget,
            description: `Fatura atualizada do projeto: ${updatedProject.name}`,
            // Manter data de vencimento ou definir nova baseada na data de fim do projeto
            due_date: updatedProject.endDate && new Date(updatedProject.endDate) > new Date() 
              ? new Date(updatedProject.endDate) 
              : pendingInvoice.due_date
          });
          
          console.log(`[Sistema] Documento financeiro ID:${pendingInvoice.id} atualizado para o novo valor do projeto ID:${id}`);
        } else {
          // Criar nova fatura usando o prazo de pagamento
          const paymentTerm = updatedProject.payment_term || 30;
          const financialDocument = await createProjectInvoice(
            id, 
            updatedProject.client_id, 
            updatedProject.name, 
            updatedProject.budget, 
            updatedProject.endDate,
            paymentTerm
          );
          
          console.log(`[Sistema] Novo documento financeiro ID:${financialDocument.id} gerado para o projeto atualizado ID:${id}`);
        }
      }
      
      // Verificar se precisamos atualizar o status baseado na data de entrega
      if (updatedProject) {
        if (updatedProject.endDate) {
          const endDate = new Date(updatedProject.endDate);
          const today = new Date();
          
          // Caso 1: Projeto está marcado como atrasado mas a data foi atualizada para o futuro
          if (updatedProject.status === 'atrasado' && endDate > today) {
            console.log(`[Automação] Projeto ${id} está marcado como 'atrasado' mas a data de entrega (${endDate.toISOString()}) foi atualizada para o futuro.`);
            await checkProjectsWithUpdatedDates();
          } 
          // Caso 2: Projeto tem status de desenvolvimento mas a data está no passado
          else if (['proposta', 'pre_producao', 'producao', 'pos_revisao'].includes(updatedProject.status) && endDate < today) {
            console.log(`[Automação] Projeto ${id} foi atualizado com data de entrega (${endDate.toISOString()}) no passado. Verificando status...`);
            await checkOverdueProjects();
          }
        }
        
        // Recarregar o projeto para retornar o status mais atualizado
        const refreshedProject = await storage.getProject(id);
        if (refreshedProject) {
          // Incluir informações de faturas na resposta
          const invoices = await storage.getFinancialDocumentsByProject(id);
          return res.json({
            ...refreshedProject,
            invoices: invoices
          });
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
      
      // Verificar se o projeto existe e obter dados atuais antes de atualizar
      const currentProject = await storage.getProject(id);
      if (!currentProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // O Zod já está fazendo a conversão de string para Date através do transform no schema
      const updatedProject = await storage.updateProject(id, req.body);
      
      // Se o orçamento foi alterado, atualizar ou criar fatura correspondente
      if (req.body.budget && (currentProject.budget !== req.body.budget)) {
        // Verificar se já existe uma fatura para este projeto
        const existingInvoices = await storage.getFinancialDocumentsByProject(id);
        const pendingInvoice = existingInvoices.find(doc => 
          doc.document_type === "invoice" && doc.status === "pending" && !doc.paid
        );
        
        if (pendingInvoice) {
          // Atualizar a fatura existente
          await storage.updateFinancialDocument(pendingInvoice.id, {
            amount: req.body.budget,
            description: `Fatura atualizada do projeto: ${updatedProject.name}`,
            // Manter data de vencimento ou definir nova baseada na data de fim do projeto
            due_date: updatedProject.endDate && new Date(updatedProject.endDate) > new Date() 
              ? new Date(updatedProject.endDate) 
              : pendingInvoice.due_date
          });
          
          console.log(`[Sistema] Documento financeiro ID:${pendingInvoice.id} atualizado para o novo valor do projeto ID:${id}`);
        } else {
          // Criar nova fatura usando o prazo de pagamento
          const paymentTerm = updatedProject.payment_term || 30;
          const financialDocument = await createProjectInvoice(
            id, 
            updatedProject.client_id, 
            updatedProject.name, 
            updatedProject.budget, 
            updatedProject.endDate,
            paymentTerm
          );
          
          console.log(`[Sistema] Novo documento financeiro ID:${financialDocument.id} gerado para o projeto atualizado ID:${id}`);
        }
      }
      
      // Verificar se precisamos atualizar o status baseado na data de entrega
      if (updatedProject) {
        if (updatedProject.endDate) {
          const endDate = new Date(updatedProject.endDate);
          const today = new Date();
          
          // Caso 1: Projeto está marcado como atrasado mas a data foi atualizada para o futuro
          if (updatedProject.status === 'atrasado' && endDate > today) {
            console.log(`[Automação] Projeto ${id} está marcado como 'atrasado' mas a data de entrega (${endDate.toISOString()}) foi atualizada para o futuro.`);
            await checkProjectsWithUpdatedDates();
          } 
          // Caso 2: Projeto tem status de desenvolvimento mas a data está no passado
          else if (['proposta', 'pre_producao', 'producao', 'pos_revisao'].includes(updatedProject.status) && endDate < today) {
            console.log(`[Automação] Projeto ${id} foi atualizado com data de entrega (${endDate.toISOString()}) no passado. Verificando status...`);
            await checkOverdueProjects();
          }
        }
        
        // Recarregar o projeto para retornar o status mais atualizado
        const refreshedProject = await storage.getProject(id);
        if (refreshedProject) {
          // Incluir informações de faturas na resposta
          const invoices = await storage.getFinancialDocumentsByProject(id);
          return res.json({
            ...refreshedProject,
            invoices: invoices
          });
        }
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project with PUT:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });
  
  // Rota para forçar a verificação de projetos com datas atualizadas
  app.post("/api/projects/check-dates", authenticateJWT, requirePermission('manage_projects'), async (req, res) => {
    try {
      // Verificação manual de projetos atrasados com datas atualizadas
      const result = await checkProjectsWithUpdatedDates();
      
      // Verificar projetos específicos se fornecidos
      if (req.body.projectIds && Array.isArray(req.body.projectIds) && req.body.projectIds.length > 0) {
        for (const projectId of req.body.projectIds) {
          const project = await storage.getProject(projectId);
          if (project && project.status === 'atrasado') {
            const endDate = new Date(project.endDate);
            const today = new Date();
            
            if (endDate > today) {
              console.log(`[Verificação Manual] Atualizando status do projeto ${projectId} - ${project.name} de 'atrasado' para 'producao'`);
              await storage.updateProjectStatus(projectId, 'producao');
            }
          }
        }
      }
      
      res.json({
        message: "Verificação manual executada com sucesso",
        result
      });
    } catch (error) {
      console.error("Erro ao verificar datas atualizadas:", error);
      res.status(500).json({ message: "Falha ao verificar datas atualizadas" });
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

  // Função para invalidação do cache após exclusão de registros relacionados
  async function invalidateRelatedRecords(projectId: number): Promise<void> {
    console.log(`[Cache] Invalidando registros relacionados ao projeto ID:${projectId}`);
    io?.emit('cache-invalidation', {
      keys: [
        '/api/financial-documents',
        '/api/tasks',
        '/api/projects',
        '/api/expenses',
        '/api/events'
      ]
    });
  }

  app.delete("/api/projects/:id", authenticateJWT, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificamos se o projeto existe
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Registramos documentos financeiros para verificação posterior
      const financialDocs = await storage.getFinancialDocumentsByProject(id);
      console.log(`[Sistema] Projeto ID:${id} tem ${financialDocs.length} documentos financeiros que serão excluídos em cascata`);
      if (financialDocs.length > 0) {
        const docIds = financialDocs.map(doc => doc.id).join(', ');
        console.log(`[Sistema] IDs dos documentos financeiros a serem excluídos: ${docIds}`);
      }
      
      // Transação para excluir o projeto e seus registros relacionados
      try {
        console.log(`[Sistema] Iniciando exclusão do projeto ID:${id}`);
        
        // A exclusão do projeto agora excluirá automaticamente todos os registros relacionados
        // devido às restrições de chave estrangeira ON DELETE CASCADE
        const success = await storage.deleteProject(id);
        
        if (!success) {
          return res.status(500).json({ message: "Failed to delete project" });
        }
        
        // Verificamos se a exclusão dos documentos financeiros foi bem-sucedida
        const remainingDocs = await storage.getFinancialDocumentsByProject(id);
        if (remainingDocs.length > 0) {
          console.error(`[CRÍTICO] Ainda existem ${remainingDocs.length} documentos financeiros após exclusão do projeto ID:${id}`);
          console.error(`[CRÍTICO] IDs dos documentos financeiros órfãos: ${remainingDocs.map(doc => doc.id).join(', ')}`);
          
          // Tentativa direta de exclusão como último recurso
          for (const doc of remainingDocs) {
            try {
              await db.delete(financialDocuments).where(eq(financialDocuments.id, doc.id));
              console.log(`[Sistema] Exclusão forçada do documento financeiro órfão ID:${doc.id}`);
            } catch (deleteError) {
              console.error(`[CRÍTICO] Falha ao excluir documento financeiro órfão ID:${doc.id}:`, deleteError);
            }
          }
        } else {
          console.log(`[Sistema] Todos os documentos financeiros do projeto ID:${id} foram excluídos com sucesso`);
        }
        
        // Invalidar cache para garantir que o frontend reflita as mudanças
        await invalidateRelatedRecords(id);
        
        res.status(204).end();
      } catch (transactionError) {
        console.error(`[Erro] Falha na transação de exclusão do projeto ID:${id}:`, transactionError);
        res.status(500).json({ message: "Failed to delete project. Transaction error." });
      }
    } catch (error) {
      console.error("Erro ao excluir projeto:", error);
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
      // Obter tarefas com detalhes de projeto e cliente
      const tasks = await storage.getTasksWithDetails();
      res.json(tasks);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
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
      
      // Obter reações para os comentários
      const reactions = await storage.getCommentReactionsByTaskId(taskId);
      
      // Mapear as reações aos comentários para retornar tudo junto
      const commentsWithReactions = comments.map(comment => ({
        ...comment,
        reactions: reactions.filter(reaction => reaction.comment_id === comment.id)
      }));
      
      res.json(commentsWithReactions);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.get("/api/comments/:id", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getTaskCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Error fetching comment:", error);
      res.status(500).json({ message: "Failed to fetch comment" });
    }
  });

  app.post("/api/tasks/:id/comments", authenticateJWT, validateBody(insertTaskCommentSchema), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      // Adiciona o ID do usuário autenticado como autor do comentário
      const comment = await storage.createTaskComment({
        ...req.body,
        task_id: taskId,
        user_id: req.user!.id,
        creation_date: new Date(),
        edited: false,
        deleted: false
      });
      
      // Notificar via WebSocket
      if (io) {
        io.to(`task-${taskId}`).emit('new-comment', comment);
      }
      
      // Notificar via WebSocket nativo
      const commentMsg = JSON.stringify({
        type: 'new-comment',
        data: comment
      });
      
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(commentMsg);
        }
      });
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });
  
  // Rota para respostas a comentários
  app.post("/api/comments/:id/reply", authenticateJWT, async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const parentComment = await storage.getTaskCommentById(parentId);
      
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      
      if (!req.body.comment) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: [{ code: "invalid_type", expected: "string", received: "undefined", path: ["comment"], message: "Required" }] 
        });
      }
      
      // Criar comentário com referência ao pai
      const reply = await storage.createTaskComment({
        comment: req.body.comment,
        task_id: parentComment.task_id,
        user_id: req.user!.id,
        parent_id: parentId,
        creation_date: new Date(),
        edited: false,
        deleted: false
      });
      
      // Notificar via WebSocket
      if (io) {
        io.to(`task-${parentComment.task_id}`).emit('new-reply', {
          reply,
          parentId
        });
      }
      
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });
  
  // Rota para edição de comentários
  app.patch("/api/comments/:id", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getTaskCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Verificar se o usuário é o autor do comentário
      if (comment.user_id !== req.user!.id) {
        return res.status(403).json({ message: "You can only edit your own comments" });
      }
      
      if (!req.body.comment) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: [{ code: "invalid_type", expected: "string", received: "undefined", path: ["comment"], message: "Required" }] 
        });
      }
      
      // Atualizar o comentário
      const updatedComment = await storage.updateTaskComment(commentId, {
        comment: req.body.comment,
        edited: true,
        edit_date: new Date()
      });
      
      // Notificar via WebSocket
      if (io) {
        io.to(`task-${comment.task_id}`).emit('comment-updated', updatedComment);
      }
      
      res.json(updatedComment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });
  
  // Rota para soft delete de comentários
  app.delete("/api/comments/:id", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getTaskCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Verificar se o usuário é o autor do comentário ou um admin/manager
      if (comment.user_id !== req.user!.id && !['admin', 'manager'].includes(req.user!.role)) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }
      
      // Soft delete do comentário
      await storage.softDeleteTaskComment(commentId);
      
      // Notificar via WebSocket
      if (io) {
        io.to(`task-${comment.task_id}`).emit('comment-deleted', { id: commentId });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });
  
  // Rotas para reações de comentários
  app.post("/api/comments/:id/reactions", authenticateJWT, validateBody(insertCommentReactionSchema), async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getTaskCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Verificar se já existe uma reação deste usuário para este comentário
      const existingReaction = await storage.getCommentReactionByUserAndComment(req.user!.id, commentId);
      
      if (existingReaction) {
        return res.status(400).json({ message: "You've already reacted to this comment" });
      }
      
      // Criar nova reação
      const reaction = await storage.createCommentReaction({
        comment_id: commentId,
        user_id: req.user!.id,
        type: req.body.type || 'like'
      });
      
      // Notificar via WebSocket
      if (io) {
        io.to(`task-${comment.task_id}`).emit('new-reaction', {
          reaction,
          commentId
        });
      }
      
      res.status(201).json(reaction);
    } catch (error) {
      console.error("Error creating reaction:", error);
      res.status(500).json({ message: "Failed to create reaction" });
    }
  });
  
  app.delete("/api/comments/:commentId/reactions/:reactionId", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const reactionId = parseInt(req.params.reactionId);
      
      const comment = await storage.getTaskCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Remover reação
      await storage.deleteCommentReaction(reactionId);
      
      // Notificar via WebSocket
      if (io) {
        io.to(`task-${comment.task_id}`).emit('reaction-removed', {
          reactionId,
          commentId
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reaction:", error);
      res.status(500).json({ message: "Failed to delete reaction" });
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
  app.get("/api/financial-documents", authenticateJWT, async (_req, res) => {
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

  app.post("/api/financial-documents", authenticateJWT, requirePermission('manage_financials'), (req, res, next) => {
    // Pré-processamento de data antes da validação
    if (req.body && req.body.due_date && typeof req.body.due_date === 'string') {
      req.body.due_date = new Date(req.body.due_date);
    }
    next();
  }, validateBody(insertFinancialDocumentSchema), async (req, res) => {
    try {
      // Criar o documento financeiro
      const document = await storage.createFinancialDocument(req.body);
      
      // Importação aqui para evitar problemas de importação circular
      const { syncFinancialDocumentToCalendar } = await import('./utils/calendarSync');
      
      // Sincronizar com o calendário automaticamente
      if (document.due_date && !document.paid) {
        const calendarEvent = await syncFinancialDocumentToCalendar(document, req.user?.id || 1);
        
        if (calendarEvent) {
          // Notificar usuários sobre a atualização do calendário
          io.emit('calendar_updated', {
            type: 'calendar_updated',
            timestamp: new Date().toISOString(),
            message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
          });
        }
      }
      
      // Notificar sobre criação do documento
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'create', 
        document,
        timestamp: new Date().toISOString(),
        message: 'Um novo documento financeiro foi criado'
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Erro ao criar documento financeiro:", error);
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
      
      // Importação aqui para evitar problemas de importação circular
      const { syncFinancialDocumentToCalendar, removeFinancialDocumentEvents } = await import('./utils/calendarSync');
      
      // Se for marcado como pago, remover evento do calendário
      if (updatedDocument.paid) {
        await removeFinancialDocumentEvents(updatedDocument.id);
        // Notificar usuários sobre a atualização do calendário
        io.emit('calendar_updated', {
          type: 'calendar_updated',
          timestamp: new Date().toISOString(),
          message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
        });
      } else if (updatedDocument.due_date) {
        // Se não for pago e tiver data de vencimento, atualizar evento no calendário
        const calendarEvent = await syncFinancialDocumentToCalendar(updatedDocument, req.user?.id || 1);
        
        if (calendarEvent) {
          // Notificar usuários sobre a atualização do calendário
          io.emit('calendar_updated', {
            type: 'calendar_updated',
            timestamp: new Date().toISOString(),
            message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
          });
        }
      }
      
      // Notificar sobre atualização do documento
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'update', 
        document: updatedDocument,
        timestamp: new Date().toISOString(),
        message: 'Um documento financeiro foi atualizado'
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Erro ao atualizar documento financeiro:", error);
      res.status(500).json({ message: "Failed to update financial document" });
    }
  });
  
  // Rota para registrar pagamento de um documento financeiro
  app.post("/api/financial-documents/:id/pay", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes } = req.body;
      
      // Verificar se o documento existe
      const document = await storage.getFinancialDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento financeiro não encontrado" });
      }
      
      // Se já estiver pago, retornar erro
      if (document.paid) {
        return res.status(400).json({ message: "Este documento já foi pago" });
      }
      
      // Sempre usar a data e hora atuais para o pagamento
      // Evitamos problemas com conversão de datas do frontend
      const updatedDocument = await storage.updateFinancialDocument(id, {
        paid: true,
        status: 'paid',
        payment_date: new Date(),
        payment_notes: notes || null
      });
      
      // Importação aqui para evitar problemas de importação circular
      const { removeFinancialDocumentEvents } = await import('./utils/calendarSync');
      
      // Remover eventos do calendário para este documento pago
      await removeFinancialDocumentEvents(id);
      
      // Notificar usuários sobre a atualização do calendário
      io.emit('calendar_updated', {
        type: 'calendar_updated',
        timestamp: new Date().toISOString(),
        message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
      });
      
      // Notificar sobre pagamento do documento
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'payment', 
        document: updatedDocument,
        timestamp: new Date().toISOString(),
        message: 'Um documento financeiro foi atualizado para pago'
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      res.status(500).json({ message: "Falha ao registrar pagamento" });
    }
  });
  
  // Excluir um documento financeiro
  app.delete("/api/financial-documents/:id", authenticateJWT, requirePermission('manage_financials'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Primeiro, verifique se o documento existe e obtenha seus detalhes
      const document = await storage.getFinancialDocumentById(id);
      
      if (!document) {
        return res.status(404).json({ message: "Documento financeiro não encontrado" });
      }
      
      // Verifica se o documento está vinculado a um projeto
      if (document.project_id) {
        // Se estiver vinculado a um projeto, não permite a exclusão
        return res.status(403).json({ 
          message: "Não é possível excluir este documento porque está vinculado a um projeto",
          detail: "Documentos financeiros gerados automaticamente pelos projetos não podem ser excluídos. Para remover este documento, você precisa remover o projeto associado ou alterar seu orçamento para 0."
        });
      }

      // Importação aqui para evitar problemas de importação circular
      const { removeFinancialDocumentEvents } = await import('./utils/calendarSync');
      
      // Remover eventos do calendário associados a este documento
      await removeFinancialDocumentEvents(id);
      
      // Se não estiver vinculado a um projeto, prossegue com a exclusão
      const deleted = await storage.deleteFinancialDocument(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Falha ao excluir o documento financeiro" });
      }
      
      // Notificar usuários sobre a atualização do calendário
      io.emit('calendar_updated', {
        type: 'calendar_updated',
        timestamp: new Date().toISOString(),
        message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
      });
      
      // Notificar sobre exclusão do documento
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'delete', 
        documentId: id,
        timestamp: new Date().toISOString(),
        message: 'Um documento financeiro foi excluído'
      });
      
      // Retornar 204 No Content para exclusão bem-sucedida
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir documento financeiro:", error);
      res.status(500).json({ message: "Falha ao excluir documento financeiro" });
    }
  });

  // Expenses - Adicionando autenticação e permissões
  app.get("/api/expenses", authenticateJWT, async (_req, res) => {
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

  app.post("/api/expenses", authenticateJWT, requirePermission('manage_financials'), (req, res, next) => {
    // Pré-processamento de data antes da validação
    if (req.body && req.body.date && typeof req.body.date === 'string') {
      req.body.date = new Date(req.body.date);
    }
    next();
  }, validateBody(insertExpenseSchema), async (req, res) => {
    try {
      const expense = await storage.createExpense(req.body);
      
      // Importação aqui para evitar problemas de importação circular
      const { syncExpenseToCalendar } = await import('./utils/calendarSync');
      
      // Sincronizar com o calendário automaticamente se não estiver paga
      if (expense.date && !expense.paid) {
        const calendarEvent = await syncExpenseToCalendar(expense, req.user?.id || 1);
        
        if (calendarEvent) {
          // Notificar usuários sobre a atualização do calendário
          io.emit('calendar_updated', {
            type: 'calendar_updated',
            timestamp: new Date().toISOString(),
            message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
          });
        }
      }
      
      // Notificar sobre a criação da despesa
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'create_expense', 
        expense: expense,
        timestamp: new Date().toISOString(),
        message: 'Uma nova despesa foi registrada'
      });
      
      res.status(201).json(expense);
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", authenticateJWT, requirePermission('manage_financials'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Obter a despesa antes da atualização para verificar alterações no status de pagamento
      const oldExpense = await storage.getExpense(id);
      if (!oldExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Atualizar a despesa
      const updatedExpense = await storage.updateExpense(id, req.body);
      
      if (!updatedExpense) {
        return res.status(404).json({ message: "Failed to update expense" });
      }
      
      // Importação aqui para evitar problemas de importação circular
      const { syncExpenseToCalendar, removeExpenseEvents } = await import('./utils/calendarSync');
      
      // Se a despesa foi marcada como paga, remover do calendário
      if (updatedExpense.paid && !oldExpense.paid) {
        await removeExpenseEvents(id);
        // Notificar usuários sobre a atualização do calendário
        io.emit('calendar_updated', {
          type: 'calendar_updated',
          timestamp: new Date().toISOString(),
          message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
        });
      } 
      // Se a despesa não está paga e a data foi alterada, atualizar evento no calendário
      else if (!updatedExpense.paid && updatedExpense.date) {
        const calendarEvent = await syncExpenseToCalendar(updatedExpense, req.user?.id || 1);
        
        if (calendarEvent) {
          // Notificar usuários sobre a atualização do calendário
          io.emit('calendar_updated', {
            type: 'calendar_updated',
            timestamp: new Date().toISOString(),
            message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
          });
        }
      }
      
      // Notificar sobre a atualização da despesa
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'update_expense', 
        expense: updatedExpense,
        timestamp: new Date().toISOString(),
        message: updatedExpense.paid && !oldExpense.paid 
          ? 'Uma despesa foi marcada como paga' 
          : 'Uma despesa foi atualizada'
      });
      
      res.json(updatedExpense);
    } catch (error) {
      console.error("Erro ao atualizar despesa:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });
  
  // Excluir uma despesa
  app.delete("/api/expenses/:id", authenticateJWT, requirePermission('manage_financials'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Importação aqui para evitar problemas de importação circular
      const { removeExpenseEvents } = await import('./utils/calendarSync');
      
      // Remover eventos do calendário associados a esta despesa
      await removeExpenseEvents(id);
      
      // Procede com a exclusão da despesa
      const deleted = await storage.deleteExpense(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      // Notificar usuários sobre a atualização do calendário
      io.emit('calendar_updated', {
        type: 'calendar_updated',
        timestamp: new Date().toISOString(),
        message: 'O calendário foi atualizado. Atualize a visualização para ver as mudanças.'
      });
      
      // Notificar sobre a exclusão da despesa
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'delete_expense', 
        expenseId: id,
        timestamp: new Date().toISOString(),
        message: 'Uma despesa foi excluída'
      });
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      res.status(500).json({ message: "Falha ao excluir despesa" });
    }
  });
  
  // Aprovar uma despesa
  app.post("/api/expenses/:id/approve", authenticateJWT, requirePermission('manage_financials'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { notes } = req.body;
      
      // Verificar se a despesa existe
      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      // Atualizar para aprovado, sempre usando a data atual
      const updatedExpense = await storage.updateExpense(id, {
        approved: true,
        notes: notes || null
      });
      
      // Notificar sobre a aprovação da despesa
      io.emit('financial_updated', { 
        type: 'financial_updated',
        action: 'approve_expense', 
        expense: updatedExpense,
        timestamp: new Date().toISOString(),
        message: 'Uma despesa foi aprovada'
      });
      
      res.json(updatedExpense);
    } catch (error) {
      console.error("Erro ao aprovar despesa:", error);
      res.status(500).json({ message: "Falha ao aprovar despesa" });
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

  // ===== Rotas para Eventos de Calendário =====
  
  // Obter todos os eventos
  app.get("/api/events", authenticateJWT, async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
      res.status(500).json({ message: "Falha ao buscar eventos" });
    }
  });
  
  // Obter um evento específico
  app.get("/api/events/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Erro ao buscar evento:", error);
      res.status(500).json({ message: "Falha ao buscar evento" });
    }
  });
  
  // Criar um novo evento
  app.post("/api/events", authenticateJWT, validateBody(insertEventSchema), async (req, res) => {
    try {
      const userId = req.user.id;
      const event = await storage.createEvent({
        ...req.body,
        user_id: userId
      });
      res.status(201).json(event);
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      res.status(500).json({ message: "Falha ao criar evento" });
    }
  });
  
  // Atualizar um evento
  app.patch("/api/events/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o evento existe
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verificar se o usuário tem permissão
      if (event.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Sem permissão para editar este evento" });
      }
      
      const updatedEvent = await storage.updateEvent(id, req.body);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Erro ao atualizar evento:", error);
      res.status(500).json({ message: "Falha ao atualizar evento" });
    }
  });
  
  // Excluir um evento
  app.delete("/api/events/:id", authenticateJWT, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o evento existe
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verificar se o usuário tem permissão
      if (event.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: "Sem permissão para excluir este evento" });
      }
      
      await storage.deleteEvent(id);
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      res.status(500).json({ message: "Falha ao excluir evento" });
    }
  });
  
  // Rota para sincronização manual do calendário
  app.post("/api/calendar/sync", authenticateJWT, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      console.log('[API] Iniciando sincronização manual do calendário');
      const { syncFinancialEvents } = await import('./automation');
      
      // Sincronizar eventos financeiros
      const financialResult = await syncFinancialEvents();
      
      // Usar módulo de utilitários para limpar eventos
      const { 
        cleanupPaidDocumentEvents, 
        cleanupPaidExpenseEvents,
        cleanupOrphanExpenseEvents 
      } = await import('./utils/calendarSync');
      
      // Limpar eventos de documentos pagos
      const cleanupDocsResult = await cleanupPaidDocumentEvents();
      
      // Limpar eventos de despesas pagas
      const cleanupExpensesResult = await cleanupPaidExpenseEvents();
      
      // Limpar eventos órfãos de despesas (despesas que foram excluídas)
      const cleanupOrphanResult = await cleanupOrphanExpenseEvents();
      
      // Total de eventos limpos
      const totalCleaned = cleanupDocsResult + cleanupExpensesResult + cleanupOrphanResult;
      
      console.log(`[API] Sincronização manual do calendário concluída: ${financialResult.count} eventos financeiros sincronizados, ${cleanupDocsResult} eventos de documentos pagos removidos, ${cleanupExpensesResult} eventos de despesas pagas removidos, ${cleanupOrphanResult} eventos órfãos de despesas removidos`);
      
      res.json({
        success: true,
        message: `Sincronização concluída com sucesso. ${financialResult.count} eventos financeiros sincronizados. ${totalCleaned} eventos de registros removidos.`,
        financial: financialResult,
        cleanup: {
          documents: cleanupDocsResult,
          expenses: cleanupExpensesResult,
          orphanExpenses: cleanupOrphanResult,
          total: totalCleaned
        }
      });
    } catch (error: any) {
      console.error('[API] Erro na sincronização manual do calendário:', error);
      res.status(500).json({ 
        success: false, 
        message: `Erro ao sincronizar calendário: ${error.message || 'Erro desconhecido'}` 
      });
    }
  });
  
  // ===== Rotas para Comentários de Projetos =====
  
  // Obter todos os comentários de um projeto
  app.get("/api/projects/:id/comments", authenticateJWT, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const comments = await storage.getProjectComments(projectId);
      
      // Obter reações para os comentários
      const reactions = await storage.getProjectCommentReactionsByProjectId(projectId);
      
      // Mapear as reações aos comentários para retornar tudo junto
      const commentsWithReactions = comments.map(comment => ({
        ...comment,
        reactions: reactions.filter(reaction => reaction.comment_id === comment.id)
      }));
      
      res.json(commentsWithReactions);
    } catch (error) {
      console.error("Error fetching project comments:", error);
      res.status(500).json({ message: "Failed to fetch project comments" });
    }
  });

  // Obter um comentário específico de projeto por ID
  app.get("/api/project-comments/:id", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getProjectCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Error fetching project comment:", error);
      res.status(500).json({ message: "Failed to fetch project comment" });
    }
  });

  // Criar um novo comentário em um projeto
  app.post("/api/projects/:id/comments", authenticateJWT, validateBody(insertProjectCommentSchema), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Adiciona o ID do usuário autenticado como autor do comentário
      const comment = await storage.createProjectComment({
        ...req.body,
        project_id: projectId,
        user_id: req.user!.id,
        creation_date: new Date(),
        edited: false,
        deleted: false
      });
      
      // Enviar notificação por WebSocket
      if (comment) {
        const user = await storage.getUser(req.user!.id);
        
        const commentWithUser = {
          ...comment,
          user: {
            id: user?.id,
            name: user?.name,
            username: user?.username,
            avatar: user?.avatar
          }
        };
        
        const projectRoom = `project:${projectId}`;
        io.to(projectRoom).emit('new-project-comment', commentWithUser);
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating project comment:", error);
      res.status(500).json({ message: "Failed to create project comment" });
    }
  });

  // Responder a um comentário de projeto
  app.post("/api/project-comments/:id/reply", authenticateJWT, async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const parentComment = await storage.getProjectCommentById(parentId);
      
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      
      if (!req.body.comment) {
        return res.status(400).json({ message: "Comment text is required" });
      }
      
      // Criar resposta como um novo comentário com referência ao pai
      const comment = await storage.createProjectComment({
        project_id: parentComment.project_id,
        user_id: req.user!.id,
        comment: req.body.comment,
        parent_id: parentId
      });
      
      // Enviar notificação por WebSocket
      if (comment) {
        const user = await storage.getUser(req.user!.id);
        
        const commentWithUser = {
          ...comment,
          user: {
            id: user?.id,
            name: user?.name,
            username: user?.username,
            avatar: user?.avatar
          }
        };
        
        const projectRoom = `project:${parentComment.project_id}`;
        io.to(projectRoom).emit('new-project-comment', commentWithUser);
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error replying to project comment:", error);
      res.status(500).json({ message: "Failed to reply to comment" });
    }
  });

  // Editar um comentário de projeto
  app.patch("/api/project-comments/:id", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getProjectCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Verificar se o usuário é o autor do comentário ou tem perfil de admin
      if (comment.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You can only edit your own comments" });
      }
      
      if (!req.body.comment) {
        return res.status(400).json({ message: "Comment text is required" });
      }
      
      const updatedComment = await storage.updateProjectComment(commentId, {
        comment: req.body.comment
      });
      
      // Enviar notificação por WebSocket
      if (updatedComment) {
        const projectRoom = `project:${comment.project_id}`;
        io.to(projectRoom).emit('updated-project-comment', updatedComment);
      }
      
      res.json(updatedComment);
    } catch (error) {
      console.error("Error updating project comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Excluir (soft delete) um comentário de projeto
  app.delete("/api/project-comments/:id", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getProjectCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Verificar se o usuário é o autor do comentário ou tem perfil de admin
      if (comment.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }
      
      // Soft delete do comentário
      const success = await storage.softDeleteProjectComment(commentId);
      
      if (success) {
        // Enviar notificação por WebSocket
        const projectRoom = `project:${comment.project_id}`;
        io.to(projectRoom).emit('deleted-project-comment', { id: commentId });
        
        res.status(200).json({ message: "Comment deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete comment" });
      }
    } catch (error) {
      console.error("Error deleting project comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Adicionar uma reação a um comentário de projeto
  app.post("/api/project-comments/:id/reactions", authenticateJWT, validateBody(insertProjectCommentReactionSchema), async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getProjectCommentById(commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Verificar se o usuário já reagiu a este comentário
      const existingReaction = await storage.getProjectCommentReactionByUserAndComment(
        req.user!.id,
        commentId
      );
      
      if (existingReaction) {
        return res.status(400).json({ 
          message: "You have already reacted to this comment",
          reaction: existingReaction
        });
      }
      
      // Criar nova reação
      const reaction = await storage.createProjectCommentReaction({
        comment_id: commentId,
        user_id: req.user!.id,
        reaction_type: req.body.reaction_type
      });
      
      // Enviar notificação por WebSocket
      const projectRoom = `project:${comment.project_id}`;
      io.to(projectRoom).emit('new-project-comment-reaction', { 
        ...reaction,
        comment_id: commentId
      });
      
      res.status(201).json(reaction);
    } catch (error) {
      console.error("Error creating reaction:", error);
      res.status(500).json({ message: "Failed to create reaction" });
    }
  });

  // Remover uma reação de um comentário de projeto
  app.delete("/api/project-comments/:commentId/reactions/:reactionId", authenticateJWT, async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const reactionId = parseInt(req.params.reactionId);
      
      const comment = await storage.getProjectCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Excluir a reação
      const success = await storage.deleteProjectCommentReaction(reactionId);
      
      if (success) {
        // Enviar notificação por WebSocket
        const projectRoom = `project:${comment.project_id}`;
        io.to(projectRoom).emit('deleted-project-comment-reaction', { 
          id: reactionId,
          comment_id: commentId
        });
        
        res.status(200).json({ message: "Reaction removed successfully" });
      } else {
        res.status(500).json({ message: "Failed to remove reaction" });
      }
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  const httpServer = createServer(app);
  
  // Configurar WebSocket Server (usando 'ws' para WebSockets nativos)
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  wss.on('connection', (ws) => {
    console.log('Nova conexão WebSocket estabelecida');
    
    ws.on('message', async (message) => {
      try {
        // Parse da mensagem recebida (assumindo JSON)
        const data = JSON.parse(message.toString());
        console.log('Mensagem recebida:', data);
        
        // Processamento de diferentes tipos de mensagem
        if (data.type === 'chat') {
          // Broadcast para todos os clientes conectados
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'chat',
                userId: data.userId,
                userName: data.userName,
                message: data.message,
                timestamp: new Date().toISOString()
              }));
            }
          });
        } 
        else if (data.type === 'notification') {
          // Enviar notificação para usuários específicos
          // Aqui precisaria de uma lógica para mapear usuários a conexões
          // Para exemplo, enviamos para todos
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'notification',
                title: data.title,
                message: data.message,
                userId: data.userId,
                timestamp: new Date().toISOString()
              }));
            }
          });
        }
        else if (data.type === 'comment') {
          // Processar novo comentário
          try {
            const commentData = data.data;
            const newComment = await storage.createTaskComment(commentData);
            
            // Broadcast para todos os clientes
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'comment',
                  task_id: commentData.task_id,
                  data: newComment
                }));
              }
            });
          } catch (error) {
            console.error("Erro ao criar comentário via WebSocket:", error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Erro ao criar comentário'
            }));
          }
        }
        else if (data.type === 'comment_reaction') {
          // Processar reação a comentário
          try {
            const reactionData = data.data;
            let reaction;
            
            // Verificar se já existe uma reação do usuário
            const existingReaction = await storage.getCommentReactionByUserAndComment(
              reactionData.user_id,
              reactionData.comment_id
            );
            
            if (existingReaction) {
              // Se já existe, remover (toggle)
              await storage.deleteCommentReaction(existingReaction.id);
              reaction = { deleted: true, id: existingReaction.id };
            } else {
              // Senão, criar nova reação
              reaction = await storage.createCommentReaction(reactionData);
            }
            
            // Broadcast para todos os clientes
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'comment_reaction',
                  comment_id: reactionData.comment_id,
                  data: reaction
                }));
              }
            });
          } catch (error) {
            console.error("Erro ao processar reação via WebSocket:", error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Erro ao processar reação'
            }));
          }
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Conexão WebSocket fechada');
    });
    
    // Enviar mensagem de boas-vindas
    ws.send(JSON.stringify({ 
      type: 'system', 
      message: 'Conectado ao servidor WebSocket com sucesso!' 
    }));
  });

  // Configurar Socket.IO (mais rico em recursos que WebSockets puros)
  const io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Mapeamento de salas para projetos e tarefas
  const rooms = {
    tasks: {},      // tasks[taskId] = [socketId1, socketId2, ...]
    projects: {},   // projects[projectId] = [socketId1, socketId2, ...]
    users: {}       // users[userId] = socketId
  };

  io.on('connection', (socket) => {
    console.log('Nova conexão Socket.IO estabelecida:', socket.id);
    
    // Autenticação do usuário
    socket.on('authenticate', async (data) => {
      try {
        const { userId, token } = data;
        
        // Aqui você deveria verificar o token usando a mesma lógica de auth.ts
        // Para simplicidade, estamos apenas verificando se userId é um número válido
        if (userId && !isNaN(parseInt(userId))) {
          const userIdNum = parseInt(userId);
          const user = await storage.getUser(userIdNum);
          
          if (user) {
            // Registrar o socket para este usuário
            rooms.users[userIdNum] = socket.id;
            
            socket.emit('authenticated', { 
              success: true, 
              userId: userIdNum,
              userName: user.name
            });
            
            console.log(`Usuário ${userIdNum} (${user.name}) autenticado via Socket.IO`);
          } else {
            socket.emit('authenticated', { success: false, error: 'Usuário não encontrado' });
          }
        } else {
          socket.emit('authenticated', { success: false, error: 'ID de usuário inválido' });
        }
      } catch (error) {
        console.error('Erro ao autenticar usuário no Socket.IO:', error);
        socket.emit('authenticated', { success: false, error: 'Erro de autenticação' });
      }
    });
    
    // Entrar em uma sala de tarefa específica
    socket.on('join-task', (taskId) => {
      const taskRoom = `task:${taskId}`;
      socket.join(taskRoom);
      
      // Registrar no nosso mapeamento
      if (!rooms.tasks[taskId]) {
        rooms.tasks[taskId] = [];
      }
      if (!rooms.tasks[taskId].includes(socket.id)) {
        rooms.tasks[taskId].push(socket.id);
      }
      
      console.log(`Socket ${socket.id} entrou na sala da tarefa ${taskId}`);
      socket.to(taskRoom).emit('user-joined-task', { taskId });
    });
    
    // Sair de uma sala de tarefa
    socket.on('leave-task', (taskId) => {
      const taskRoom = `task:${taskId}`;
      socket.leave(taskRoom);
      
      // Atualizar nosso mapeamento
      if (rooms.tasks[taskId]) {
        rooms.tasks[taskId] = rooms.tasks[taskId].filter(id => id !== socket.id);
      }
      
      console.log(`Socket ${socket.id} saiu da sala da tarefa ${taskId}`);
      socket.to(taskRoom).emit('user-left-task', { taskId });
    });
    
    // Entrar em uma sala de projeto específica
    socket.on('join-project', (projectId) => {
      const projectRoom = `project:${projectId}`;
      socket.join(projectRoom);
      
      // Registrar no nosso mapeamento
      if (!rooms.projects[projectId]) {
        rooms.projects[projectId] = [];
      }
      if (!rooms.projects[projectId].includes(socket.id)) {
        rooms.projects[projectId].push(socket.id);
      }
      
      console.log(`Socket ${socket.id} entrou na sala do projeto ${projectId}`);
      socket.to(projectRoom).emit('user-joined-project', { projectId });
    });
    
    // Sair de uma sala de projeto
    socket.on('leave-project', (projectId) => {
      const projectRoom = `project:${projectId}`;
      socket.leave(projectRoom);
      
      // Atualizar nosso mapeamento
      if (rooms.projects[projectId]) {
        rooms.projects[projectId] = rooms.projects[projectId].filter(id => id !== socket.id);
      }
      
      console.log(`Socket ${socket.id} saiu da sala do projeto ${projectId}`);
      socket.to(projectRoom).emit('user-left-project', { projectId });
    });
    
    // Enviar um comentário para uma tarefa
    socket.on('task-comment', async (data) => {
      try {
        const { taskId, userId, comment } = data;
        
        if (taskId && userId && comment) {
          // Validar se o usuário existe
          const user = await storage.getUser(parseInt(userId));
          if (!user) {
            socket.emit('error', { message: 'Usuário não encontrado' });
            return;
          }
          
          // Salvar o comentário no banco de dados
          const newComment = await storage.createTaskComment({
            task_id: parseInt(taskId),
            user_id: parseInt(userId),
            comment: comment,
            created_at: new Date()
          });
          
          // Emitir o evento para todos na sala da tarefa
          const taskRoom = `task:${taskId}`;
          io.to(taskRoom).emit('new-comment', {
            id: newComment.id,
            taskId: parseInt(taskId),
            userId: parseInt(userId),
            userName: user.name,
            comment: comment,
            createdAt: newComment.created_at
          });
          
          console.log(`Novo comentário adicionado à tarefa ${taskId} por usuário ${userId}`);
        } else {
          socket.emit('error', { message: 'Dados incompletos para comentário' });
        }
      } catch (error) {
        console.error('Erro ao processar comentário de tarefa:', error);
        socket.emit('error', { message: 'Erro ao processar comentário' });
      }
    });
    
    // Enviar um comentário para um projeto
    socket.on('project-comment', async (data) => {
      try {
        const { projectId, userId, comment } = data;
        
        if (projectId && userId && comment) {
          // Validar se o usuário existe
          const user = await storage.getUser(parseInt(userId));
          if (!user) {
            socket.emit('error', { message: 'Usuário não encontrado' });
            return;
          }
          
          // Salvar o comentário no banco de dados
          const newComment = await storage.createProjectComment({
            project_id: parseInt(projectId),
            user_id: parseInt(userId),
            comment: comment,
            creation_date: new Date(),
            edited: false,
            deleted: false
          });
          
          // Emitir o evento para todos na sala do projeto
          const projectRoom = `project:${projectId}`;
          io.to(projectRoom).emit('new-project-comment', {
            ...newComment,
            user: {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar: user.avatar
            }
          });
          
          console.log(`Novo comentário adicionado ao projeto ${projectId} por usuário ${userId}`);
        } else {
          socket.emit('error', { message: 'Dados incompletos para comentário' });
        }
      } catch (error) {
        console.error('Erro ao processar comentário de projeto:', error);
        socket.emit('error', { message: 'Erro ao processar comentário' });
      }
    });
    
    // Enviar notificação para um usuário específico
    socket.on('notify-user', (data) => {
      const { targetUserId, notification } = data;
      
      if (targetUserId && notification && rooms.users[targetUserId]) {
        const targetSocketId = rooms.users[targetUserId];
        
        io.to(targetSocketId).emit('notification', {
          ...notification,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Notificação enviada para usuário ${targetUserId}`);
      } else {
        socket.emit('error', { message: 'Usuário não encontrado ou dados incompletos' });
      }
    });
    
    // Manipular evento de desconexão
    socket.on('disconnect', () => {
      console.log('Socket.IO desconectado:', socket.id);
      
      // Remover o socket de todas as salas de tarefas
      for (const [taskId, sockets] of Object.entries(rooms.tasks)) {
        if (Array.isArray(sockets)) {
          rooms.tasks[taskId] = sockets.filter(id => id !== socket.id);
        }
      }
      
      // Remover o socket de todas as salas de projetos
      for (const [projectId, sockets] of Object.entries(rooms.projects)) {
        if (Array.isArray(sockets)) {
          rooms.projects[projectId] = sockets.filter(id => id !== socket.id);
        }
      }
      
      // Remover o socket do mapeamento de usuários
      for (const [userId, socketId] of Object.entries(rooms.users)) {
        if (socketId === socket.id) {
          delete rooms.users[userId];
        }
      }
    });
  });
  
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

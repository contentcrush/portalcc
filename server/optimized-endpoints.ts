/**
 * Endpoints otimizados para melhorar performance de áreas críticas
 * Estes endpoints são versões simplificadas dos existentes
 * com foco em rapidez e eficiência
 */

import { db } from "./db";
import { tasks, projects, users, clients } from "@shared/schema";
import { Request, Response } from "express";
import { eq, and, count, inArray } from "drizzle-orm";
import { withRetry } from "./utils/db-retry";

// Função para obter tarefas de forma super rápida com o mínimo de dados necessários
export async function getFastTasks(req: Request, res: Response) {
  const startTime = Date.now();
  console.time("FastTasks");
  
  try {
    // Obter apenas os campos essenciais das tarefas, sem JOINs
    const taskList = await withRetry(async () => {
      return db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        due_date: tasks.due_date,
        project_id: tasks.project_id,
        assigned_to: tasks.assigned_to,
        completed: tasks.completed
      })
      .from(tasks)
      .limit(50); // Limitar para evitar sobrecarga
    });
    
    // Se não há tarefas, retornar array vazio rapidamente
    if (taskList.length === 0) {
      console.timeEnd("FastTasks");
      return res.json([]);
    }
    
    // Extrair IDs únicos para buscas relacionadas
    const projectIds = [...new Set(taskList.filter(t => t.project_id).map(t => t.project_id!))];
    const userIds = [...new Set(taskList.filter(t => t.assigned_to).map(t => t.assigned_to!))];
    
    // Buscar dados relacionados em paralelo
    const [projectsData, usersData] = await Promise.all([
      // Buscar projetos e seus clientes em uma única consulta eficiente
      projectIds.length > 0 ? withRetry(async () => {
        return db.select({
          id: projects.id,
          name: projects.name,
          client_id: projects.client_id,
          status: projects.status
        })
        .from(projects)
        .where(inArray(projects.id, projectIds));
      }) : Promise.resolve([]),
      
      // Buscar usuários em uma única consulta leve
      userIds.length > 0 ? withRetry(async () => {
        return db.select({
          id: users.id,
          name: users.name,
          avatar: users.avatar
        })
        .from(users)
        .where(inArray(users.id, userIds));
      }) : Promise.resolve([])
    ]);
    
    // Mapear dados relacionados para lookup rápido
    const projectsMap = Object.fromEntries(projectsData.map(p => [p.id, p]));
    const usersMap = Object.fromEntries(usersData.map(u => [u.id, u]));
    
    // Obter IDs de clientes para uma terceira consulta
    const clientIds = [...new Set(projectsData.filter(p => p.client_id).map(p => p.client_id))];
    
    // Buscar informações de clientes
    const clientsData = clientIds.length > 0 ? await withRetry(async () => {
      return db.select({
        id: clients.id,
        name: clients.name,
        shortName: clients.shortName,
        logo: clients.logo
      })
      .from(clients)
      .where(inArray(clients.id, clientIds));
    }) : [];
    
    // Mapear dados de clientes
    const clientsMap = Object.fromEntries(clientsData.map(c => [c.id, c]));
    
    // Montar o resultado final com apenas as informações essenciais
    const result = taskList.map(task => {
      const simplified: any = { ...task };
      
      // Adicionar informações de projeto
      if (task.project_id && projectsMap[task.project_id]) {
        const project = projectsMap[task.project_id];
        simplified.project = {
          id: project.id,
          name: project.name,
          status: project.status
        };
        
        // Adicionar informações de cliente
        if (project.client_id && clientsMap[project.client_id]) {
          const client = clientsMap[project.client_id];
          simplified.client = {
            id: client.id,
            name: client.name,
            shortName: client.shortName,
            logo: client.logo
          };
        }
      }
      
      // Adicionar informações de usuário
      if (task.assigned_to && usersMap[task.assigned_to]) {
        const user = usersMap[task.assigned_to];
        simplified.assignedUser = {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        };
      }
      
      return simplified;
    });
    
    // Obter contagem total em separado (para paginação)
    const [{ value: total }] = await db.select({ value: count() }).from(tasks);
    
    console.timeEnd("FastTasks");
    console.log(`[Performance] getEssentialTasks concluído em ${Date.now() - startTime}ms, ${result.length} de ${total} tarefas`);
    
    return res.json({
      data: result,
      total: Number(total)
    });
  } catch (error) {
    console.timeEnd("FastTasks");
    console.error(`[Performance] Erro em getEssentialTasks após ${Date.now() - startTime}ms:`, error);
    res.status(500).json({ message: "Failed to get tasks", error: String(error) });
  }
}

// Função para obter detalhes específicos de uma tarefa
export async function getTaskDetails(req: Request, res: Response) {
  const taskId = parseInt(req.params.id);
  
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }
  
  try {
    // Obter detalhes completos da tarefa específica
    const [task] = await withRetry(async () => {
      return db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
    });
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Buscar detalhes do projeto
    let projectData = null;
    if (task.project_id) {
      const [project] = await withRetry(async () => {
        return db.select()
          .from(projects)
          .where(eq(projects.id, task.project_id!));
      });
      
      if (project) {
        projectData = project;
        
        // Buscar detalhes do cliente
        if (project.client_id) {
          const [client] = await withRetry(async () => {
            return db.select()
              .from(clients)
              .where(eq(clients.id, project.client_id));
          });
          
          if (client) {
            projectData.client = client;
          }
        }
      }
    }
    
    // Buscar detalhes do usuário
    let assignedUser = null;
    if (task.assigned_to) {
      const [user] = await withRetry(async () => {
        return db.select()
          .from(users)
          .where(eq(users.id, task.assigned_to!));
      });
      
      if (user) {
        // Remover senha e informações sensíveis
        const { password, ...userData } = user;
        assignedUser = userData;
      }
    }
    
    // Montar resposta com todos os relacionamentos
    const result = {
      ...task,
      project: projectData,
      assignedUser
    };
    
    res.json(result);
  } catch (error) {
    console.error("Erro ao obter detalhes da tarefa:", error);
    res.status(500).json({ message: "Failed to get task details", error: String(error) });
  }
}
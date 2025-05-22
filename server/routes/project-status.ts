import { Request, Response } from "express";
import { db } from "../db";
import { projects, projectStatusHistory, specialStatusEnum } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Função para obter o histórico de status especial de um projeto
export async function getProjectStatusHistory(req: Request, res: Response) {
  try {
    const projectId = Number(req.params.id);
    
    const history = await db.query.projectStatusHistory.findMany({
      where: eq(projectStatusHistory.project_id, projectId),
      orderBy: [desc(projectStatusHistory.change_date)],
      with: {
        changedBy: {
          columns: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });
    
    return res.status(200).json(history);
  } catch (error) {
    console.error("Erro ao obter histórico de status:", error);
    return res.status(500).json({ message: "Erro ao obter histórico de status" });
  }
}

// Função para atualizar o status especial de um projeto
export async function updateProjectSpecialStatus(req: Request, res: Response) {
  try {
    // Verificar permissões (auth é feito na rota principal)
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager' && req.user!.role !== 'editor') {
      return res.status(403).json({ message: "Permissão negada" });
    }

    const projectId = Number(req.params.id);
    const { status, reason } = req.body;
    
    // Validar status
    if (!Object.values(specialStatusEnum.enumValues).includes(status)) {
      return res.status(400).json({ message: "Status especial inválido" });
    }
    
    // Obter projeto atual
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    
    if (!project) {
      return res.status(404).json({ message: "Projeto não encontrado" });
    }
    
    const previousStatus = project.special_status;
    
    // Se o status é o mesmo, não fazer nada
    if (previousStatus === status) {
      return res.status(200).json({ message: "Status não alterado", project });
    }
    
    // Criar registro no histórico
    await db.insert(projectStatusHistory).values({
      project_id: projectId,
      previous_status: previousStatus,
      new_status: status,
      changed_by: req.user!.id,
      reason: reason || ""
    });
    
    // Atualizar status do projeto
    const [updatedProject] = await db.update(projects)
      .set({ special_status: status })
      .where(eq(projects.id, projectId))
      .returning();
    
    // Enviar para WebSocket
    if (req.app.locals.io) {
      req.app.locals.io.emit('project_updated', { 
        id: projectId, 
        special_status: status,
        message: `Status especial atualizado para ${status}`
      });
    }
    
    return res.status(200).json({ 
      message: "Status especial atualizado com sucesso", 
      project: updatedProject 
    });
  } catch (error) {
    console.error("Erro ao atualizar status especial:", error);
    return res.status(500).json({ message: "Erro ao atualizar status especial" });
  }
}

// Função para verificar automaticamente projetos com atraso
export async function checkDelayedProjects() {
  try {
    // Buscar projetos ativos (não cancelados ou concluídos)
    const activeProjects = await db.query.projects.findMany({
      where: (projects) => {
        return eq(projects.status, "in_progress");
      }
    });
    
    const today = new Date();
    let updatedCount = 0;
    
    for (const project of activeProjects) {
      // Se o projeto tem data de término e passou da data
      if (project.endDate && project.endDate < today && project.special_status === 'none') {
        // Marcar como atrasado automaticamente
        await db.update(projects)
          .set({ special_status: 'delayed' })
          .where(eq(projects.id, project.id));
          
        // Registrar no histórico
        await db.insert(projectStatusHistory).values({
          project_id: project.id,
          previous_status: 'none',
          new_status: 'delayed',
          changed_by: 1, // Usuário do sistema (admin)
          reason: "Marcado automaticamente como atrasado por exceder a data de término"
        });
        
        updatedCount++;
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error("Erro ao verificar projetos atrasados:", error);
    return 0;
  }
}
import { Request, Response } from "express";
import { db } from "../db";
import { projects, projectStatusHistory, specialStatusEnum, type ProjectStatus, type SpecialStatus, isValidSpecialStatusTransition } from "@shared/schema";
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

    // **NOVA VALIDAÇÃO: Sistema Simplificado**
    // Verificar se a transição de status especial é válida
    const currentProjectStatus = project.status as ProjectStatus;
    const currentSpecialStatus = previousStatus as SpecialStatus;
    const newSpecialStatus = status as SpecialStatus;
    
    const validation = isValidSpecialStatusTransition(currentProjectStatus, currentSpecialStatus, newSpecialStatus);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        message: "Transição de status especial não permitida", 
        reason: validation.reason 
      });
    }
    
    console.log(`[Validação] Status especial de projeto ${projectId}: ${currentSpecialStatus} → ${newSpecialStatus} ✅`);
    
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
      // Se o projeto não estiver já com status especial (exceto none) e tiver data de término
      if (project.special_status === 'none' || project.special_status === null) {
        
        // Verificar critérios de atraso:
        // 1. Se passou da data de término
        const isOverdue = project.endDate && project.endDate < today;
        
        // 2. Se está com progresso inferior a 70% e falta menos de 20% do tempo total
        let isProgressDelayed = false;
        if (project.startDate && project.endDate && project.progress !== null) {
          const totalDuration = project.endDate.getTime() - project.startDate.getTime();
          const elapsedDuration = today.getTime() - project.startDate.getTime();
          const percentTimeElapsed = (elapsedDuration / totalDuration) * 100;
          
          // Se já passou mais de 80% do tempo e o progresso está abaixo de 70%
          if (percentTimeElapsed > 80 && project.progress < 70) {
            isProgressDelayed = true;
          }
        }
        
        // Se qualquer critério de atraso for atendido
        if (isOverdue || isProgressDelayed) {
          // Determinar a razão do atraso
          let reason = "";
          if (isOverdue) {
            reason = "Marcado automaticamente como atrasado por exceder a data de término";
          } else if (isProgressDelayed) {
            reason = "Marcado automaticamente como atrasado por progresso insuficiente perto da data de término";
          }
          
          // Marcar como atrasado automaticamente
          await db.update(projects)
            .set({ special_status: 'delayed' })
            .where(eq(projects.id, project.id));
            
          // Registrar no histórico
          await db.insert(projectStatusHistory).values({
            project_id: project.id,
            previous_status: project.special_status || 'none',
            new_status: 'delayed',
            changed_by: 1, // Usuário do sistema (admin)
            reason
          });
          
          console.log(`[Automação] Projeto #${project.id} "${project.name}" marcado como atrasado: ${reason}`);
          updatedCount++;
        }
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error("Erro ao verificar projetos atrasados:", error);
    return 0;
  }
}
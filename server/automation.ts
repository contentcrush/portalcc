import { db } from './db';
import { projects } from '@shared/schema';
import { eq, and, lt, inArray, gte } from 'drizzle-orm';
import { format, addDays, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Verifica projetos atrasados e atualiza o status automaticamente
 * Condição: Se a data de entrega já passou E o status é um dos status de desenvolvimento
 * (proposta, pre_producao, producao, pos_revisao)
 */
export async function checkOverdueProjects() {
  try {
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');
    console.log(`[Automação] Verificando projetos atrasados em ${formattedDate}`);

    // Status que devem ser considerados para marcar como atrasado
    const developmentStatus = ['proposta', 'pre_producao', 'producao', 'pos_revisao'];
    
    // Status que não devem ser alterados (já finalizados)
    const finalStatus = ['entregue', 'concluido', 'pausado', 'cancelado'];
    
    // Busca projetos com data de entrega anterior a hoje e com status em desenvolvimento
    const overdueProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          lt(projects.endDate, new Date(formattedDate)),
          inArray(projects.status, developmentStatus)
        )
      );
    
    if (overdueProjects.length === 0) {
      console.log('[Automação] Nenhum projeto atrasado encontrado');
      return { success: true, message: 'Nenhum projeto atrasado encontrado', updatedCount: 0 };
    }
    
    console.log(`[Automação] Encontrados ${overdueProjects.length} projetos atrasados`);
    
    // Atualiza o status dos projetos atrasados para 'atrasado'
    const updatePromises = overdueProjects.map(async (project) => {
      console.log(`[Automação] Atualizando projeto ${project.id} - ${project.name} para status 'atrasado'`);
      
      return db
        .update(projects)
        .set({ status: 'atrasado' })
        .where(eq(projects.id, project.id));
    });
    
    await Promise.all(updatePromises);
    
    return { 
      success: true, 
      message: `${overdueProjects.length} projetos foram marcados como atrasados`, 
      updatedCount: overdueProjects.length,
      projects: overdueProjects.map(p => ({ id: p.id, name: p.name }))
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao verificar projetos atrasados:', error);
    return { 
      success: false, 
      message: `Erro ao verificar projetos atrasados: ${error.message || 'Erro desconhecido'}`,
      error 
    };
  }
}

/**
 * Encontra a próxima data de entrega de um projeto em desenvolvimento
 * para agendar a verificação automática
 */
export async function findNextDeadline(): Promise<{ nextDate: Date | null, project?: any }> {
  try {
    const today = new Date();
    const developmentStatus = ['proposta', 'pre_producao', 'producao', 'pos_revisao'];
    
    // Busca o próximo projeto a vencer (que ainda não está atrasado)
    const upcomingProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          gte(projects.endDate, new Date(format(today, 'yyyy-MM-dd'))),
          inArray(projects.status, developmentStatus)
        )
      );
    
    if (upcomingProjects.length === 0) {
      return { nextDate: null };
    }
    
    // Ordena os projetos por data de entrega (mais próxima primeiro)
    upcomingProjects.sort((a, b) => {
      const dateA = new Date(a.endDate);
      const dateB = new Date(b.endDate);
      return dateA.getTime() - dateB.getTime();
    });
    
    const nextProject = upcomingProjects[0];
    const nextDate = new Date(nextProject.endDate);
    
    // Define a hora para 00:01 do dia da data de entrega
    nextDate.setHours(0, 1, 0, 0);
    
    return { 
      nextDate, 
      project: {
        id: nextProject.id,
        name: nextProject.name,
        endDate: nextProject.endDate
      }
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao buscar próxima data de entrega:', error);
    return { nextDate: null };
  }
}

/**
 * Agenda a próxima verificação com base na próxima data de entrega
 */
export async function scheduleNextDeadlineCheck(): Promise<void> {
  try {
    const { nextDate, project } = await findNextDeadline();
    
    if (!nextDate) {
      console.log('[Automação] Não há projetos com datas futuras para agendar verificação');
      // Se não houver projetos futuros, verifica novamente em 24 horas
      setTimeout(scheduleNextDeadlineCheck, 24 * 60 * 60 * 1000);
      return;
    }
    
    const now = new Date();
    const timeUntilDeadline = nextDate.getTime() - now.getTime();
    
    if (timeUntilDeadline <= 0) {
      // Se a data já passou, verificar imediatamente
      console.log('[Automação] Data de entrega já passou, verificando imediatamente...');
      await checkOverdueProjects();
      // Agendar a próxima verificação
      scheduleNextDeadlineCheck();
      return;
    }
    
    console.log(`[Automação] Próxima verificação agendada para ${format(nextDate, 'dd/MM/yyyy HH:mm')} (Projeto: ${project.name})`);
    console.log(`[Automação] Tempo até a verificação: ${Math.round(timeUntilDeadline / (1000 * 60 * 60))} horas`);
    
    // Agenda a verificação para o momento exato
    setTimeout(async () => {
      console.log(`[Automação] Executando verificação agendada para projeto ${project.name}`);
      await checkOverdueProjects();
      // Após verificar, agenda a próxima verificação
      scheduleNextDeadlineCheck();
    }, timeUntilDeadline);
    
  } catch (error: any) {
    console.error('[Automação] Erro ao agendar próxima verificação:', error);
    // Em caso de erro, tentar novamente em 1 hora
    setTimeout(scheduleNextDeadlineCheck, 60 * 60 * 1000);
  }
}

/**
 * Verifica projetos que estavam atrasados mas tiveram a data de entrega atualizada
 * para uma data futura e reverte o status para 'producao'
 */
export async function checkProjectsWithUpdatedDates() {
  try {
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');
    console.log(`[Automação] Verificando projetos com datas atualizadas em ${formattedDate}`);
    
    // Busca projetos marcados como atrasados mas com data de entrega no futuro
    const updatedProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.status, 'atrasado'),
          gte(projects.endDate, new Date(formattedDate))
        )
      );
    
    if (updatedProjects.length === 0) {
      console.log('[Automação] Nenhum projeto com data atualizada encontrado');
      return { success: true, message: 'Nenhum projeto com data atualizada encontrado', updatedCount: 0 };
    }
    
    console.log(`[Automação] Encontrados ${updatedProjects.length} projetos com datas atualizadas`);
    
    // Atualiza o status dos projetos atrasados para 'producao' (estado padrão)
    const updatePromises = updatedProjects.map(async (project) => {
      console.log(`[Automação] Atualizando projeto ${project.id} - ${project.name} para status 'producao' (data futura)`);
      
      // Atualiza o status do projeto diretamente no banco de dados, mas também
      // chama a implementação de updateProjectStatus para garantir consistência
      if (storage && typeof storage.updateProjectStatus === 'function') {
        return storage.updateProjectStatus(project.id, 'producao');
      } else {
        // Fallback caso storage não esteja disponível
        return db
          .update(projects)
          .set({ status: 'producao' })
          .where(eq(projects.id, project.id));
      }
    });
    
    await Promise.all(updatePromises);
    
    return { 
      success: true, 
      message: `${updatedProjects.length} projetos foram restaurados para status 'producao'`, 
      updatedCount: updatedProjects.length,
      projects: updatedProjects.map(p => ({ id: p.id, name: p.name }))
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao verificar projetos com datas atualizadas:', error);
    return { 
      success: false, 
      message: `Erro ao verificar projetos com datas atualizadas: ${error.message || 'Erro desconhecido'}`,
      error 
    };
  }
}

/**
 * Executa todas as automações do sistema
 */
export async function runAutomations() {
  console.log('[Automação] Iniciando verificações automáticas...');
  
  // Verifica projetos com datas atualizadas primeiro (para remover status de atrasado)
  const updatedDatesResult = await checkProjectsWithUpdatedDates();
  
  // Verifica projetos atrasados
  const overdueResult = await checkOverdueProjects();
  
  // Agenda a próxima verificação baseada em datas de entrega
  scheduleNextDeadlineCheck();
  
  // Aqui podemos adicionar mais automações no futuro
  
  console.log('[Automação] Verificações automáticas concluídas');
  
  return {
    updatedDates: updatedDatesResult,
    overdue: overdueResult,
    // Outras automações podem ser adicionadas aqui
  };
}
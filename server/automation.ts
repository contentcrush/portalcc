import { db } from './db';
import { projects } from '@shared/schema';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { format } from 'date-fns';

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
 * Executa todas as automações do sistema
 */
export async function runAutomations() {
  console.log('[Automação] Iniciando verificações automáticas...');
  
  // Verifica projetos atrasados
  const overdueResult = await checkOverdueProjects();
  
  // Aqui podemos adicionar mais automações no futuro
  
  console.log('[Automação] Verificações automáticas concluídas');
  
  return {
    overdue: overdueResult,
    // Outras automações podem ser adicionadas aqui
  };
}
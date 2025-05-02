import { db } from './db';
import { projects, clients, tasks, events, financialDocuments } from '@shared/schema';
import { eq, and, lt, inArray, gte, or, isNull, lte, sql } from 'drizzle-orm';
import { format, addDays, isAfter, isBefore, parseISO, subMonths, addMonths, addHours, 
         startOfDay, endOfDay, isSameDay, isToday, addYears, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storage } from './storage';

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
      
      // Usa a implementação de updateProjectStatus para garantir consistência
      if (storage && typeof storage.updateProjectStatus === 'function') {
        return storage.updateProjectStatus(project.id, 'atrasado');
      } else {
        // Fallback caso storage não esteja disponível
        return db
          .update(projects)
          .set({ status: 'atrasado' })
          .where(eq(projects.id, project.id));
      }
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
      const dateA = a.endDate ? new Date(a.endDate) : new Date();
      const dateB = b.endDate ? new Date(b.endDate) : new Date();
      return dateA.getTime() - dateB.getTime();
    });
    
    const nextProject = upcomingProjects[0];
    const nextDate = nextProject.endDate ? new Date(nextProject.endDate) : new Date();
    
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
 * Sincroniza eventos do calendário com base em datas importantes de clientes
 * - Aniversários de início de relacionamento com clientes
 */
export async function syncClientEvents(): Promise<{ success: boolean, message: string, count: number }> {
  try {
    console.log('[Automação] Sincronizando eventos de calendário para clientes...');

    const allClients = await db.select().from(clients);
    let eventsCreated = 0;

    // Cria eventos para aniversários de clientes
    for (const client of allClients) {
      if (client.since) {
        // Procura se já existe um evento para o aniversário do cliente no ano atual
        const clientAnniversary = new Date(client.since);
        const currentYear = new Date().getFullYear();
        
        // Define uma data de aniversário para o ano atual
        const anniversaryThisYear = new Date(currentYear, clientAnniversary.getMonth(), clientAnniversary.getDate());
        
        // Se a data já passou este ano, criar para o próximo ano
        const targetYear = isBefore(anniversaryThisYear, new Date()) ? currentYear + 1 : currentYear;
        const targetDate = new Date(targetYear, clientAnniversary.getMonth(), clientAnniversary.getDate());
        
        // Verifica se já existe um evento para este aniversário
        const existingEvents = await db.select()
          .from(events)
          .where(
            and(
              eq(events.client_id, client.id),
              eq(events.type, 'aniversario'),
              and(
                gte(events.start_date, startOfDay(targetDate)),
                lte(events.end_date, endOfDay(targetDate))
              )
            )
          );
        
        if (existingEvents.length === 0) {
          // Criar novo evento para o aniversário
          const anos = targetYear - clientAnniversary.getFullYear();
          await db.insert(events).values({
            title: `${anos}º Aniversário - ${client.name}`,
            description: `Celebração de ${anos} anos de parceria com ${client.name}`,
            user_id: 1, // ID do usuário admin ou sistema
            client_id: client.id,
            type: 'aniversario',
            start_date: targetDate,
            end_date: targetDate,
            all_day: true,
            color: '#4f46e5', // Indigo para aniversários
          });
          
          eventsCreated++;
          console.log(`[Automação] Evento de aniversário criado para cliente ${client.name}: ${format(targetDate, 'dd/MM/yyyy', { locale: ptBR })}`);
        }
      }
    }

    return {
      success: true,
      message: `${eventsCreated} eventos de clientes sincronizados com sucesso`,
      count: eventsCreated
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao sincronizar eventos de clientes:', error);
    return {
      success: false,
      message: `Erro ao sincronizar eventos de clientes: ${error.message || 'Erro desconhecido'}`,
      count: 0
    };
  }
}

/**
 * Sincroniza eventos do calendário com base em datas importantes de projetos
 * - Datas de entrega
 * - Marcos importantes
 */
export async function syncProjectEvents(): Promise<{ success: boolean, message: string, count: number }> {
  try {
    console.log('[Automação] Sincronizando eventos de calendário para projetos...');

    const allProjects = await db.select().from(projects);
    let eventsCreated = 0;

    // Cria eventos para datas de entrega de projetos
    for (const project of allProjects) {
      if (project.endDate) {
        // Verifica se já existe um evento para esta data de entrega
        const existingEvents = await db.select()
          .from(events)
          .where(
            and(
              eq(events.project_id, project.id),
              eq(events.type, 'prazo'),
              and(
                gte(events.start_date, startOfDay(project.endDate)),
                lte(events.end_date, endOfDay(project.endDate))
              )
            )
          );
        
        if (existingEvents.length === 0 && isAfter(project.endDate, new Date())) {
          // Criar novo evento para a data de entrega
          await db.insert(events).values({
            title: `Entrega: ${project.name}`,
            description: `Data de entrega para o projeto ${project.name}`,
            user_id: 1, // ID do usuário admin ou sistema
            project_id: project.id,
            client_id: project.client_id,
            type: 'prazo',
            start_date: project.endDate,
            end_date: project.endDate,
            all_day: true,
            color: '#ef4444', // Vermelho para prazos
          });
          
          eventsCreated++;
          console.log(`[Automação] Evento de prazo criado para projeto ${project.name}: ${format(project.endDate, 'dd/MM/yyyy', { locale: ptBR })}`);
        }
      }

      // Poderia criar eventos para marcos de projeto, início de projeto, etc.
      if (project.startDate) {
        // Verifica se já existe um evento para data de início
        const existingEvents = await db.select()
          .from(events)
          .where(
            and(
              eq(events.project_id, project.id),
              eq(events.type, 'projeto'),
              and(
                gte(events.start_date, startOfDay(project.startDate)),
                lte(events.end_date, endOfDay(project.startDate))
              )
            )
          );
        
        if (existingEvents.length === 0 && isAfter(project.startDate, new Date())) {
          // Criar novo evento para a data de início
          await db.insert(events).values({
            title: `Início: ${project.name}`,
            description: `Data de início para o projeto ${project.name}`,
            user_id: 1, // ID do usuário admin ou sistema
            project_id: project.id,
            client_id: project.client_id,
            type: 'projeto',
            start_date: project.startDate,
            end_date: project.startDate,
            all_day: true,
            color: '#6366f1', // Indigo para eventos de projeto
          });
          
          eventsCreated++;
          console.log(`[Automação] Evento de início criado para projeto ${project.name}: ${format(project.startDate, 'dd/MM/yyyy', { locale: ptBR })}`);
        }
      }
    }

    return {
      success: true,
      message: `${eventsCreated} eventos de projetos sincronizados com sucesso`,
      count: eventsCreated
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao sincronizar eventos de projetos:', error);
    return {
      success: false,
      message: `Erro ao sincronizar eventos de projetos: ${error.message || 'Erro desconhecido'}`,
      count: 0
    };
  }
}

/**
 * Sincroniza eventos do calendário com base em datas importantes de tarefas
 * - Prazos de tarefas
 */
export async function syncTaskEvents(): Promise<{ success: boolean, message: string, count: number }> {
  try {
    console.log('[Automação] Sincronizando eventos de calendário para tarefas...');

    const allTasks = await db.select().from(tasks).where(eq(tasks.completed, false));
    let eventsCreated = 0;

    // Cria eventos para datas de vencimento de tarefas
    for (const task of allTasks) {
      if (task.due_date) {
        // Verifica se já existe um evento para esta data de vencimento
        const existingEvents = await db.select()
          .from(events)
          .where(
            and(
              eq(events.task_id, task.id),
              eq(events.type, 'prazo'),
              and(
                gte(events.start_date, startOfDay(task.due_date)),
                lte(events.end_date, endOfDay(task.due_date))
              )
            )
          );
        
        if (existingEvents.length === 0 && isAfter(task.due_date, new Date())) {
          // Busca informações do projeto se existir
          let clientId = null;
          if (task.project_id) {
            const projectInfo = await db.select().from(projects).where(eq(projects.id, task.project_id));
            if (projectInfo.length > 0) {
              clientId = projectInfo[0].client_id;
            }
          }
          
          // Definir cor com base na prioridade
          let color = '#84cc16'; // Verde padrão (baixa)
          if (task.priority === 'alta') {
            color = '#f97316'; // Laranja para alta prioridade
          } else if (task.priority === 'critica') {
            color = '#dc2626'; // Vermelho para crítica
          } else if (task.priority === 'media') {
            color = '#f59e0b'; // Âmbar para média
          }
          
          // Criar novo evento para a data de vencimento
          await db.insert(events).values({
            title: `Tarefa: ${task.title}`,
            description: task.description || `Prazo para conclusão da tarefa`,
            user_id: task.assigned_to || 1, // ID do usuário responsável ou admin
            project_id: task.project_id || null,
            client_id: clientId,
            task_id: task.id,
            type: 'prazo',
            start_date: task.due_date,
            end_date: task.due_date,
            all_day: true,
            color,
          });
          
          eventsCreated++;
          console.log(`[Automação] Evento de prazo criado para tarefa ${task.title}: ${format(task.due_date, 'dd/MM/yyyy', { locale: ptBR })}`);
        }
      }

      // Poderia criar eventos para início de tarefas também
      if (task.start_date) {
        // Verifica se já existe um evento para data de início
        const existingEvents = await db.select()
          .from(events)
          .where(
            and(
              eq(events.task_id, task.id),
              or(eq(events.type, 'gravacao'), eq(events.type, 'edicao')),
              and(
                gte(events.start_date, startOfDay(task.start_date)),
                lte(events.end_date, endOfDay(task.start_date))
              )
            )
          );
        
        if (existingEvents.length === 0 && isAfter(task.start_date, new Date())) {
          // Busca informações do projeto se existir
          let clientId = null;
          if (task.project_id) {
            const projectInfo = await db.select().from(projects).where(eq(projects.id, task.project_id));
            if (projectInfo.length > 0) {
              clientId = projectInfo[0].client_id;
            }
          }
          
          // Criar novo evento para a data de início
          // Decidir o tipo com base no título/descrição da tarefa (simplificado)
          const taskType = task.title.toLowerCase().includes('grava') || 
                           (task.description && task.description.toLowerCase().includes('grava')) ? 
                           'gravacao' : 'edicao';
          
          await db.insert(events).values({
            title: `Início: ${task.title}`,
            description: task.description || `Início da tarefa`,
            user_id: task.assigned_to || 1, // ID do usuário responsável ou admin
            project_id: task.project_id || null,
            client_id: clientId,
            task_id: task.id,
            type: taskType,
            start_date: task.start_date,
            end_date: task.start_date,
            all_day: true,
            color: taskType === 'gravacao' ? '#10b981' : '#14b8a6', // Verde para gravação, teal para edição
          });
          
          eventsCreated++;
          console.log(`[Automação] Evento de início criado para tarefa ${task.title}: ${format(task.start_date, 'dd/MM/yyyy', { locale: ptBR })}`);
        }
      }
    }

    return {
      success: true,
      message: `${eventsCreated} eventos de tarefas sincronizados com sucesso`,
      count: eventsCreated
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao sincronizar eventos de tarefas:', error);
    return {
      success: false,
      message: `Erro ao sincronizar eventos de tarefas: ${error.message || 'Erro desconhecido'}`,
      count: 0
    };
  }
}

/**
 * Sincroniza eventos do calendário com base em datas financeiras importantes
 * - Datas de vencimento de faturas
 * - Datas de pagamento programadas
 */
export async function syncFinancialEvents(): Promise<{ success: boolean, message: string, count: number }> {
  try {
    console.log('[Automação] Sincronizando eventos de calendário para registros financeiros...');
    
    // Busca documentos financeiros não pagos e com data de vencimento futura
    const financialDocs = await db
      .select()
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.paid, false),
          gte(financialDocuments.due_date, new Date())
        )
      );
    
    let eventsCreated = 0;

    // Cria eventos para datas de vencimento financeiro
    for (const doc of financialDocs) {
      if (doc.due_date) {
        // Verifica se já existe um evento para esta data de vencimento
        const existingEvents = await db.select()
          .from(events)
          .where(
            and(
              eq(events.type, 'financeiro'),
              and(
                gte(events.start_date, startOfDay(doc.due_date)),
                lte(events.end_date, endOfDay(doc.due_date))
              ),
              eq(events.financial_document_id, doc.id) // Usa ID do documento para identificar exatamente
            )
          );
        
        if (existingEvents.length === 0) {
          // Busca informações do projeto relacionado se existir
          let projectName = '';
          if (doc.project_id) {
            const [project] = await db.select().from(projects).where(eq(projects.id, doc.project_id));
            if (project) {
              projectName = project.name;
            }
          }
          
          // Decide o título e cor com base no tipo de documento
          const isPagamento = doc.document_type === 'payment' || doc.document_type === 'expense';
          
          // Usa nome do projeto se disponível, caso contrário usa o número do documento
          const title = isPagamento 
            ? `Pagamento: ${projectName || doc.document_number || `#${doc.id}`}` 
            : `Recebimento: ${projectName || doc.document_number || `#${doc.id}`}`;
          
          const color = isPagamento 
            ? '#ef4444' // Vermelho para pagamentos
            : '#10b981'; // Verde para recebimentos
          
          // Cria descrição detalhada para tooltip
          const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.amount);
          const tooltipDescription = `${isPagamento ? 'Pagamento' : 'Recebimento'} - ${valorFormatado}
          ${projectName ? `Projeto: ${projectName}` : ''}
          ${doc.description ? `Descrição: ${doc.description}` : ''}
          Vencimento: ${format(doc.due_date, 'dd/MM/yyyy', { locale: ptBR })}`;
            
          // Criar novo evento para a data de vencimento
          await db.insert(events).values({
            title,
            description: tooltipDescription,
            user_id: 1, // ID do usuário admin/sistema
            project_id: doc.project_id || null,
            client_id: doc.client_id,
            financial_document_id: doc.id, // Armazena referência ao documento
            type: 'financeiro',
            start_date: doc.due_date,
            end_date: doc.due_date,
            all_day: true,
            color,
          });
          
          eventsCreated++;
          console.log(`[Automação] Evento financeiro criado para documento #${doc.id}: ${format(doc.due_date, 'dd/MM/yyyy', { locale: ptBR })}`);
        }
      }
    }

    return {
      success: true,
      message: `${eventsCreated} eventos financeiros sincronizados com sucesso`,
      count: eventsCreated
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao sincronizar eventos financeiros:', error);
    return {
      success: false,
      message: `Erro ao sincronizar eventos financeiros: ${error.message || 'Erro desconhecido'}`,
      count: 0
    };
  }
}

/**
 * Limpa eventos antigos automaticamente gerados que não são mais necessários
 * - Eventos de tarefas concluídas
 * - Eventos de projetos concluídos/cancelados
 * - Eventos de faturas pagas
 */
export async function cleanupOldEvents(): Promise<{ success: boolean, message: string, count: number }> {
  try {
    console.log('[Automação] Limpando eventos antigos do calendário...');
    let eventsRemoved = 0;
    
    // 1. Remover eventos de tarefas concluídas
    const completedTasks = await db.select().from(tasks).where(eq(tasks.completed, true));
    const completedTaskIds = completedTasks.map(task => task.id);
    
    if (completedTaskIds.length > 0) {
      const removedTaskEvents = await db.delete(events)
        .where(
          and(
            inArray(events.task_id, completedTaskIds),
            gte(events.start_date, new Date()) // Manter eventos históricos
          )
        )
        .returning();
      
      eventsRemoved += removedTaskEvents.length;
    }
    
    // 2. Remover eventos de projetos concluídos/cancelados
    const finishedProjects = await db.select()
      .from(projects)
      .where(
        inArray(projects.status, ['concluido', 'cancelado'])
      );
    
    const finishedProjectIds = finishedProjects.map(project => project.id);
    
    if (finishedProjectIds.length > 0) {
      const removedProjectEvents = await db.delete(events)
        .where(
          and(
            inArray(events.project_id, finishedProjectIds),
            gte(events.start_date, new Date()) // Manter eventos históricos
          )
        )
        .returning();
      
      eventsRemoved += removedProjectEvents.length;
    }
    
    // 3. Remover eventos de documentos financeiros pagos
    const paidDocs = await db
      .select()
      .from(financialDocuments)
      .where(eq(financialDocuments.paid, true));
    
    // Lista de descrições para buscar eventos correspondentes
    const paidDocsDescriptions = paidDocs.map(doc => [
      `Vencimento da fatura #${doc.id}: ${doc.description}`,
      `Vencimento da fatura #${doc.id}`
    ]).flat();
    
    if (paidDocsDescriptions.length > 0) {
      const removedFinancialEvents = await db.delete(events)
        .where(
          and(
            eq(events.type, 'financeiro'),
            gte(events.start_date, new Date()), // Manter eventos históricos
            or(...paidDocsDescriptions.map(desc => eq(events.description, desc)))
          )
        )
        .returning();
      
      eventsRemoved += removedFinancialEvents.length;
    }
    
    console.log(`[Automação] ${eventsRemoved} eventos antigos removidos do calendário`);
    return {
      success: true,
      message: `${eventsRemoved} eventos antigos removidos do calendário`,
      count: eventsRemoved
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao limpar eventos antigos:', error);
    return {
      success: false,
      message: `Erro ao limpar eventos antigos: ${error.message || 'Erro desconhecido'}`,
      count: 0
    };
  }
}

/**
 * Verifica e cria eventos de lembrete 1 semana antes de datas importantes
 */
export async function createReminderEvents(): Promise<{ success: boolean, message: string, count: number }> {
  try {
    console.log('[Automação] Criando eventos de lembrete...');
    let eventsCreated = 0;
    
    // 1. Encontrar eventos de prazo que não possuam lembretes
    const nextWeek = addDays(new Date(), 7);
    const twoWeeks = addDays(new Date(), 14);
    
    const deadlineEvents = await db.select()
      .from(events)
      .where(
        and(
          eq(events.type, 'prazo'),
          gte(events.start_date, nextWeek),
          lte(events.start_date, twoWeeks)
        )
      );
    
    // 2. Criar eventos de lembrete para cada evento de prazo
    for (const deadline of deadlineEvents) {
      // Calcular a data 1 semana antes do prazo
      const reminderDate = subDays(deadline.start_date, 7);
      
      // Verificar se já existe um lembrete
      const existingReminders = await db.select()
        .from(events)
        .where(
          and(
            eq(events.type, 'lembrete'),
            gte(events.start_date, startOfDay(reminderDate)),
            lte(events.end_date, endOfDay(reminderDate)),
            eq(events.description, `Lembrete: ${deadline.title} ocorrerá em uma semana`)
          )
        );
      
      if (existingReminders.length === 0 && isAfter(reminderDate, new Date())) {
        // Criar lembrete
        await db.insert(events).values({
          title: `Lembrete: ${deadline.title}`,
          description: `Lembrete: ${deadline.title} ocorrerá em uma semana`,
          user_id: deadline.user_id,
          project_id: deadline.project_id,
          client_id: deadline.client_id,
          task_id: deadline.task_id,
          type: 'lembrete',
          start_date: reminderDate,
          end_date: reminderDate,
          all_day: true,
          color: '#a855f7', // Roxo para lembretes
        });
        
        eventsCreated++;
        console.log(`[Automação] Evento de lembrete criado para "${deadline.title}": ${format(reminderDate, 'dd/MM/yyyy', { locale: ptBR })}`);
      }
    }
    
    return {
      success: true,
      message: `${eventsCreated} eventos de lembrete criados com sucesso`,
      count: eventsCreated
    };
  } catch (error: any) {
    console.error('[Automação] Erro ao criar eventos de lembrete:', error);
    return {
      success: false, 
      message: `Erro ao criar eventos de lembrete: ${error.message || 'Erro desconhecido'}`,
      count: 0
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
  
  // Sincroniza eventos do calendário
  const clientEventsResult = await syncClientEvents();
  const projectEventsResult = await syncProjectEvents();
  const taskEventsResult = await syncTaskEvents();
  const financialEventsResult = await syncFinancialEvents();
  
  // Cria eventos de lembrete para datas importantes
  const reminderEventsResult = await createReminderEvents();
  
  // Limpeza de eventos antigos
  const cleanupResult = await cleanupOldEvents();
  
  console.log('[Automação] Verificações automáticas concluídas');
  
  return {
    updatedDates: updatedDatesResult,
    overdue: overdueResult,
    calendarEvents: {
      clients: clientEventsResult,
      projects: projectEventsResult,
      tasks: taskEventsResult,
      financial: financialEventsResult,
      reminders: reminderEventsResult,
      cleanup: cleanupResult
    }
  };
}
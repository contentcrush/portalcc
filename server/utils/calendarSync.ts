import { db } from '../db';
import { events, projects, financialDocuments, expenses } from '@shared/schema';
import { eq, and, isNull, inArray, not } from 'drizzle-orm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Cria ou atualiza um evento no calendário para um documento financeiro
 * @param document O documento financeiro
 * @param userId ID do usuário que fez a operação (para registro)
 * @returns O evento criado ou atualizado
 */
export async function syncFinancialDocumentToCalendar(document: any, userId: number = 1) {
  if (!document.due_date || document.paid) {
    // Se for pago ou não tiver data de vencimento, não criar evento
    return null;
  }
  
  try {
    // Verificar se já existe um evento para este documento
    const existingEvents = await db.select()
      .from(events)
      .where(
        and(
          eq(events.type, 'financeiro'),
          eq(events.financial_document_id, document.id)
        )
      );
      
    // Buscar informações do projeto relacionado se existir
    let projectName = '';
    if (document.project_id) {
      const [project] = await db.select().from(projects).where(eq(projects.id, document.project_id));
      if (project) {
        projectName = project.name;
      }
    }
    
    // Decide o título e cor com base no tipo de documento
    const isPagamento = document.document_type === 'payment' || document.document_type === 'expense';
    
    // Usa nome do projeto se disponível, caso contrário usa o número do documento
    const title = isPagamento 
      ? `Pagamento: ${projectName || document.document_number || `#${document.id}`}` 
      : `Recebimento: ${projectName || document.document_number || `#${document.id}`}`;
    
    const color = isPagamento 
      ? '#ef4444' // Vermelho para pagamentos
      : '#10b981'; // Verde para recebimentos
    
    // Cria descrição detalhada para tooltip
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(document.amount);
    const tooltipDescription = `${isPagamento ? 'Pagamento' : 'Recebimento'} - ${valorFormatado}
    ${projectName ? `Projeto: ${projectName}` : ''}
    ${document.description ? `Descrição: ${document.description}` : ''}
    Vencimento: ${format(document.due_date, 'dd/MM/yyyy', { locale: ptBR })}`;
      
    if (existingEvents.length > 0) {
      // Atualizar evento existente
      const existingEvent = existingEvents[0];
      
      const updatedEvent = await db.update(events)
        .set({
          title,
          description: tooltipDescription,
          project_id: document.project_id || null,
          client_id: document.client_id,
          start_date: document.due_date,
          end_date: document.due_date,
          color,
        })
        .where(eq(events.id, existingEvent.id))
        .returning();
        
      console.log(`[CalendarSync] Evento financeiro atualizado para documento #${document.id}: ${format(document.due_date, 'dd/MM/yyyy', { locale: ptBR })}`);
      return updatedEvent[0];
    } else {
      // Criar novo evento
      const newEvent = await db.insert(events).values({
        title,
        description: tooltipDescription,
        user_id: userId,
        project_id: document.project_id || null,
        client_id: document.client_id,
        financial_document_id: document.id,
        type: 'financeiro',
        start_date: document.due_date,
        end_date: document.due_date,
        all_day: true,
        color,
      }).returning();
      
      console.log(`[CalendarSync] Evento financeiro criado para documento #${document.id}: ${format(document.due_date, 'dd/MM/yyyy', { locale: ptBR })}`);
      return newEvent[0];
    }
  } catch (error) {
    console.error(`[CalendarSync] Erro ao sincronizar evento para documento #${document.id}:`, error);
    return null;
  }
}

/**
 * Remove eventos do calendário associados a um documento financeiro
 * @param documentId ID do documento financeiro
 * @returns Número de eventos removidos
 */
export async function removeFinancialDocumentEvents(documentId: number) {
  try {
    // Remover eventos específicos deste documento
    const deletedEvents = await db.delete(events)
      .where(eq(events.financial_document_id, documentId))
      .returning();
    
    console.log(`[CalendarSync] Removidos ${deletedEvents.length} eventos do documento financeiro #${documentId}`);
    return deletedEvents.length;
  } catch (error) {
    console.error(`[CalendarSync] Erro ao remover eventos do documento #${documentId}:`, error);
    return 0;
  }
}

/**
 * Limpa eventos antigos de registros financeiros já pagos
 * @returns Número de eventos removidos
 */
export async function cleanupPaidDocumentEvents() {
  try {
    // Buscar documentos pagos
    const paidDocsIds = (await db
      .select({ id: financialDocuments.id })
      .from(financialDocuments)
      .where(eq(financialDocuments.paid, true))).map(doc => doc.id);
    
    // Buscar despesas pagas
    const paidExpensesIds = (await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.paid, true))).map(exp => exp.id);
    
    let deletedEventsCount = 0;
    
    // Remover eventos de documentos financeiros pagos
    if (paidDocsIds.length > 0) {
      const deletedFinancialEvents = await db.delete(events)
        .where(
          and(
            eq(events.type, 'financeiro'),
            inArray(events.financial_document_id, paidDocsIds)
          )
        )
        .returning();
      
      deletedEventsCount += deletedFinancialEvents.length;
      console.log(`[CalendarSync] Cleanup: removidos ${deletedFinancialEvents.length} eventos de documentos pagos`);
    }
    
    // Remover eventos de despesas pagas
    if (paidExpensesIds.length > 0) {
      const deletedExpenseEvents = await db.delete(events)
        .where(
          and(
            eq(events.type, 'despesa'),
            inArray(events.expense_id, paidExpensesIds)
          )
        )
        .returning();
      
      deletedEventsCount += deletedExpenseEvents.length;
      console.log(`[CalendarSync] Cleanup: removidos ${deletedExpenseEvents.length} eventos de despesas pagas`);
    }
    
    return deletedEventsCount;
  } catch (error) {
    console.error(`[CalendarSync] Erro ao limpar eventos de documentos pagos:`, error);
    return 0;
  }
}

/**
 * Cria ou atualiza um evento no calendário para uma despesa
 * @param expense A despesa
 * @param userId ID do usuário que fez a operação (para registro)
 * @returns O evento criado ou atualizado
 */
export async function syncExpenseToCalendar(expense: any, userId: number = 1) {
  if (!expense.date || expense.paid) {
    // Se for paga ou não tiver data, não criar evento
    return null;
  }
  
  try {
    // Verificar se já existe um evento para esta despesa
    const existingEvents = await db.select()
      .from(events)
      .where(
        and(
          eq(events.type, 'despesa'),
          eq(events.expense_id, expense.id)
        )
      );
      
    // Buscar informações do projeto relacionado se existir
    let projectName = '';
    if (expense.project_id) {
      const [project] = await db.select().from(projects).where(eq(projects.id, expense.project_id));
      if (project) {
        projectName = project.name;
      }
    }
    
    // Formatar título
    const title = `Despesa: ${expense.category}${projectName ? ` - ${projectName}` : ''}`;
    
    // Formatar descrição detalhada para tooltip
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amount);
    const tooltipDescription = `Despesa - ${valorFormatado}
    Categoria: ${expense.category}
    ${projectName ? `Projeto: ${projectName}` : ''}
    ${expense.description ? `Descrição: ${expense.description}` : ''}
    Data: ${format(expense.date, 'dd/MM/yyyy', { locale: ptBR })}`;
      
    if (existingEvents.length > 0) {
      // Atualizar evento existente
      const existingEvent = existingEvents[0];
      
      const updatedEvent = await db.update(events)
        .set({
          title,
          description: tooltipDescription,
          project_id: expense.project_id || null,
          start_date: expense.date,
          end_date: expense.date,
          color: '#ef4444', // Vermelho para despesas
        })
        .where(eq(events.id, existingEvent.id))
        .returning();
        
      console.log(`[CalendarSync] Evento de despesa atualizado para despesa #${expense.id}: ${format(expense.date, 'dd/MM/yyyy', { locale: ptBR })}`);
      return updatedEvent[0];
    } else {
      // Criar novo evento
      const newEvent = await db.insert(events).values({
        title,
        description: tooltipDescription,
        user_id: userId,
        project_id: expense.project_id || null,
        expense_id: expense.id,
        type: 'despesa',
        start_date: expense.date,
        end_date: expense.date,
        all_day: true,
        color: '#ef4444', // Vermelho para despesas
      }).returning();
      
      console.log(`[CalendarSync] Evento de despesa criado para despesa #${expense.id}: ${format(expense.date, 'dd/MM/yyyy', { locale: ptBR })}`);
      return newEvent[0];
    }
  } catch (error) {
    console.error(`[CalendarSync] Erro ao sincronizar evento para despesa #${expense.id}:`, error);
    return null;
  }
}

/**
 * Remove eventos do calendário associados a uma despesa
 * @param expenseId ID da despesa
 * @returns Número de eventos removidos
 */
export async function removeExpenseEvents(expenseId: number) {
  try {
    // Remover eventos específicos desta despesa
    const deletedEvents = await db.delete(events)
      .where(eq(events.expense_id, expenseId))
      .returning();
    
    console.log(`[CalendarSync] Removidos ${deletedEvents.length} eventos da despesa #${expenseId}`);
    return deletedEvents.length;
  } catch (error) {
    console.error(`[CalendarSync] Erro ao remover eventos da despesa #${expenseId}:`, error);
    return 0;
  }
}

/**
 * Limpa eventos de despesas que já foram pagas
 * @returns Número de eventos removidos
 */
export async function cleanupPaidExpenseEvents() {
  try {
    // Busca as despesas que estão marcadas como pagas
    const paidExpenses = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.paid, true));
    
    if (paidExpenses.length === 0) {
      return 0;
    }
    
    // Extrai os IDs de despesas pagas
    const paidExpenseIds = paidExpenses.map(expense => expense.id);
    
    // Remove eventos associados a despesas pagas
    const deletedEvents = await db.delete(events)
      .where(
        and(
          inArray(events.expense_id, paidExpenseIds),
          eq(events.type, 'despesa')
        )
      )
      .returning();
    
    console.log(`[CalendarSync] Cleanup: removidos ${deletedEvents.length} eventos de despesas pagas`);
    return deletedEvents.length;
  } catch (error) {
    console.error('[CalendarSync] Erro ao limpar eventos de despesas pagas:', error);
    return 0;
  }
}

/**
 * Limpa eventos de despesas que não existem mais no banco (órfãos)
 * @returns Número de eventos removidos
 */
export async function cleanupOrphanExpenseEvents() {
  try {
    // Primeiro, obter todos os IDs de despesas existentes
    const allExpenses = await db
      .select({ id: expenses.id })
      .from(expenses);
    
    const existingExpenseIds = allExpenses.map(expense => expense.id);
    
    // Obter todos os eventos com expense_id
    const expenseEvents = await db
      .select()
      .from(events)
      .where(
        and(
          not(isNull(events.expense_id)),
          eq(events.type, 'despesa')
        )
      );
    
    if (expenseEvents.length === 0) {
      return 0;
    }
    
    // Identificar eventos órfãos (cujo expense_id não existe mais no banco)
    const orphanEvents = expenseEvents.filter(event => 
      !existingExpenseIds.includes(event.expense_id!)
    );
    
    if (orphanEvents.length === 0) {
      return 0;
    }
    
    // Extrair IDs dos eventos órfãos
    const orphanEventIds = orphanEvents.map(event => event.id);
    
    // Remover eventos órfãos
    const deletedEvents = await db.delete(events)
      .where(inArray(events.id, orphanEventIds))
      .returning();
    
    console.log(`[CalendarSync] Cleanup: removidos ${deletedEvents.length} eventos órfãos de despesas`);
    return deletedEvents.length;
  } catch (error) {
    console.error('[CalendarSync] Erro ao limpar eventos órfãos de despesas:', error);
    return 0;
  }
}
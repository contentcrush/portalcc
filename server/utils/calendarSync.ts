import { db } from '../db';
import { events, projects, financialDocuments } from '@shared/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
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
    
    if (paidDocsIds.length === 0) {
      return 0; // Nenhum documento pago encontrado
    }
    
    // Remover eventos destes documentos pagos
    const deletedEvents = await db.delete(events)
      .where(
        and(
          eq(events.type, 'financeiro'),
          inArray(events.financial_document_id, paidDocsIds)
        )
      )
      .returning();
    
    console.log(`[CalendarSync] Cleanup: removidos ${deletedEvents.length} eventos de documentos pagos`);
    return deletedEvents.length;
  } catch (error) {
    console.error(`[CalendarSync] Erro ao limpar eventos de documentos pagos:`, error);
    return 0;
  }
}
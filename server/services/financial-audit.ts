import { db } from "../db";
import { financialDocuments, financialAuditLog } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import type { FinancialDocument, InsertFinancialAuditLog } from "@shared/schema";

/**
 * Serviço de Auditoria Financeira 
 * 
 * Implementa auditoria e integridade de dados para documentos financeiros
 * adaptado ao schema limpo sem campos status/archived/version.
 */
export class FinancialAuditService {
  
  /**
   * Cria um novo documento financeiro com auditoria completa
   */
  static async createDocument(
    documentData: any,
    userId: number,
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    return await db.transaction(async (tx) => {
      // 1. Criar o documento
      const [newDocument] = await tx
        .insert(financialDocuments)
        .values({
          ...documentData,
          created_by: userId,
          updated_by: userId
        })
        .returning();

      // 2. Registrar na auditoria
      await this.logAction(tx, {
        document_id: newDocument.id,
        action: 'create',
        user_id: userId,
        old_values: null,
        new_values: newDocument,
        reason: 'Criação de novo documento financeiro',
        ...sessionInfo
      });

      return newDocument;
    });
  }

  /**
   * Atualiza um documento financeiro com auditoria simplificada
   */
  static async updateDocument(
    documentId: number,
    updates: Partial<FinancialDocument>,
    userId: number,
    reason: string,
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    try {
      console.log(`[DEBUG_ISSUE_DATE] ===== FinancialAudit.updateDocument INÍCIO =====`);
      console.log(`[DEBUG_ISSUE_DATE] DocumentId: ${documentId}`);
      console.log(`[DEBUG_ISSUE_DATE] Updates recebidos:`, JSON.stringify(updates, null, 2));
      console.log(`[DEBUG_ISSUE_DATE] UserId: ${userId}`);
      console.log(`[DEBUG_ISSUE_DATE] Reason: ${reason}`);
      
      // Preparar dados da atualização
      const updateData = {
        ...updates,
        updated_by: userId,
        updated_at: new Date()
      };

      console.log(`[DEBUG_ISSUE_DATE] updateData final antes do SQL:`, JSON.stringify(updateData, null, 2));

      // Filtrar apenas campos que existem na tabela real
      const allowedFields = ['issue_date', 'due_date', 'payment_date', 'updated_at', 'updated_by'];
      const filteredUpdateData: any = {};
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = value;
        } else {
          console.log(`[DEBUG_ISSUE_DATE] Campo ${key} filtrado (não existe na tabela)`);
        }
      }
      
      console.log(`[DEBUG_ISSUE_DATE] updateData filtrado:`, JSON.stringify(filteredUpdateData, null, 2));

      // Executar a atualização
      console.log(`[DEBUG_ISSUE_DATE] Executando UPDATE no banco...`);
      const [updatedDocument] = await db
        .update(financialDocuments)
        .set(filteredUpdateData)
        .where(eq(financialDocuments.id, documentId))
        .returning();

      console.log(`[DEBUG_ISSUE_DATE] Resultado do UPDATE:`, JSON.stringify(updatedDocument, null, 2));

      if (!updatedDocument) {
        console.log(`[DEBUG_ISSUE_DATE] ERRO: Documento não encontrado após UPDATE`);
        throw new Error('Documento financeiro não encontrado');
      }

      console.log(`[DEBUG_ISSUE_DATE] ===== FinancialAudit.updateDocument SUCESSO =====`);
      return updatedDocument;
    } catch (error) {
      console.error(`[FinancialAudit] Erro ao atualizar documento ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Aprova um documento financeiro (apenas admins)
   */
  static async approveDocument(
    documentId: number,
    userId: number,
    reason: string,
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    return await this.updateDocument(
      documentId,
      {}, // Removido status que não existe mais
      userId,
      `Aprovação: ${reason}`,
      sessionInfo
    );
  }

  /**
   * Registra pagamento de um documento
   */
  static async markAsPaid(
    documentId: number,
    userId: number,
    paymentData: {
      payment_date: Date;
      payment_notes?: string;
    },
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    return await this.updateDocument(
      documentId,
      {
        paid: true,
        ...paymentData
      },
      userId,
      'Registro de pagamento',
      sessionInfo
    );
  }

  /**
   * Arquiva um documento financeiro
   */
  static async archiveDocument(
    documentId: number,
    userId: number,
    reason: string,
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    return await this.updateDocument(
      documentId,
      {
        archive_reason: reason
      },
      userId,
      `Arquivamento: ${reason}`,
      sessionInfo
    );
  }

  /**
   * Cancela um documento financeiro
   */
  static async cancelDocument(
    documentId: number,
    userId: number,
    reason: string,
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    return await this.updateDocument(
      documentId,
      {}, // Removido status que não existe mais
      userId,
      `Cancelamento: ${reason}`,
      sessionInfo
    );
  }

  /**
   * Registra uma ação de auditoria
   */
  private static async logAction(
    tx: any,
    logData: Omit<InsertFinancialAuditLog, 'checksum'>
  ) {
    // Gerar checksum para integridade dos dados
    const dataToHash = JSON.stringify({
      document_id: logData.document_id,
      action: logData.action,
      user_id: logData.user_id,
      old_values: logData.old_values,
      new_values: logData.new_values
    });
    
    const checksum = crypto
      .createHash('sha256')
      .update(dataToHash)
      .digest('hex');

    await tx.insert(financialAuditLog).values({
      ...logData,
      checksum
    });
  }

  /**
   * Busca histórico de auditoria de um documento
   */
  static async getDocumentAuditHistory(documentId: number) {
    return await db
      .select()
      .from(financialAuditLog)
      .where(eq(financialAuditLog.document_id, documentId))
      .orderBy(financialAuditLog.timestamp);
  }

  /**
   * Verifica integridade dos logs de auditoria
   */
  static async verifyAuditIntegrity(documentId: number): Promise<boolean> {
    const logs = await this.getDocumentAuditHistory(documentId);
    
    for (const log of logs) {
      const dataToHash = JSON.stringify({
        document_id: log.document_id,
        action: log.action,
        user_id: log.user_id,
        old_values: log.old_values,
        new_values: log.new_values
      });
      
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(dataToHash)
        .digest('hex');
      
      if (log.checksum !== expectedChecksum) {
        console.error(`Violação de integridade detectada no log ${log.id}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Busca documentos não arquivados para relatórios
   */
  static async getActiveDocuments() {
    return await db
      .select()
      .from(financialDocuments);
  }

  /**
   * Sincroniza documentos financeiros com mudanças de projeto
   */
  static async syncWithProject(
    projectId: number,
    projectData: any,
    userId: number,
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    return await db.transaction(async (tx) => {
      // Buscar documentos do projeto
      const existingDocs = await tx
        .select()
        .from(financialDocuments)
        .where(eq(financialDocuments.project_id, projectId));

      // Se há mudança no valor do projeto, atualizar documentos pendentes
      if (projectData.value && existingDocs.length > 0) {
        for (const doc of existingDocs) {
          if (!doc.paid && doc.amount !== projectData.value) {
            await this.updateDocument(
              doc.id,
              { amount: projectData.value },
              userId,
              `Sincronização com mudança de valor do projeto (${doc.amount} → ${projectData.value})`,
              sessionInfo
            );
          }
        }
      }
    });
  }
}
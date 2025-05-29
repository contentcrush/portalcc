import { db } from "../db";
import { financialDocuments, financialAuditLog } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import type { FinancialDocument, InsertFinancialAuditLog } from "@shared/schema";

/**
 * Serviço de Auditoria Financeira Profissional
 * 
 * Implementa controles rigorosos de auditoria, versionamento e integridade
 * de dados para documentos financeiros, seguindo padrões de sistemas ERP
 * profissionais como SAP e Oracle Financials.
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
          updated_by: userId,
          status: 'pending',
          version: 1
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
   * Atualiza um documento financeiro com controle de concorrência e auditoria
   */
  static async updateDocument(
    documentId: number,
    updates: Partial<FinancialDocument>,
    userId: number,
    reason: string,
    sessionInfo: { ip?: string; userAgent?: string; sessionId?: string } = {}
  ) {
    return await db.transaction(async (tx) => {
      // 1. Buscar documento atual para controle de concorrência
      const [currentDocument] = await tx
        .select()
        .from(financialDocuments)
        .where(eq(financialDocuments.id, documentId));

      if (!currentDocument) {
        throw new Error('Documento financeiro não encontrado');
      }

      if (currentDocument.archived) {
        throw new Error('Não é possível modificar documentos arquivados');
      }

      // 2. Verificar se há conflito de versão (otimistic locking)
      const currentVersion = currentDocument.version || 1;
      if (updates.version && updates.version !== currentVersion) {
        throw new Error('Conflito de versão detectado. O documento foi modificado por outro usuário.');
      }

      // 3. Preparar dados da atualização
      const updateData = {
        ...updates,
        updated_by: userId,
        updated_at: new Date(),
        version: currentVersion + 1
      };

      // 4. Executar a atualização
      const [updatedDocument] = await tx
        .update(financialDocuments)
        .set(updateData)
        .where(eq(financialDocuments.id, documentId))
        .returning();

      if (!updatedDocument) {
        throw new Error('Falha na atualização devido a conflito de concorrência');
      }

      // 5. Registrar na auditoria
      await this.logAction(tx, {
        document_id: documentId,
        action: 'update',
        user_id: userId,
        old_values: currentDocument,
        new_values: updatedDocument,
        reason,
        ...sessionInfo
      });

      return updatedDocument;
    });
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
      { status: 'approved' },
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
        status: 'paid',
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
        status: 'archived',
        archived: true,
        archived_at: new Date(),
        archived_by: userId,
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
      { status: 'cancelled' },
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
      .from(financialDocuments)
      .where(eq(financialDocuments.archived, false));
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
      // Buscar documentos ativos do projeto
      const existingDocs = await tx
        .select()
        .from(financialDocuments)
        .where(and(
          eq(financialDocuments.project_id, projectId),
          eq(financialDocuments.archived, false)
        ));

      // Se há mudança no valor do projeto, atualizar documentos pendentes
      if (projectData.value && existingDocs.length > 0) {
        for (const doc of existingDocs) {
          if (doc.status === 'pending' && doc.amount !== projectData.value) {
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
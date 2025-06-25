import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage';

export class IntegrityMonitor {
  private static logPath = path.join(process.cwd(), 'integrity.log');
  
  /**
   * Calcula hash SHA-256 de um arquivo
   */
  static calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }
  
  /**
   * Verifica se arquivo existe e calcula seu hash
   */
  static validateFile(filePath: string): { exists: boolean; hash?: string; size?: number } {
    try {
      if (!fs.existsSync(filePath)) {
        return { exists: false };
      }
      
      const stats = fs.statSync(filePath);
      const hash = this.calculateFileHash(filePath);
      
      return {
        exists: true,
        hash,
        size: stats.size
      };
    } catch (error) {
      console.error(`[IntegrityMonitor] Erro ao validar arquivo ${filePath}:`, error);
      return { exists: false };
    }
  }
  
  /**
   * Registra evento de integridade no log
   */
  static logEvent(event: string, details: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details
    };
    
    try {
      fs.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('[IntegrityMonitor] Erro ao escrever log:', error);
    }
  }
  
  /**
   * Executa verificação completa de integridade
   */
  static async runFullIntegrityCheck(): Promise<{
    totalDocuments: number;
    documentsWithFiles: number;
    validFiles: number;
    invalidFiles: number;
    orphanedReferences: number;
    orphanedFiles: number;
    issues: Array<{type: string; documentId?: number; filePath?: string; details: string}>
  }> {
    console.log('[IntegrityMonitor] Iniciando verificação completa de integridade...');
    
    const issues = [];
    let validFiles = 0;
    let invalidFiles = 0;
    let orphanedReferences = 0;
    
    // Buscar todos os documentos financeiros
    const documents = await storage.getFinancialDocuments();
    const documentsWithFiles = documents.filter(doc => doc.invoice_file);
    
    // Verificar cada documento com arquivo
    for (const doc of documentsWithFiles) {
      if (doc.invoice_file && doc.invoice_file_name) {
        const fullPath = path.join(process.cwd(), doc.invoice_file);
        const validation = this.validateFile(fullPath);
        
        if (validation.exists) {
          validFiles++;
          this.logEvent('file_validated', {
            documentId: doc.id,
            filePath: doc.invoice_file,
            hash: validation.hash,
            size: validation.size
          });
        } else {
          invalidFiles++;
          orphanedReferences++;
          issues.push({
            type: 'orphaned_reference',
            documentId: doc.id,
            filePath: doc.invoice_file,
            details: `Documento ${doc.id} referencia arquivo inexistente: ${doc.invoice_file}`
          });
          
          this.logEvent('orphaned_reference_detected', {
            documentId: doc.id,
            filePath: doc.invoice_file
          });
        }
      }
    }
    
    // Buscar arquivos órfãos no filesystem
    const orphanedFiles = this.findOrphanedFiles(documents);
    
    for (const orphanedFile of orphanedFiles) {
      issues.push({
        type: 'orphaned_file',
        filePath: orphanedFile.path,
        details: `Arquivo órfão encontrado: ${orphanedFile.path}`
      });
      
      this.logEvent('orphaned_file_detected', {
        filePath: orphanedFile.path,
        size: orphanedFile.size
      });
    }
    
    const result = {
      totalDocuments: documents.length,
      documentsWithFiles: documentsWithFiles.length,
      validFiles,
      invalidFiles,
      orphanedReferences,
      orphanedFiles: orphanedFiles.length,
      issues
    };
    
    this.logEvent('integrity_check_completed', result);
    
    console.log(`[IntegrityMonitor] Verificação concluída:
      - Total de documentos: ${result.totalDocuments}
      - Documentos com arquivos: ${result.documentsWithFiles}
      - Arquivos válidos: ${result.validFiles}
      - Arquivos inválidos: ${result.invalidFiles}
      - Referências órfãs: ${result.orphanedReferences}
      - Arquivos órfãos: ${result.orphanedFiles}
      - Total de problemas: ${result.issues.length}`);
    
    return result;
  }
  
  /**
   * Encontra arquivos no filesystem que não têm registro no banco
   */
  private static findOrphanedFiles(documents: any[]): Array<{path: string; size: number}> {
    const orphanedFiles = [];
    const financialDir = path.join(process.cwd(), 'uploads', 'financial');
    
    if (!fs.existsSync(financialDir)) {
      return orphanedFiles;
    }
    
    // Obter todos os caminhos de arquivo registrados no banco
    const registeredPaths = new Set(
      documents
        .filter(doc => doc.invoice_file)
        .map(doc => path.resolve(process.cwd(), doc.invoice_file))
    );
    
    // Escanear recursivamente o diretório financial
    function scanDirectory(dir: string) {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            scanDirectory(itemPath);
          } else if (item.isFile()) {
            const resolvedPath = path.resolve(itemPath);
            
            if (!registeredPaths.has(resolvedPath)) {
              const stats = fs.statSync(itemPath);
              orphanedFiles.push({
                path: path.relative(process.cwd(), itemPath),
                size: stats.size
              });
            }
          }
        }
      } catch (error) {
        console.error(`[IntegrityMonitor] Erro ao escanear ${dir}:`, error);
      }
    }
    
    scanDirectory(financialDir);
    return orphanedFiles;
  }
}
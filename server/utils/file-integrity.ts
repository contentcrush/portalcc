import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

export class FileIntegrityService {
  /**
   * Valida se todos os arquivos registrados no banco existem fisicamente
   */
  static async validateInvoiceFiles() {
    console.log('[FileIntegrity] Iniciando validação de integridade dos arquivos...');
    
    const documents = await storage.getFinancialDocuments();
    const issues = [];
    
    for (const doc of documents) {
      if (doc.invoice_file && doc.invoice_file_name) {
        const filePath = path.join(process.cwd(), doc.invoice_file);
        
        if (!fs.existsSync(filePath)) {
          issues.push({
            documentId: doc.id,
            issue: 'FILE_NOT_FOUND',
            registeredPath: doc.invoice_file,
            fileName: doc.invoice_file_name
          });
        }
      }
    }
    
    console.log(`[FileIntegrity] Encontrados ${issues.length} problemas de integridade`);
    return issues;
  }
  
  /**
   * Corrige automaticamente registros órfãos
   */
  static async fixOrphanedRecords() {
    const issues = await this.validateInvoiceFiles();
    
    for (const issue of issues) {
      if (issue.issue === 'FILE_NOT_FOUND') {
        console.log(`[FileIntegrity] Removendo referência órfã do documento ${issue.documentId}`);
        
        await storage.updateFinancialDocument(issue.documentId, {
          invoice_file: null,
          invoice_file_name: null,
          invoice_file_uploaded_at: null,
          invoice_file_uploaded_by: null
        });
      }
    }
    
    return issues.length;
  }
  
  /**
   * Busca arquivos existentes que podem corresponder a registros sem arquivo
   */
  static async findPotentialMatches() {
    console.log('[FileIntegrity] Buscando correspondências potenciais...');
    
    const documentsWithoutFiles = await storage.getFinancialDocuments()
      .then(docs => docs.filter(doc => !doc.invoice_file));
    
    const allFiles = this.scanUploadDirectory();
    const matches = [];
    
    for (const doc of documentsWithoutFiles) {
      // Buscar por arquivos que possam corresponder a este documento
      const potentialFiles = allFiles.filter(file => {
        const fileName = path.basename(file.path).toLowerCase();
        return fileName.includes('nfse') || fileName.includes('invoice');
      });
      
      if (potentialFiles.length > 0) {
        matches.push({
          documentId: doc.id,
          amount: doc.amount,
          potentialFiles: potentialFiles.map(f => ({
            path: f.relativePath,
            fileName: path.basename(f.path)
          }))
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Escaneia recursivamente o diretório de uploads
   */
  private static scanUploadDirectory() {
    const uploadsPath = path.join(process.cwd(), 'uploads');
    const files = [];
    
    function scanDir(dir: string) {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            scanDir(itemPath);
          } else if (item.isFile()) {
            files.push({
              path: itemPath,
              relativePath: path.relative(process.cwd(), itemPath),
              name: item.name,
              size: fs.statSync(itemPath).size
            });
          }
        }
      } catch (error) {
        console.error(`[FileIntegrity] Erro ao escanear ${dir}:`, error);
      }
    }
    
    scanDir(uploadsPath);
    return files;
  }
}
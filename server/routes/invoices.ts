import { Router } from 'express';
import { storage } from '../storage';
import { upload, processImage, moveFile } from '../upload';
import path from 'path';
import fs from 'fs';
import { authenticateJWT, requirePermission } from '../auth';

const router = Router();

// Middleware to check authentication for all routes
router.use(authenticateJWT);

// Rota para upload de nota fiscal para documento financeiro
router.post('/financial-documents/:id/invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    const documentId = parseInt(req.params.id);
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Verificar se o documento financeiro existe
    const document = await storage.getFinancialDocument(documentId);
    if (!document) {
      // Remover arquivo temporário
      fs.unlinkSync(filePath);
      return res.status(404).json({ message: 'Documento financeiro não encontrado' });
    }
    
    // Processar imagem ou mover arquivo para diretório apropriado
    const isImage = mimeType.startsWith('image/');
    let fileUrl;
    
    if (isImage) {
      // Processar e mover imagem
      fileUrl = await processImage(filePath, 'financial', documentId);
    } else {
      // Mover outros tipos de arquivo
      fileUrl = moveFile(filePath, 'financial', documentId);
    }
    
    // Garantir que o caminho começa sem barra para consistência
    if (fileUrl.startsWith('/')) {
      fileUrl = fileUrl.substring(1);
    }
    
    // Verificar se o arquivo foi realmente salvo antes de atualizar o banco
    const fullPath = path.join(process.cwd(), fileUrl);
    if (!fs.existsSync(fullPath)) {
      console.error(`[Upload Error] Arquivo não foi salvo corretamente: ${fullPath}`);
      return res.status(500).json({ message: 'Erro interno: arquivo não foi salvo corretamente' });
    }
    
    try {
      // Atualizar o documento financeiro no banco de dados
      const updatedDocument = await storage.updateFinancialDocument(documentId, {
        invoice_file: fileUrl,
        invoice_file_name: fileName,
        invoice_file_uploaded_at: new Date(),
        invoice_file_uploaded_by: req.user?.id || null
      });
      
      if (!updatedDocument) {
        // Rollback: remover arquivo se atualização do banco falhou
        try {
          fs.unlinkSync(fullPath);
          console.log(`[Rollback] Arquivo removido após falha no banco: ${fullPath}`);
        } catch (rollbackError) {
          console.error(`[Rollback Error] Não foi possível remover arquivo: ${rollbackError}`);
        }
        return res.status(500).json({ message: 'Erro ao atualizar documento no banco de dados' });
      }
      
      console.log(`[Upload Success] Arquivo ${fileName} anexado ao documento ${documentId}`);
      
    } catch (dbError) {
      // Rollback: remover arquivo se atualização do banco falhou
      try {
        fs.unlinkSync(fullPath);
        console.log(`[Rollback] Arquivo removido após erro no banco: ${fullPath}`);
      } catch (rollbackError) {
        console.error(`[Rollback Error] Não foi possível remover arquivo: ${rollbackError}`);
      }
      throw dbError;
    }

    res.status(201).json({
      message: 'Nota fiscal anexada com sucesso',
      document: document
    });
  } catch (error) {
    console.error('Erro ao fazer upload da nota fiscal:', error);
    res.status(500).json({ 
      message: 'Erro ao processar upload da nota fiscal', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Rota para excluir nota fiscal de um documento financeiro
router.delete('/financial-documents/:id/invoice', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // Verificar se o documento financeiro existe
    const document = await storage.getFinancialDocument(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento financeiro não encontrado' });
    }
    
    // Verificar se existe uma nota fiscal anexada
    if (!document.invoice_file) {
      return res.status(400).json({ message: 'Este documento não possui nota fiscal anexada' });
    }
    
    // Tentar remover o arquivo físico se ele existir
    try {
      const filePath = path.join(process.cwd(), document.invoice_file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error(`Erro ao excluir arquivo físico para o documento ${documentId}:`, fileError);
      // Continuar com a exclusão do registro mesmo se o arquivo não puder ser excluído
    }
    
    // Atualizar o documento para remover a referência ao arquivo
    const updatedDocument = await storage.updateFinancialDocument(documentId, {
      invoice_file: null,
      invoice_file_name: null,
      invoice_file_uploaded_at: null,
      invoice_file_uploaded_by: null
    });

    res.json({
      success: true,
      message: 'Nota fiscal removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover nota fiscal:', error);
    res.status(500).json({ 
      message: 'Erro ao remover nota fiscal', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Rota para upload de nota fiscal para despesa
router.post('/expenses/:id/invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    const expenseId = parseInt(req.params.id);
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Verificar se a despesa existe
    const expense = await storage.getExpense(expenseId);
    if (!expense) {
      // Remover arquivo temporário
      fs.unlinkSync(filePath);
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }
    
    // Processar imagem ou mover arquivo para diretório apropriado
    const isImage = mimeType.startsWith('image/');
    let fileUrl;
    
    if (isImage) {
      // Processar e mover imagem
      fileUrl = await processImage(filePath, 'financial', expenseId);
    } else {
      // Mover outros tipos de arquivo
      fileUrl = moveFile(filePath, 'financial', expenseId);
    }
    
    // Garantir que o caminho começa sem barra para consistência
    if (fileUrl.startsWith('/')) {
      fileUrl = fileUrl.substring(1);
    }
    
    // Atualizar a despesa no banco de dados
    const updatedExpense = await storage.updateExpense(expenseId, {
      invoice_file: fileUrl,
      invoice_file_name: fileName,
      invoice_file_uploaded_at: new Date(),
      invoice_file_uploaded_by: req.user?.id || null
    });

    res.status(201).json(updatedExpense);
  } catch (error) {
    console.error('Erro ao fazer upload da nota fiscal para despesa:', error);
    res.status(500).json({ 
      message: 'Erro ao processar upload da nota fiscal', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Rota para excluir nota fiscal de uma despesa
router.delete('/expenses/:id/invoice', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    
    // Verificar se a despesa existe
    const expense = await storage.getExpense(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }
    
    // Verificar se existe uma nota fiscal anexada
    if (!expense.invoice_file) {
      return res.status(400).json({ message: 'Esta despesa não possui nota fiscal anexada' });
    }
    
    // Tentar remover o arquivo físico se ele existir
    try {
      const filePath = path.join(process.cwd(), expense.invoice_file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error(`Erro ao excluir arquivo físico para a despesa ${expenseId}:`, fileError);
      // Continuar com a exclusão do registro mesmo se o arquivo não puder ser excluído
    }
    
    // Atualizar a despesa para remover a referência ao arquivo
    const updatedExpense = await storage.updateExpense(expenseId, {
      invoice_file: null,
      invoice_file_name: null,
      invoice_file_uploaded_at: null,
      invoice_file_uploaded_by: null
    });

    res.json({
      success: true,
      message: 'Nota fiscal removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover nota fiscal da despesa:', error);
    res.status(500).json({ 
      message: 'Erro ao remover nota fiscal', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Rota para baixar nota fiscal de documento financeiro
router.get('/financial-documents/:id/invoice/download', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // Verificar se o documento financeiro existe
    const document = await storage.getFinancialDocument(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento financeiro não encontrado' });
    }
    
    // Verificar se existe uma nota fiscal anexada
    if (!document.invoice_file || !document.invoice_file_name) {
      return res.status(400).json({ message: 'Este documento não possui nota fiscal anexada' });
    }
    
    // Verificar várias possibilidades de caminho do arquivo
    let filePath = document.invoice_file;
    
    // Garantir que estamos trabalhando com caminho relativo sem barras iniciais
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Verificar caminho absoluto baseado no path armazenado
    const absolutePath = path.join(process.cwd(), filePath);
    console.log('Tentando acessar arquivo em:', absolutePath);
    
    if (fs.existsSync(absolutePath)) {
      // Definir o tipo de conteúdo correto baseado na extensão do arquivo
      const ext = path.extname(document.invoice_file_name).toLowerCase();
      let contentType = 'application/octet-stream'; // Padrão para qualquer tipo de arquivo
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.invoice_file_name}"`);
      return fs.createReadStream(absolutePath).pipe(res);
    }
    
    // Tentar caminho alternativo baseado na estrutura de upload
    const fileName = path.basename(filePath);
    const altPath = path.join(process.cwd(), 'uploads', 'financial', String(documentId), fileName);
    console.log('Tentando caminho alternativo:', altPath);
    
    if (fs.existsSync(altPath)) {
      // Definir o tipo de conteúdo correto baseado na extensão do arquivo
      const ext = path.extname(document.invoice_file_name).toLowerCase();
      let contentType = 'application/octet-stream'; // Padrão para qualquer tipo de arquivo
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.invoice_file_name}"`);
      return fs.createReadStream(altPath).pipe(res);
    }
    
    // Última tentativa - buscar diretamente na pasta de uploads raiz
    const rootUploadPath = path.join(process.cwd(), 'uploads', fileName);
    console.log('Tentando caminho root upload:', rootUploadPath);
    
    if (fs.existsSync(rootUploadPath)) {
      // Definir o tipo de conteúdo correto baseado na extensão do arquivo
      const ext = path.extname(document.invoice_file_name).toLowerCase();
      let contentType = 'application/octet-stream'; // Padrão para qualquer tipo de arquivo
      
      if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.invoice_file_name}"`);
      return fs.createReadStream(rootUploadPath).pipe(res);
    }
    
    // Busca robusta - procurar por arquivos com padrão similar em todos os diretórios
    console.log('Iniciando busca robusta por arquivo similar...');
    
    // Buscar recursivamente em toda a pasta uploads
    const searchForFile = (dir, searchPattern) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            // Buscar recursivamente em subdiretórios
            const result = searchForFile(itemPath, searchPattern);
            if (result) return result;
          } else if (item.isFile()) {
            // Verificar se o arquivo corresponde ao padrão
            const fileName = item.name.toLowerCase();
            const searchLower = searchPattern.toLowerCase();
            
            // Extrair número da NFSe para comparação mais robusta
            const fileNfseMatch = fileName.match(/nfse_(\d+)/);
            const searchNfseMatch = searchPattern.toLowerCase().match(/nfse_(\d+)/);
            
            if (fileNfseMatch && searchNfseMatch && fileNfseMatch[1] === searchNfseMatch[1]) {
              console.log(`NFSe ${searchNfseMatch[1]} encontrada: ${itemPath}`);
              return itemPath;
            }
            
            // Buscar por padrão de nome mais amplo
            if (fileName.includes(searchPattern.toLowerCase().replace(/\.[^/.]+$/, ""))) {
              console.log(`Arquivo correspondente encontrado: ${itemPath}`);
              return itemPath;
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar em ${dir}:`, error);
      }
      return null;
    };
    
    // Buscar por número de NFSe nos arquivos existentes
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const nfseNumber = document.invoice_file_name.match(/NFSe_(\d+)/i);
    
    if (nfseNumber) {
      const foundFile = searchForFile(uploadsDir, `NFSe_${nfseNumber[1]}`);
      
      if (foundFile) {
        console.log(`Arquivo NFSe ${nfseNumber[1]} encontrado: ${foundFile}`);
        
        const ext = path.extname(foundFile).toLowerCase();
        let contentType = 'application/pdf';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${document.invoice_file_name}"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        const stream = fs.createReadStream(foundFile);
        stream.on('error', (streamError) => {
          console.error('Erro ao ler arquivo NFSe:', streamError);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Erro ao ler arquivo' });
          }
        });
        
        return stream.pipe(res);
      }
    }
    
    // Se chegou aqui, não encontrou o arquivo
    return res.status(404).json({ 
      message: 'Arquivo não encontrado no servidor', 
      checked_paths: [absolutePath, altPath, rootUploadPath],
      file_url: document.invoice_file
    });
  } catch (error) {
    console.error('Erro ao baixar nota fiscal:', error);
    res.status(500).json({ 
      message: 'Erro ao baixar nota fiscal', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Rota para baixar nota fiscal de despesa
router.get('/expenses/:id/invoice/download', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    
    // Verificar se a despesa existe
    const expense = await storage.getExpense(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Despesa não encontrada' });
    }
    
    // Verificar se existe uma nota fiscal anexada
    if (!expense.invoice_file || !expense.invoice_file_name) {
      return res.status(400).json({ message: 'Esta despesa não possui nota fiscal anexada' });
    }
    
    // Verificar várias possibilidades de caminho do arquivo
    let filePath = expense.invoice_file;
    
    // Garantir que estamos trabalhando com caminho relativo sem barras iniciais
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Verificar caminho absoluto baseado no path armazenado
    const absolutePath = path.join(process.cwd(), filePath);
    console.log('Tentando acessar arquivo em:', absolutePath);
    
    if (fs.existsSync(absolutePath)) {
      return res.download(absolutePath, expense.invoice_file_name);
    }
    
    // Tentar caminho alternativo baseado na estrutura de upload
    const fileName = path.basename(filePath);
    const altPath = path.join(process.cwd(), 'uploads', 'financial', String(expenseId), fileName);
    console.log('Tentando caminho alternativo:', altPath);
    
    if (fs.existsSync(altPath)) {
      return res.download(altPath, expense.invoice_file_name);
    }
    
    // Última tentativa - buscar diretamente na pasta de uploads raiz
    const rootUploadPath = path.join(process.cwd(), 'uploads', fileName);
    console.log('Tentando caminho root upload:', rootUploadPath);
    
    if (fs.existsSync(rootUploadPath)) {
      return res.download(rootUploadPath, expense.invoice_file_name);
    }
    
    // Se chegou aqui, não encontrou o arquivo
    return res.status(404).json({ 
      message: 'Arquivo não encontrado no servidor', 
      checked_paths: [absolutePath, altPath, rootUploadPath],
      file_url: expense.invoice_file
    });
  } catch (error) {
    console.error('Erro ao baixar nota fiscal:', error);
    res.status(500).json({ 
      message: 'Erro ao baixar nota fiscal', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
import { Router, Request, Response } from 'express';
import { upload, deleteFile } from '../utils/upload';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { clientFiles } from '../../shared/schema';
import fs from 'fs';
import path from 'path';
import { authenticateJWT } from '../auth';
import cookieParser from 'cookie-parser';

const router = Router();

// Middleware para autenticação
router.use(authenticateJWT);

// Rota para listar arquivos de um cliente
router.get('/clients/:clientId/files', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const files = await db.select().from(clientFiles).where(eq(clientFiles.client_id, parseInt(clientId)));
    res.json(files);
  } catch (error) {
    console.error('Erro ao listar arquivos do cliente:', error);
    res.status(500).json({ message: 'Erro ao listar arquivos do cliente' });
  }
});

// Middleware para verificar o campo files antes de usar o multer
const checkFiles = (req: Request, res: Response, next: Function) => {
  // Log para depuração
  console.log('Headers da requisição:', req.headers);
  console.log('Corpo da requisição:', req.body);
  console.log('Files na requisição:', req.files);
  
  // Verificar se é multipart/form-data
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    console.warn('Content-Type não é multipart/form-data:', contentType);
  }
  
  next();
};

// Rota para fazer upload de arquivos para um cliente
router.post('/clients/:clientId/files', checkFiles, upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const files = req.files as Express.Multer.File[];
    const user = req.user as any;
    
    console.log('Requisição recebida - Files:', files);
    console.log('User:', user);
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    const uploadedFiles = [];

    // Inserir registros no banco de dados para cada arquivo
    for (const file of files) {
      const fileData = {
        client_id: parseInt(clientId),
        name: file.originalname,
        path: file.path,
        size: file.size,
        type: file.mimetype,
        uploaded_by: user ? user.id : null,
        description: ''
      };

      console.log('Salvando arquivo no banco:', fileData);
      const [insertedFile] = await db.insert(clientFiles).values(fileData).returning();
      uploadedFiles.push(insertedFile);
    }

    res.status(201).json(uploadedFiles);
  } catch (error) {
    console.error('Erro ao fazer upload de arquivos:', error);
    res.status(500).json({ 
      message: 'Erro ao fazer upload de arquivos',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Rota para deletar um arquivo
router.delete('/clients/:clientId/files/:fileId', async (req: Request, res: Response) => {
  try {
    const { clientId, fileId } = req.params;
    
    // Buscar arquivo no banco de dados
    const [file] = await db.select().from(clientFiles)
      .where(eq(clientFiles.id, parseInt(fileId)))
      .where(eq(clientFiles.client_id, parseInt(clientId)));
    
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    // Deletar arquivo do sistema de arquivos
    const deleted = await deleteFile(file.path);
    
    if (!deleted) {
      return res.status(500).json({ message: 'Erro ao excluir arquivo do sistema' });
    }
    
    // Remover registro do banco de dados
    await db.delete(clientFiles).where(eq(clientFiles.id, parseInt(fileId)));
    
    res.status(200).json({ message: 'Arquivo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    res.status(500).json({ message: 'Erro ao excluir arquivo' });
  }
});

// Rota para visualizar um arquivo
router.get('/clients/:clientId/files/:fileId/view', async (req: Request, res: Response) => {
  try {
    const { clientId, fileId } = req.params;
    
    // Buscar arquivo no banco de dados
    const [file] = await db.select().from(clientFiles)
      .where(eq(clientFiles.id, parseInt(fileId)))
      .where(eq(clientFiles.client_id, parseInt(clientId)));
    
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    // Verificar se o arquivo existe no sistema de arquivos
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'Arquivo físico não encontrado' });
    }
    
    // Configurar cabeçalhos para exibir arquivo no navegador
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    
    // Enviar o arquivo
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Erro ao visualizar arquivo:', error);
    res.status(500).json({ message: 'Erro ao visualizar arquivo' });
  }
});

// Rota para download de arquivo
router.get('/clients/:clientId/files/:fileId/download', async (req: Request, res: Response) => {
  try {
    const { clientId, fileId } = req.params;
    
    // Buscar arquivo no banco de dados
    const [file] = await db.select().from(clientFiles)
      .where(eq(clientFiles.id, parseInt(fileId)))
      .where(eq(clientFiles.client_id, parseInt(clientId)));
    
    if (!file) {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    // Verificar se o arquivo existe no sistema de arquivos
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'Arquivo físico não encontrado' });
    }
    
    // Configurar cabeçalhos para download
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    
    // Enviar o arquivo
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Erro ao fazer download do arquivo:', error);
    res.status(500).json({ message: 'Erro ao fazer download do arquivo' });
  }
});

export default router;
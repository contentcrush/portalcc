import { Router } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import upload from '../utils/file-upload';
import path from 'path';
import fs from 'fs';
import { insertClientDocumentSchema } from '../../shared/schema';
import { z } from 'zod';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');

// Função para obter o caminho completo do arquivo
export function getClientDocumentPath(fileName: string): string {
  return path.join(uploadDir, fileName);
}

// Função para deletar um arquivo
export function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Obter todos os documentos de um cliente
router.get('/:clientId/documents', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const documents = await storage.getClientDocuments(clientId);
    res.json(documents);
  } catch (error) {
    console.error('Erro ao buscar documentos do cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos do cliente' });
  }
});

// Obter um documento específico
router.get('/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await storage.getClientDocument(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
});

// Upload de documento
router.post('/:clientId/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const clientId = parseInt(req.params.clientId);
    const file = req.file;
    
    // Validar os dados do corpo da requisição usando o schema
    try {
      const documentData = insertClientDocumentSchema.parse({
        client_id: clientId,
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
        category: req.body.category || null,
        description: req.body.description || null,
        uploaded_by: req.user.id
      });
      
      // Criar o documento no banco com o caminho do arquivo
      const document = await storage.createClientDocument({
        ...documentData,
        file_url: `/uploads/${file.filename}`
      });
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erro ao fazer upload de documento:', error);
    // Se ocorrer um erro, tenta remover o arquivo que foi enviado
    if (req.file) {
      try {
        await deleteFile(req.file.path);
      } catch (unlinkError) {
        console.error('Erro ao remover arquivo após falha:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Erro ao fazer upload de documento' });
  }
});

// Atualizar metadados do documento
router.patch('/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await storage.getClientDocument(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    // Só podemos atualizar certos campos (não o arquivo em si)
    const updateData = {
      category: req.body.category,
      description: req.body.description
    };
    
    const updatedDocument = await storage.updateClientDocument(id, updateData);
    res.json(updatedDocument);
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

// Deletar documento
router.delete('/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await storage.getClientDocument(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    // Remover o arquivo físico
    const filePath = getClientDocumentPath(path.basename(document.file_url));
    try {
      await deleteFile(filePath);
    } catch (unlinkError) {
      console.error('Aviso: falha ao remover arquivo físico:', unlinkError);
      // Continuamos mesmo se não conseguirmos remover o arquivo
    }
    
    // Remover o registro do banco
    const success = await storage.deleteClientDocument(id);
    
    if (success) {
      res.status(200).json({ message: 'Documento removido com sucesso' });
    } else {
      res.status(500).json({ error: 'Erro ao remover documento do banco de dados' });
    }
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({ error: 'Erro ao deletar documento' });
  }
});

// Download de documento
router.get('/documents/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await storage.getClientDocument(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    const filePath = getClientDocumentPath(path.basename(document.file_url));
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }
    
    // Enviar o arquivo
    res.download(filePath, document.file_name, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo:', err);
        // Se o cabeçalho ainda não foi enviado, podemos tentar enviar uma resposta de erro
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao baixar arquivo' });
        }
      }
    });
  } catch (error) {
    console.error('Erro ao processar download de documento:', error);
    res.status(500).json({ error: 'Erro ao processar download de documento' });
  }
});

export default router;
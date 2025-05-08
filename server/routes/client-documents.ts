import express from 'express';
import { insertClientDocumentSchema } from '@shared/schema';
import { storage } from '../storage';
import { clientDocumentUpload, getClientDocumentPath, deleteFile } from '../utils/file-upload';
import path from 'path';
import fs from 'fs';
import { authenticateJWT } from '../auth';

const router = express.Router();

// Get all documents for a client
router.get('/client/:clientId/documents', authenticateJWT, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'ID do cliente inválido' });
    }

    const documents = await storage.getClientDocuments(clientId);
    res.json(documents);
  } catch (error) {
    console.error('Erro ao buscar documentos do cliente:', error);
    res.status(500).json({ message: 'Erro ao buscar documentos' });
  }
});

// Get a specific document
router.get('/client-documents/:id', authenticateJWT, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: 'ID do documento inválido' });
    }
    
    const document = await storage.getClientDocument(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ message: 'Erro ao buscar documento' });
  }
});

// Download a document
router.get('/client-documents/:id/download', authenticateJWT, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: 'ID do documento inválido' });
    }
    
    const document = await storage.getClientDocument(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    
    // Get the file path
    const filePath = getClientDocumentPath(document.file_key);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo não encontrado no servidor' });
    }
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Erro ao baixar documento:', error);
    res.status(500).json({ message: 'Erro ao baixar documento' });
  }
});

// Upload a new document
router.post('/client-documents', authenticateJWT, clientDocumentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }
    
    // Get file info
    const { filename, originalname, size, mimetype } = req.file;
    
    // Validate the request body using Zod schema
    const validatedData = insertClientDocumentSchema.parse({
      ...req.body,
      file_name: originalname,
      uploaded_by: req.user.id // From JWT authentication
    });
    
    // Create document record in database
    const newDocument = await storage.createClientDocument({
      ...validatedData,
      file_key: filename,
      file_url: `/api/client-documents/${filename}/download`,
      file_size: size,
      file_type: mimetype,
      upload_date: new Date()
    });
    
    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Erro ao fazer upload do documento:', error);
    // If there was an error, try to delete the uploaded file
    if (req.file) {
      const filePath = getClientDocumentPath(req.file.filename);
      deleteFile(filePath).catch(err => console.error('Failed to delete file after error:', err));
    }
    res.status(500).json({ message: 'Erro ao fazer upload do documento' });
  }
});

// Update document metadata
router.patch('/client-documents/:id', authenticateJWT, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: 'ID do documento inválido' });
    }
    
    const document = await storage.getClientDocument(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    
    // Update document
    const updatedDocument = await storage.updateClientDocument(documentId, req.body);
    res.json(updatedDocument);
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    res.status(500).json({ message: 'Erro ao atualizar documento' });
  }
});

// Delete a document
router.delete('/client-documents/:id', authenticateJWT, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ message: 'ID do documento inválido' });
    }
    
    const document = await storage.getClientDocument(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    
    // Delete file from disk
    const filePath = getClientDocumentPath(document.file_key);
    await deleteFile(filePath);
    
    // Delete from database
    const result = await storage.deleteClientDocument(documentId);
    
    if (result) {
      res.json({ success: true, message: 'Documento excluído com sucesso' });
    } else {
      res.status(500).json({ message: 'Erro ao excluir documento' });
    }
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    res.status(500).json({ message: 'Erro ao excluir documento' });
  }
});

export default router;
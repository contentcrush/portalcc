import { Router } from 'express';
import { storage } from '../storage';
import { upload, processImage, moveFile } from '../upload';
import path from 'path';
import fs from 'fs';
import { clientAttachments, projectAttachments, taskAttachments } from '../../shared/schema';
import { authenticateJWT } from '../auth';

const router = Router();

// Middleware to check authentication for all routes
router.use(authenticateJWT);

// Route to get all attachments
router.get('/all', async (req, res) => {
  try {
    const allAttachments = await storage.getAllAttachments();
    res.json(allAttachments);
  } catch (error) {
    console.error('Error getting all attachments:', error);
    res.status(500).json({ message: 'Error getting attachments', error: error instanceof Error ? error.message : String(error) });
  }
});

// Client Attachments
// Route to get client attachments
router.get('/clients/:clientId', async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const attachments = await storage.getClientAttachments(clientId);
    res.json(attachments);
  } catch (error) {
    console.error('Error getting client attachments:', error);
    res.status(500).json({ message: 'Error getting client attachments', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route for client attachment upload
router.post('/clients/:clientId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const clientId = parseInt(req.params.clientId);
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Process image or move file to appropriate directory
    const isImage = mimeType.startsWith('image/');
    let fileUrl;
    
    if (isImage) {
      // Process and move image
      fileUrl = await processImage(filePath, 'clients', clientId);
    } else {
      // Move other file types
      fileUrl = moveFile(filePath, 'clients', clientId);
    }
    
    // Save to database
    const attachment = await storage.createClientAttachment({
      client_id: clientId,
      file_name: fileName,
      file_size: fileSize,
      file_type: mimeType,
      file_url: fileUrl,
      uploaded_by: req.user?.id || null,
      description: req.body.description || null,
      tags: req.body.tags || null
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ message: 'Error processing upload', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route to download client attachment
router.get('/clients/:clientId/download/:attachmentId', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await storage.getClientAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Verificar várias possibilidades de caminho do arquivo
    let filePath = attachment.file_url;
    
    // Garantir que estamos trabalhando com caminho relativo sem barras iniciais
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Verificar caminho absoluto baseado no path armazenado
    const absolutePath = path.join(process.cwd(), filePath);
    console.log('Tentando acessar arquivo em:', absolutePath);
    
    if (fs.existsSync(absolutePath)) {
      return res.download(absolutePath, attachment.file_name);
    }
    
    // Tentar caminho alternativo baseado na estrutura de upload
    const fileName = path.basename(filePath);
    const altPath = path.join(process.cwd(), 'uploads', 'clients', String(attachment.client_id), fileName);
    console.log('Tentando caminho alternativo:', altPath);
    
    if (fs.existsSync(altPath)) {
      return res.download(altPath, attachment.file_name);
    }
    
    // Última tentativa - buscar diretamente na pasta de uploads raiz
    const rootUploadPath = path.join(process.cwd(), 'uploads', fileName);
    console.log('Tentando caminho root upload:', rootUploadPath);
    
    if (fs.existsSync(rootUploadPath)) {
      return res.download(rootUploadPath, attachment.file_name);
    }
    
    // Se chegou aqui, não encontrou o arquivo
    return res.status(404).json({ 
      message: 'File not found on server', 
      checked_paths: [absolutePath, altPath, rootUploadPath],
      file_url: attachment.file_url
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ message: 'Error downloading file', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route to delete client attachment
router.delete('/clients/:clientId/:attachmentId', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await storage.getClientAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Check permissions (optional, depending on business rules)
    
    // Delete physical file
    const filePath = path.join(process.cwd(), attachment.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Remove database record
    await storage.deleteClientAttachment(attachmentId);
    
    res.status(200).json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Error deleting attachment', error: error instanceof Error ? error.message : String(error) });
  }
});

// Project Attachments
// Route to get project attachments
router.get('/projects/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const attachments = await storage.getProjectAttachments(projectId);
    res.json(attachments);
  } catch (error) {
    console.error('Error getting project attachments:', error);
    res.status(500).json({ message: 'Error getting project attachments', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route for project attachment upload
router.post('/projects/:projectId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const projectId = parseInt(req.params.projectId);
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Process image or move file to appropriate directory
    const isImage = mimeType.startsWith('image/');
    let fileUrl;
    
    if (isImage) {
      // Process and move image
      fileUrl = await processImage(filePath, 'projects', projectId);
    } else {
      // Move other file types
      fileUrl = moveFile(filePath, 'projects', projectId);
    }
    
    // Garantir que o caminho começa sem barra para consistência
    if (fileUrl.startsWith('/')) {
      fileUrl = fileUrl.substring(1);
    }
    
    // Save to database
    const attachment = await storage.createProjectAttachment({
      project_id: projectId,
      file_name: fileName,
      file_size: fileSize,
      file_type: mimeType,
      file_url: fileUrl,
      uploaded_by: req.user?.id || null
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ message: 'Error processing upload', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route to download project attachment
router.get('/projects/:projectId/download/:attachmentId', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await storage.getProjectAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Verificar várias possibilidades de caminho do arquivo
    let filePath = attachment.file_url;
    
    // Garantir que estamos trabalhando com caminho relativo sem barras iniciais
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Verificar caminho absoluto baseado no path armazenado
    const absolutePath = path.join(process.cwd(), filePath);
    console.log('Tentando acessar arquivo em:', absolutePath);
    
    if (fs.existsSync(absolutePath)) {
      return res.download(absolutePath, attachment.file_name);
    }
    
    // Tentar caminho alternativo baseado na estrutura de upload
    const fileName = path.basename(filePath);
    const altPath = path.join(process.cwd(), 'uploads', 'projects', String(attachment.project_id), fileName);
    console.log('Tentando caminho alternativo:', altPath);
    
    if (fs.existsSync(altPath)) {
      return res.download(altPath, attachment.file_name);
    }
    
    // Última tentativa - buscar diretamente na pasta de uploads raiz
    const rootUploadPath = path.join(process.cwd(), 'uploads', fileName);
    console.log('Tentando caminho root upload:', rootUploadPath);
    
    if (fs.existsSync(rootUploadPath)) {
      return res.download(rootUploadPath, attachment.file_name);
    }
    
    // Se chegou aqui, não encontrou o arquivo
    return res.status(404).json({ 
      message: 'File not found on server', 
      checked_paths: [absolutePath, altPath, rootUploadPath],
      file_url: attachment.file_url
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ message: 'Error downloading file', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route to delete project attachment
router.delete('/projects/:projectId/:attachmentId', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await storage.getProjectAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Check permissions (optional, depending on business rules)
    
    // Delete physical file
    const filePath = path.join(process.cwd(), attachment.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Remove database record
    await storage.deleteProjectAttachment(attachmentId);
    
    res.status(200).json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Error deleting attachment', error: error instanceof Error ? error.message : String(error) });
  }
});

// Task Attachments
// Route to get task attachments
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const attachments = await storage.getTaskAttachments(taskId);
    res.json(attachments);
  } catch (error) {
    console.error('Error getting task attachments:', error);
    res.status(500).json({ message: 'Error getting task attachments', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route for task attachment upload
router.post('/tasks/:taskId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const taskId = parseInt(req.params.taskId);
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Process image or move file to appropriate directory
    const isImage = mimeType.startsWith('image/');
    let fileUrl;
    
    if (isImage) {
      // Process and move image
      fileUrl = await processImage(filePath, 'tasks', taskId);
    } else {
      // Move other file types
      fileUrl = moveFile(filePath, 'tasks', taskId);
    }
    
    // Save to database
    const attachment = await storage.createTaskAttachment({
      task_id: taskId,
      file_name: fileName,
      file_size: fileSize,
      file_type: mimeType,
      file_url: fileUrl,
      uploaded_by: req.user?.id || null
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ message: 'Error processing upload', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route to download task attachment
router.get('/tasks/:taskId/download/:attachmentId', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await storage.getTaskAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Verificar várias possibilidades de caminho do arquivo
    let filePath = attachment.file_url;
    
    // Garantir que estamos trabalhando com caminho relativo sem barras iniciais
    if (filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    // Verificar caminho absoluto baseado no path armazenado
    const absolutePath = path.join(process.cwd(), filePath);
    console.log('Tentando acessar arquivo em:', absolutePath);
    
    if (fs.existsSync(absolutePath)) {
      return res.download(absolutePath, attachment.file_name);
    }
    
    // Tentar caminho alternativo baseado na estrutura de upload
    const fileName = path.basename(filePath);
    const altPath = path.join(process.cwd(), 'uploads', 'tasks', String(attachment.task_id), fileName);
    console.log('Tentando caminho alternativo:', altPath);
    
    if (fs.existsSync(altPath)) {
      return res.download(altPath, attachment.file_name);
    }
    
    // Última tentativa - buscar diretamente na pasta de uploads raiz
    const rootUploadPath = path.join(process.cwd(), 'uploads', fileName);
    console.log('Tentando caminho root upload:', rootUploadPath);
    
    if (fs.existsSync(rootUploadPath)) {
      return res.download(rootUploadPath, attachment.file_name);
    }
    
    // Se chegou aqui, não encontrou o arquivo
    return res.status(404).json({ 
      message: 'File not found on server', 
      checked_paths: [absolutePath, altPath, rootUploadPath],
      file_url: attachment.file_url
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ message: 'Error downloading file', error: error instanceof Error ? error.message : String(error) });
  }
});

// Route to delete task attachment
router.delete('/tasks/:taskId/:attachmentId', async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await storage.getTaskAttachment(attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Check permissions (optional, depending on business rules)
    
    // Delete physical file
    const filePath = path.join(process.cwd(), attachment.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Remove database record
    await storage.deleteTaskAttachment(attachmentId);
    
    res.status(200).json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Error deleting attachment', error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
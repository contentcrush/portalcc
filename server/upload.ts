import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

// Criar diretórios de upload se não existirem
const uploadDir = path.join(process.cwd(), 'uploads');
const clientsDir = path.join(uploadDir, 'clients');
const projectsDir = path.join(uploadDir, 'projects');
const tasksDir = path.join(uploadDir, 'tasks');
const eventsDir = path.join(uploadDir, 'events');
const financialDir = path.join(uploadDir, 'financial');
const tempDir = path.join(uploadDir, 'temp');

// Garantir que os diretórios existam
[uploadDir, clientsDir, projectsDir, tasksDir, eventsDir, financialDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    // Use o diretório temporário para upload inicial
    cb(null, tempDir);
  },
  filename: (req: Request, file, cb) => {
    // Gerar um nome de arquivo único com UUID para evitar colisões
    const uniqueId = randomUUID();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    // Truncar o nome base se for muito longo e adicionar UUID
    const truncatedName = baseName.length > 50 
      ? baseName.substring(0, 50) 
      : baseName;
    
    const fileName = `${truncatedName}-${uniqueId}${extension}`;
    cb(null, fileName);
  }
});

// Filtro de arquivos para permitir apenas formatos específicos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos de arquivo permitidos
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/json',
    'application/zip', 'application/x-rar-compressed',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
};

// Configuração do Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limite máximo (ajustar conforme necessário)
  }
});

// Função para processar imagens após o upload
export async function processImage(filePath: string, category: string, id: string | number): Promise<string> {
  try {
    const destDir = path.join(uploadDir, category);
    
    // Criar pasta específica para o cliente/projeto/tarefa se não existir
    const entityDir = path.join(destDir, id.toString());
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const destPath = path.join(entityDir, fileName);
    
    // Verificar se é uma imagem
    const mimeType = path.extname(filePath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(mimeType);
    
    if (isImage) {
      // Processar a imagem com sharp
      await sharp(filePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }) // Redimensionar mantendo proporção
        .toFile(destPath);
        
      // Remover o arquivo temporário
      fs.unlinkSync(filePath);
      
      return destPath;
    } else {
      // Para arquivos que não são imagens, apenas mover
      fs.copyFileSync(filePath, destPath);
      fs.unlinkSync(filePath);
      return destPath;
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    throw error;
  }
}

// Função para mover arquivo do diretório temporário para o diretório final
export function moveFile(filePath: string, category: string, id: string | number): string {
  try {
    const destDir = path.join(uploadDir, category);
    
    // Criar pasta específica para o cliente/projeto/tarefa se não existir
    const entityDir = path.join(destDir, id.toString());
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const destPath = path.join(entityDir, fileName);
    
    // Mover o arquivo
    fs.copyFileSync(filePath, destPath);
    fs.unlinkSync(filePath);
    
    // Retornar o caminho relativo para o banco de dados
    return `/uploads/${category}/${id}/${fileName}`;
  } catch (error) {
    console.error('Erro ao mover arquivo:', error);
    throw error;
  }
}

export { upload };
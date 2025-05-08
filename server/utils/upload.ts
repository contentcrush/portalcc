import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Certificar que a pasta de uploads existe
const uploadDir = path.join(process.cwd(), 'uploads');
const clientFilesDir = path.join(uploadDir, 'client_files');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

if (!fs.existsSync(clientFilesDir)) {
  fs.mkdirSync(clientFilesDir);
}

// Configuração de armazenamento para Multer
const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb) {
    const clientId = req.params.clientId;
    const clientDir = path.join(clientFilesDir, clientId);
    
    // Criar pasta específica para o cliente se não existir
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    
    cb(null, clientDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb) {
    // Gerar nome de arquivo único para evitar sobrescrita
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.originalname.replace(ext, '') + '-' + uniqueSuffix + ext);
  }
});

// Filtro para tipos de arquivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos de arquivo permitidos
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido. Tipos permitidos: ${allowedMimes.join(', ')}`));
  }
};

// Limites de upload
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 5 // máximo de 5 arquivos de uma vez
};

// Exportar configuração do Multer
export const upload = multer({
  storage,
  fileFilter,
  limits
});

// Helper para excluir arquivos
export const deleteFile = (filePath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Erro ao excluir arquivo:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
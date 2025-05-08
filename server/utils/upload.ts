import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import crypto from 'crypto';

// Pasta de upload de arquivos
const UPLOAD_FOLDER = './uploads';

// Certificar que a pasta de uploads existe
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb) {
    // Criar pastas específicas para cada cliente
    const clientId = req.params.clientId;
    const clientFolder = path.join(UPLOAD_FOLDER, `client_${clientId}`);
    
    if (!fs.existsSync(clientFolder)) {
      fs.mkdirSync(clientFolder, { recursive: true });
    }
    
    cb(null, clientFolder);
  },
  filename: function (req: Request, file: Express.Multer.File, cb) {
    // Gerar nome de arquivo único para evitar colisões
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const fileExt = path.extname(file.originalname);
    cb(null, `${path.basename(file.originalname, fileExt)}-${uniqueSuffix}${fileExt}`);
  }
});

// Filtro para tipos de arquivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos MIME permitidos
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/json'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
};

// Configuração do multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

// Função para excluir um arquivo
export const deleteFile = (filePath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`Arquivo não encontrado para exclusão: ${filePath}`);
      return resolve(false);
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Erro ao excluir arquivo ${filePath}:`, err);
        return resolve(false);
      }
      
      return resolve(true);
    });
  });
};
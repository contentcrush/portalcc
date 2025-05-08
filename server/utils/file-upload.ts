import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// In ES modules, we need to get the directory using fileURLToPath
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const clientDocsDir = path.join(uploadDir, 'client-documents');

// Create directories if they don't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(clientDocsDir)) {
  fs.mkdirSync(clientDocsDir, { recursive: true });
}

// Configure storage for client documents
const clientDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, clientDocsDir);
  },
  filename: (_req, file, cb) => {
    // Generate a unique filename with original extension
    const uniqueId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const sanitizedFileName = file.originalname
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with a single one
      .substring(0, 50); // Limit the filename length to 50 chars
      
    const finalFileName = `${uniqueId}_${sanitizedFileName}${fileExtension}`;
    cb(null, finalFileName);
  }
});

// Create multer upload middlewares
export const clientDocumentUpload = multer({
  storage: clientDocStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Define allowed file types
    const allowedFileTypes = [
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.svg',
      // Archives
      '.zip', '.rar', '.7z',
      // Other
      '.csv', '.json'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${allowedFileTypes.join(', ')}`));
    }
  }
});

// Helper function to delete files
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Erro ao excluir arquivo ${filePath}:`, error);
    return false;
  }
};

// Helper function to get file path
export const getClientDocumentPath = (fileName: string): string => {
  return path.join(clientDocsDir, fileName);
};
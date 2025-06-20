/**
 * Sistema de compressão automática de imagens
 * Reduz o tamanho de thumbnails base64 para otimizar performance
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.85,
  maxSizeKB: 500 // 500KB limite padrão
};

/**
 * Comprime uma imagem base64 para otimizar performance
 */
export async function compressBase64Image(
  base64Data: string, 
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    // Verificar se já está no tamanho adequado
    const currentSizeKB = Math.round((base64Data.length * 3) / 4 / 1024);
    if (currentSizeKB <= opts.maxSizeKB) {
      resolve(base64Data);
      return;
    }
    
    console.log(`[Compressão] Comprimindo imagem de ${currentSizeKB}KB para máximo ${opts.maxSizeKB}KB`);
    
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto do canvas'));
          return;
        }
        
        // Calcular dimensões mantendo proporção
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Desenhar e comprimir
        ctx.drawImage(img, 0, 0, width, height);
        
        // Tentar diferentes qualidades até atingir o tamanho desejado
        let quality = opts.quality;
        let compressedData = '';
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
          compressedData = canvas.toDataURL('image/jpeg', quality);
          const compressedSizeKB = Math.round((compressedData.length * 3) / 4 / 1024);
          
          console.log(`[Compressão] Tentativa ${attempts + 1}: ${compressedSizeKB}KB com qualidade ${Math.round(quality * 100)}%`);
          
          if (compressedSizeKB <= opts.maxSizeKB || quality <= 0.3) {
            break;
          }
          
          quality -= 0.1;
          attempts++;
        }
        
        const finalSizeKB = Math.round((compressedData.length * 3) / 4 / 1024);
        console.log(`[Compressão] Concluída: ${currentSizeKB}KB → ${finalSizeKB}KB (${Math.round((1 - finalSizeKB/currentSizeKB) * 100)}% redução)`);
        
        resolve(compressedData);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem para compressão'));
    };
    
    img.src = base64Data;
  });
}

/**
 * Converte File para base64 comprimido
 */
export async function fileToCompressedBase64(
  file: File, 
  options: CompressionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const compressedData = await compressBase64Image(base64Data, options);
        resolve(compressedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Valida se uma thumbnail está no tamanho adequado
 */
export function validateThumbnailSize(base64Data: string, maxSizeKB: number = 500): boolean {
  const sizeKB = Math.round((base64Data.length * 3) / 4 / 1024);
  return sizeKB <= maxSizeKB;
}

/**
 * Obtém informações sobre uma imagem base64
 */
export function getImageInfo(base64Data: string) {
  const sizeBytes = Math.round((base64Data.length * 3) / 4);
  const sizeKB = Math.round(sizeBytes / 1024);
  const sizeMB = Math.round(sizeKB / 1024 * 100) / 100;
  
  // Extrair tipo de imagem
  const typeMatch = base64Data.match(/data:image\/([^;]+)/);
  const type = typeMatch ? typeMatch[1] : 'unknown';
  
  return {
    type,
    sizeBytes,
    sizeKB,
    sizeMB,
    isLarge: sizeKB > 500,
    isVeryLarge: sizeKB > 1000
  };
}
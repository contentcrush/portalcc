/**
 * Sistema de cache de imagens
 * Implementa um cache em memória para URLs de imagens e seus estados de carregamento
 */

// Interface para o cache de imagens
interface ImageCacheEntry {
  url: string;
  loaded: boolean;
  error: boolean;
  timestamp: number;
  element?: HTMLImageElement;
}

// Cache de imagens em memória
const imageCache: Map<string, ImageCacheEntry> = new Map();

// Tempo de expiração do cache (24 horas em milissegundos)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Verifica se uma URL de imagem está no cache
 * @param url URL da imagem a verificar
 * @returns Verdadeiro se a imagem estiver no cache e não expirada
 */
export function isImageCached(url: string): boolean {
  if (!url) return false;
  
  const entry = imageCache.get(url);
  if (!entry) return false;
  
  // Verificar se o cache expirou
  const now = Date.now();
  if (now - entry.timestamp > CACHE_EXPIRATION) {
    imageCache.delete(url);
    return false;
  }
  
  return entry.loaded && !entry.error;
}

/**
 * Pré-carrega uma imagem e armazena no cache
 * @param url URL da imagem a ser pré-carregada
 * @returns Promise que resolve para a URL da imagem quando carregada
 */
export function preloadImage(url: string): Promise<string> {
  if (!url) return Promise.reject(new Error('URL de imagem inválida'));
  
  // Se já estiver no cache, retorna imediatamente
  if (isImageCached(url)) {
    return Promise.resolve(url);
  }
  
  // Criar nova entrada no cache
  const cacheEntry: ImageCacheEntry = {
    url,
    loaded: false,
    error: false,
    timestamp: Date.now()
  };
  
  imageCache.set(url, cacheEntry);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    cacheEntry.element = img;
    
    img.onload = () => {
      cacheEntry.loaded = true;
      cacheEntry.error = false;
      cacheEntry.timestamp = Date.now();
      // Remover referência ao elemento para permitir garbage collection
      cacheEntry.element = undefined;
      resolve(url);
    };
    
    img.onerror = () => {
      cacheEntry.loaded = false;
      cacheEntry.error = true;
      cacheEntry.timestamp = Date.now();
      // Remover referência ao elemento para permitir garbage collection
      cacheEntry.element = undefined;
      reject(new Error(`Falha ao carregar imagem: ${url}`));
    };
    
    img.src = url;
  });
}

/**
 * Limpa entradas expiradas do cache
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  
  imageCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_EXPIRATION) {
      imageCache.delete(key);
    }
  });
}

/**
 * Obtém uma URL de imagem do cache ou inicia o carregamento
 * @param url URL da imagem
 * @param fallbackUrl URL de fallback caso a imagem original falhe
 * @returns URL da imagem (original ou fallback)
 */
export function getCachedImageUrl(url: string, fallbackUrl?: string): string {
  if (!url) return fallbackUrl || '';
  
  // Verificar se está no cache
  if (isImageCached(url)) {
    return url;
  }
  
  // Iniciar carregamento em background se não estiver no cache
  preloadImage(url).catch(() => {
    console.warn(`Erro ao carregar imagem: ${url}`);
  });
  
  // Retornar a URL original enquanto carrega
  return url;
}

// Limpar cache expirado a cada hora
setInterval(cleanExpiredCache, 60 * 60 * 1000);
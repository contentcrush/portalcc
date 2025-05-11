import { useState, useEffect } from 'react';
import { preloadImage, isImageCached } from '@/lib/image-cache';

interface PreloadOptions {
  sequential?: boolean;   // Carregar imagens sequencialmente ou em paralelo
  batchSize?: number;     // Número máximo de imagens a carregar simultaneamente
  delay?: number;         // Delay entre cada lote ao carregar sequencialmente
  priority?: string[];    // Lista de URLs para carregar primeiro
  onProgress?: (loaded: number, total: number) => void; // Callback de progresso
}

/**
 * Hook para pré-carregar uma lista de imagens
 * 
 * @param urls Lista de URLs de imagens para pré-carregar
 * @param options Opções de pré-carregamento
 */
export function usePreloadImages(urls: string[], options: PreloadOptions = {}) {
  const {
    sequential = false,
    batchSize = 5,
    delay = 100,
    priority = [],
    onProgress
  } = options;
  
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  useEffect(() => {
    // Se não houver URLs, não fazer nada
    if (!urls.length) {
      setIsComplete(true);
      setProgress(100);
      return;
    }
    
    // Remover duplicatas e URLs vazias
    const uniqueUrls = Array.from(new Set(urls.filter(url => url)));
    
    // Organizar URLs por prioridade
    const prioritySet = new Set<string>(priority);
    const sortedUrls = [...uniqueUrls].sort((a, b) => {
      const aIsPriority = priority.includes(a);
      const bIsPriority = priority.includes(b);
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });
    
    // Filtrar URLs já em cache
    const urlsToLoad = sortedUrls.filter(url => !isImageCached(url));
    
    if (!urlsToLoad.length) {
      setIsComplete(true);
      setProgress(100);
      return;
    }
    
    // Contador e estado de carregamento
    let loadedCount = 0;
    const totalToLoad = urlsToLoad.length;
    const newErrors: string[] = [];
    
    setIsLoading(true);
    
    // Função para atualizar o progresso
    const updateProgress = () => {
      const percentage = Math.round((loadedCount / totalToLoad) * 100);
      setProgress(percentage);
      onProgress?.(loadedCount, totalToLoad);
      
      if (loadedCount === totalToLoad) {
        setIsComplete(true);
        setIsLoading(false);
        setErrors(newErrors);
      }
    };
    
    // Função para carregar uma única imagem
    const loadImage = (url: string): Promise<void> => {
      return preloadImage(url)
        .then(() => {
          loadedCount++;
          updateProgress();
        })
        .catch(error => {
          loadedCount++;
          newErrors.push(url);
          updateProgress();
        });
    };
    
    if (sequential) {
      // Carregamento sequencial em lotes
      let currentBatch = 0;
      
      const loadNextBatch = () => {
        const startIdx = currentBatch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, urlsToLoad.length);
        const batch = urlsToLoad.slice(startIdx, endIdx);
        
        if (batch.length === 0) {
          return;
        }
        
        // Carregar lote atual
        Promise.all(batch.map(url => loadImage(url)))
          .then(() => {
            currentBatch++;
            
            // Se ainda houver imagens para carregar, agendar próximo lote
            if (currentBatch * batchSize < urlsToLoad.length) {
              setTimeout(loadNextBatch, delay);
            }
          });
      };
      
      // Iniciar carregamento do primeiro lote
      loadNextBatch();
    } else {
      // Carregamento em paralelo limitado por lotes
      const chunks: string[][] = [];
      
      // Dividir em lotes
      for (let i = 0; i < urlsToLoad.length; i += batchSize) {
        chunks.push(urlsToLoad.slice(i, i + batchSize));
      }
      
      // Carregar lotes em sequência
      let chunkIndex = 0;
      
      const loadNextChunk = () => {
        if (chunkIndex >= chunks.length) return;
        
        const chunk = chunks[chunkIndex];
        chunkIndex++;
        
        Promise.all(chunk.map(url => loadImage(url)))
          .then(() => {
            // Agendar próximo lote
            if (chunkIndex < chunks.length) {
              setTimeout(loadNextChunk, delay);
            }
          });
      };
      
      // Iniciar carregamento
      loadNextChunk();
    }
    
    return () => {
      // Cleanup - nada a fazer aqui pois o cache permanece
    };
  }, [urls.join(','), sequential, batchSize, delay, priority, onProgress]);
  
  return { progress, isLoading, isComplete, errors };
}

/**
 * Versão simplificada para pré-carregar uma única imagem
 */
export function usePreloadImage(url: string) {
  const [isLoaded, setIsLoaded] = useState(isImageCached(url));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!url || isImageCached(url)) {
      setIsLoaded(true);
      return;
    }
    
    setIsLoading(true);
    
    preloadImage(url)
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
        setError(null);
      })
      .catch(err => {
        setIsLoaded(false);
        setIsLoading(false);
        setError(err);
      });
  }, [url]);
  
  return { isLoaded, isLoading, error };
}
import React, { useEffect, useState } from 'react';
import { usePreloadImages } from '@/hooks/use-preload-images';
import { Progress } from '@/components/ui/progress';

interface Client {
  id: number;
  name: string;
  logo?: string | null;
}

interface ClientListPreloaderProps {
  clients: Client[];
  children: React.ReactNode;
  showProgress?: boolean;
  batchSize?: number;
  minDelay?: number;
}

/**
 * Componente para pré-carregar logos de clientes em listas
 * 
 * Este componente intercepta a renderização da lista de clientes
 * para garantir que as imagens sejam pré-carregadas antes de mostrar
 * o conteúdo, evitando flickering durante a navegação e scroll.
 */
export function ClientListPreloader({
  clients,
  children,
  showProgress = true,
  batchSize = 5,
  minDelay = 300, // Delay mínimo para evitar flashes muito rápidos
}: ClientListPreloaderProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [startTime] = useState(Date.now());
  
  // Extrair URLs dos logos
  const imageUrls = clients
    .map(client => client.logo)
    .filter((url): url is string => !!url);
  
  // Usar o hook para pré-carregar
  const { progress, isComplete } = usePreloadImages(imageUrls, {
    batchSize,
    sequential: false
  });
  
  // Controlar renderização com base no carregamento e tempo mínimo
  useEffect(() => {
    if (isComplete) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed < minDelay) {
        // Se terminou muito rápido, esperar um pouco para evitar flashes
        const remainingDelay = minDelay - elapsed;
        const timer = setTimeout(() => {
          setShouldRender(true);
        }, remainingDelay);
        
        return () => clearTimeout(timer);
      } else {
        // Se já passou o tempo mínimo, mostrar imediatamente
        setShouldRender(true);
      }
    }
  }, [isComplete, startTime, minDelay]);
  
  // Se não há imagens para carregar, renderizar diretamente
  if (imageUrls.length === 0) {
    return <>{children}</>;
  }
  
  return (
    <>
      {shouldRender ? (
        // Conteúdo principal quando carregado
        <>{children}</>
      ) : (
        // Indicador de carregamento
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          {showProgress && (
            <>
              <Progress value={progress} className="w-full max-w-md" />
              <p className="text-sm text-muted-foreground">
                Carregando informações... {progress}%
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
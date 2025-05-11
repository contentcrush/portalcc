import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { preloadImage, isImageCached, getCachedImageUrl } from '@/lib/image-cache';
import { Loader2 } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholderColor?: string;
  className?: string;
  imageClassName?: string;
  loadingClassName?: string;
  containerClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente para carregamento lazy de imagens com cache
 * 
 * Características:
 * - Carrega imagens sob demanda quando entram na viewport
 * - Utiliza cache para evitar recarregar imagens já vistas
 * - Suporte a fallback caso a imagem principal falhe
 * - Mostra um loader enquanto a imagem carrega
 */
export function LazyImage({
  src,
  alt,
  fallbackSrc,
  placeholderColor = '#f0f0f0',
  className,
  imageClassName,
  loadingClassName,
  containerClassName,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  // Estado para controlar se a imagem está carregada
  const [loaded, setLoaded] = useState(isImageCached(src));
  
  // Estado para controlar se houve erro no carregamento
  const [error, setError] = useState(false);
  
  // Referência para o container da imagem (para intersection observer)
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estado para controlar se o elemento está visível
  const [isVisible, setIsVisible] = useState(false);
  
  // URL atual da imagem (considerando fallback)
  const [currentSrc, setCurrentSrc] = useState<string | null>(
    loaded ? src : null
  );

  // Configurar intersection observer para verificar quando a imagem entra na viewport
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        // Uma vez que é visível, podemos parar de observar
        observer.disconnect();
      }
    }, {
      rootMargin: '200px' // Carregar um pouco antes de entrar na viewport
    });
    
    observer.observe(containerRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);

  // Carregar a imagem quando for visível ou se já estiver em cache
  useEffect(() => {
    // Se já estiver carregada ou não for visível, não faz nada
    if (loaded || (!isVisible && !isImageCached(src))) return;
    
    // Se já estiver no cache, definir como carregada
    if (isImageCached(src)) {
      setLoaded(true);
      setCurrentSrc(src);
      onLoad?.();
      return;
    }
    
    // Carregar a imagem
    preloadImage(src)
      .then(() => {
        setLoaded(true);
        setError(false);
        setCurrentSrc(src);
        onLoad?.();
      })
      .catch(() => {
        setError(true);
        setLoaded(true); // Marcar como carregada mesmo sendo o fallback
        
        if (fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        } else {
          setCurrentSrc(null);
        }
        
        onError?.();
      });
  }, [src, fallbackSrc, isVisible, loaded, onLoad, onError]);

  // Atualizar se a fonte mudar
  useEffect(() => {
    if (isImageCached(src)) {
      setLoaded(true);
      setError(false);
      setCurrentSrc(src);
    } else if (loaded) {
      // Reiniciar carregamento se a fonte for alterada e a imagem anterior já estiver carregada
      setLoaded(false);
      setCurrentSrc(null);
    }
  }, [src]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", containerClassName)}
      style={{ backgroundColor: placeholderColor }}
    >
      {/* Loader ou placeholder enquanto carrega */}
      {!loaded && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted/20",
          loadingClassName
        )}>
          <Loader2 className="h-6 w-6 animate-spin opacity-70" />
        </div>
      )}
      
      {/* A imagem em si, com opacidade de transição */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            !loaded && "opacity-0",
            loaded && "opacity-100",
            imageClassName,
            className
          )}
          {...props}
        />
      )}
      
      {/* Placeholder vazio quando houver erro e não tiver fallback */}
      {error && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
          <span>{alt || 'Imagem indisponível'}</span>
        </div>
      )}
    </div>
  );
}

// Versão com tamanho fixo para avatares
export function LazyAvatar({
  src,
  alt,
  fallbackSrc,
  className,
  size = 40,
  ...props
}: LazyImageProps & { size?: number }) {
  return (
    <LazyImage
      src={src}
      alt={alt}
      fallbackSrc={fallbackSrc}
      className={cn("rounded-full", className)}
      containerClassName={cn("rounded-full overflow-hidden")}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}
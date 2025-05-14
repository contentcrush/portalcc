import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LazyImage } from './lazy-image';
import { preloadImage, isImageCached } from '@/lib/image-cache';

// Definir fallbacks padrão baseados em iniciais para clientes sem logo
function generateInitialsAvatar(name: string, size = 40): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  if (!context) return '';
  
  // Definir cor de fundo aleatória mas consistente
  const colors = [
    '#4F46E5', // indigo
    '#0EA5E9', // sky
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EC4899', // pink
    '#8B5CF6', // violet
    '#6366F1', // indigo
    '#14B8A6', // teal
  ];
  
  // Usar o nome para selecionar a cor de forma consistente
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];
  
  // Desenhar o círculo de fundo
  context.fillStyle = bgColor;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  
  // Extrair iniciais (até 2 caracteres)
  const initials = name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  // Desenhar texto
  context.fillStyle = '#FFFFFF';
  context.font = `bold ${size * 0.4}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(initials, size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
}

interface ClientAvatarProps {
  client: {
    id: number;
    name: string;
    logo?: string | null;
  };
  size?: number;
  className?: string;
  containerClassName?: string;
  preload?: boolean;
}

/**
 * Componente para exibir avatar/logo do cliente com lazy loading e cache
 */
export function ClientAvatar({ 
  client, 
  size = 40, 
  className,
  containerClassName,
  preload = false
}: ClientAvatarProps) {
  const [fallbackSrc, setFallbackSrc] = useState<string>('');
  const logoUrl = client.logo || '';
  
  // Gerar avatar de iniciais como fallback
  useEffect(() => {
    if (!client.name) return;
    
    // Gerar avatar de iniciais uma única vez e armazenar
    setFallbackSrc(generateInitialsAvatar(client.name, size));
    
    // Se preload estiver ativado, pré-carregar o logo
    if (preload && logoUrl && !isImageCached(logoUrl)) {
      preloadImage(logoUrl).catch(() => {
        // Falha silenciosa - sem logs para melhorar performance
      });
    }
  }, [client.name, size, logoUrl, preload]);
  
  // Removido log de debug que estava impactando a performance

  return (
    <LazyImage
      src={logoUrl}
      alt={`Logo ${client.name}`}
      fallbackSrc={fallbackSrc}
      className={className}
      containerClassName={cn("rounded-full", containerClassName)}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      placeholderColor="transparent"
    />
  );
}
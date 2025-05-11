import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LazyImage } from './lazy-image';
import { preloadImage, isImageCached } from '@/lib/image-cache';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Definir fallbacks padrão baseados em iniciais para usuários sem avatar
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

interface UserAvatarProps {
  user: {
    id: number;
    name: string;
    avatar?: string | null;
  };
  size?: number;
  className?: string;
  containerClassName?: string;
  preload?: boolean;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  statusClassName?: string;
}

/**
 * Componente para exibir avatar de usuário com lazy loading e cache
 */
export function UserAvatar({ 
  user, 
  size = 40, 
  className,
  containerClassName,
  preload = false,
  showStatus = false,
  status = 'offline',
  statusClassName
}: UserAvatarProps) {
  const [fallbackSrc, setFallbackSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const avatarUrl = user.avatar || '';
  
  // Definir classes para o indicador de status
  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500'
  };
  
  // Gerar avatar de iniciais como fallback
  useEffect(() => {
    if (!user.name) return;
    
    // Gerar avatar de iniciais uma única vez e armazenar
    setFallbackSrc(generateInitialsAvatar(user.name, size));
    
    // Se preload estiver ativado, pré-carregar o avatar
    if (preload && avatarUrl && !isImageCached(avatarUrl)) {
      preloadImage(avatarUrl)
        .then(() => {
          setIsLoaded(true);
          setIsError(false);
          console.log(`Avatar avatar-${user.id.toString(36)} (${user.name}): Imagem carregada com sucesso`);
        })
        .catch(() => {
          setIsLoaded(false);
          setIsError(true);
          console.log(`Avatar avatar-${user.id.toString(36)} (${user.name}): Erro ao carregar imagem`);
        });
    }
  }, [user.name, user.id, size, avatarUrl, preload]);
  
  // Adicionar debug para verificar avatares válidos
  useEffect(() => {
    if (avatarUrl) {
      console.log(`Avatar avatar-${user.id.toString(36)} (${user.name}): Validando logo...`);
      console.log(`Avatar avatar-${user.id.toString(36)} (${user.name}): URL válida, definindo como fonte`);
    }
  }, [avatarUrl, user.name, user.id]);

  // Se estamos usando o shadcn/ui Avatar component (preferido)
  return (
    <div className={cn("relative inline-block", containerClassName)} style={{ width: size, height: size }}>
      <Avatar className={cn("h-full w-full", className)}>
        <AvatarImage 
          src={avatarUrl} 
          alt={user.name}
          onLoad={() => {
            setIsLoaded(true);
            setIsError(false);
            console.log(`Avatar avatar-${user.id.toString(36)} (${user.name}): Imagem carregada com sucesso`);
          }}
          onError={() => {
            setIsLoaded(false);
            setIsError(true);
            console.log(`Avatar avatar-${user.id.toString(36)} (${user.name}): Erro ao carregar imagem`);
          }}
        />
        <AvatarFallback>{user.name.split(' ').map(part => part.charAt(0)).join('').substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      
      {/* Indicador de status */}
      {showStatus && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white",
            statusClasses[status],
            statusClassName
          )}
          style={{ 
            width: Math.max(8, size / 4), 
            height: Math.max(8, size / 4) 
          }}
        />
      )}
    </div>
  );
}
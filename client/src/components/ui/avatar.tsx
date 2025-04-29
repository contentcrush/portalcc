"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, alt, ...props }, ref) => {
  // ID para diagnósticos
  const [avatarId] = React.useState(`avatar-${Math.random().toString(36).substring(2, 9)}`);
  
  // Verificar se temos um src válido antes de tentar renderizar
  const [validSrc, setValidSrc] = React.useState<string | undefined>(
    typeof src === 'string' && src.trim().length > 0 ? src.trim() : undefined
  );
  
  // Validar o src quando ele mudar
  React.useEffect(() => {
    if (typeof src === 'string' && src.trim().length > 0) {
      console.log(`Avatar ${avatarId} (${alt || 'sem nome'}): Validando logo...`);
      
      // Sanitize src, garantindo que temos uma string válida sem espaços extras
      const sanitizedSrc = src.trim();
      
      // Apenas aceitar URLs que começam com http://, https:// ou data:image/
      if (sanitizedSrc.startsWith('http://') || 
          sanitizedSrc.startsWith('https://') || 
          sanitizedSrc.startsWith('data:image/')) {
        console.log(`Avatar ${avatarId} (${alt || 'sem nome'}): URL válida, definindo como fonte`);
        setValidSrc(sanitizedSrc);
      } else {
        console.warn(`Avatar ${avatarId} (${alt || 'sem nome'}): URL de imagem inválida:`, 
          sanitizedSrc.length > 50 ? sanitizedSrc.substring(0, 50) + '...' : sanitizedSrc);
        setValidSrc(undefined);
      }
    } else {
      console.log(`Avatar ${avatarId} (${alt || 'sem nome'}): Sem fonte de imagem fornecida`);
      setValidSrc(undefined);
    }
  }, [src, avatarId, alt]);
  
  // Adicione um manipulador de erro padrão se não for fornecido
  const defaultOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn(`Avatar ${avatarId} (${alt || 'sem nome'}): Erro ao carregar imagem:`, 
      validSrc ? (validSrc.length > 50 ? validSrc.substring(0, 50) + '...' : validSrc) : 'src vazio');
    
    // Esconder a imagem com erro, o que mostrará o fallback automaticamente
    e.currentTarget.style.display = 'none';
  };

  // Se não temos um src válido, nem renderize o componente de imagem
  if (!validSrc) {
    console.log(`Avatar ${avatarId} (${alt || 'sem nome'}): Nenhuma fonte válida, não renderizando imagem`);
    return null;
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={validSrc}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      onError={props.onError || defaultOnError}
      onLoad={() => console.log(`Avatar ${avatarId} (${alt || 'sem nome'}): Imagem carregada com sucesso`)}
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

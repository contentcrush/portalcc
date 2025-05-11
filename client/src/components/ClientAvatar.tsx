import { useEffect, useState } from "react";
import { getInitials, generateAvatarColor, cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { preloadImage, isImageCached, getCachedImageUrl } from "@/lib/image-cache";
import { LazyImage } from "@/components/ui/lazy-image";

interface ClientAvatarProps {
  name?: string;
  logoUrl?: string | null | undefined;
  client_id?: number;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  preload?: boolean;
}

// Tamanhos pré-definidos em pixels
const SIZE_MAP = {
  xs: 20,
  sm: 24,
  md: 40,
  lg: 64,
};

// Tamanhos pré-definidos em classes CSS
const SIZE_CLASSES = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

/**
 * Componente otimizado para exibir avatares de clientes
 * Utiliza cache de imagens e lazy loading para melhorar performance
 */
export function ClientAvatar({ 
  name, 
  logoUrl, 
  client_id, 
  className = "", 
  size = "md",
  preload = false 
}: ClientAvatarProps) {
  const [validLogo, setValidLogo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [clientName, setClientName] = useState<string>(name || "");
  const [fallbackSrc, setFallbackSrc] = useState<string>('');
  
  // Buscar dados do cliente se um ID for fornecido
  const { data: clientData } = useQuery({
    queryKey: client_id ? [`/api/clients/${client_id}`] : ['no-client'],
    enabled: !!client_id
  });
  
  // Atualizar dados do cliente quando estiverem disponíveis
  useEffect(() => {
    if (clientData && typeof clientData === 'object') {
      // Verificar se os campos necessários existem antes de acessá-los
      const name = 'name' in clientData ? clientData.name as string : '';
      const shortName = 'shortName' in clientData ? clientData.shortName as string : '';
      setClientName(name || shortName || "");
      
      if ('logo' in clientData && clientData.logo) {
        validateLogo(clientData.logo as string, name);
      }
    }
  }, [clientData]);
  
  // Gerar imagem de fallback com as iniciais
  useEffect(() => {
    if (!clientName) return;
    
    // Gerar avatar de iniciais
    setFallbackSrc(generateInitialsAvatar(clientName, SIZE_MAP[size]));
  }, [clientName, size]);
  
  // Função para validar logo
  const validateLogo = (logo: string | null | undefined, clientName: string) => {
    setError(false);
    
    if (!logo || typeof logo !== 'string' || !logo.trim()) {
      // Reduza o log excessivo
      if (clientName) {
        console.debug(`ClientAvatar: Sem logo definido para "${clientName}"`);
      }
      setValidLogo(null);
      return;
    }
    
    const trimmedLogo = logo.trim();
    
    if (trimmedLogo.startsWith('data:image/') || 
        trimmedLogo.startsWith('http://') || 
        trimmedLogo.startsWith('https://')) {
      // Reduza o log excessivo
      if (clientName) {
        console.debug(`ClientAvatar: Logo válido encontrado para "${clientName}"`);
      }
      setValidLogo(trimmedLogo);
      
      // Pré-carregar a imagem se solicitado
      if (preload && !isImageCached(trimmedLogo)) {
        preloadImage(trimmedLogo).catch(() => {
          setError(true);
        });
      }
    } else {
      console.warn(`ClientAvatar: Formato de URL de logo inválido para "${clientName || 'cliente desconhecido'}"`);
      setValidLogo(null);
    }
  };
  
  // Validar logo quando for fornecido diretamente
  useEffect(() => {
    if (logoUrl && name) {
      validateLogo(logoUrl, name);
    }
  }, [logoUrl, name]);
  
  // Iniciais do cliente (fallback)
  const initials = getInitials(clientName || "");
  
  // Cor de fundo do avatar baseada no nome
  const backgroundColor = generateAvatarColor(clientName || "");

  // Calcular o tamanho numérico para o avatar
  const avatarSize = SIZE_MAP[size];

  return (
    <Avatar className={cn(SIZE_CLASSES[size], className, "border border-gray-200")}>
      {!error && validLogo ? (
        // Usar o LazyImage para melhor integração com o cache e lazy loading
        <LazyImage 
          src={validLogo} 
          alt={`Logo de ${clientName}`}
          className="h-full w-full object-cover"
          imageClassName="rounded-full"
          containerClassName="rounded-full"
          onError={() => {
            console.error(`ClientAvatar: Erro ao carregar logo para "${clientName}"`);
            setError(true);
          }}
          placeholderColor={backgroundColor}
          fallbackSrc={fallbackSrc}
        />
      ) : (
        <AvatarFallback 
          style={{ 
            backgroundColor, 
            color: 'white',
            fontSize: size === "xs" || size === "sm" ? "0.625rem" : undefined
          }}
        >
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

/**
 * Gera uma imagem de avatar baseada nas iniciais 
 */
function generateInitialsAvatar(name: string, size = 40): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  if (!context) return '';
  
  // Usar a mesma função que já temos para gerar a cor
  const backgroundColor = generateAvatarColor(name);
  
  // Desenhar o círculo de fundo
  context.fillStyle = backgroundColor;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  context.fill();
  
  // Extrair iniciais (usando função existente)
  const initials = getInitials(name);
  
  // Desenhar texto
  context.fillStyle = '#FFFFFF';
  context.font = `bold ${size * 0.4}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(initials, size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
}
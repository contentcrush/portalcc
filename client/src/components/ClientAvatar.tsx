import { useEffect, useState } from "react";
import { getInitials, generateAvatarColor } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";

interface ClientAvatarProps {
  name?: string;
  logoUrl?: string | null | undefined;
  client_id?: number;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function ClientAvatar({ name, logoUrl, client_id, className = "", size = "md" }: ClientAvatarProps) {
  const [validLogo, setValidLogo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [clientName, setClientName] = useState<string>(name || "");
  
  // Buscar dados do cliente se um ID for fornecido
  const { data: clientData } = useQuery({
    queryKey: client_id ? [`/api/clients/${client_id}`] : null,
    enabled: !!client_id
  });
  
  // Atualizar dados do cliente quando estiverem disponíveis
  useEffect(() => {
    if (clientData) {
      setClientName(clientData.name || clientData.shortName || "");
      
      if (clientData.logo) {
        validateLogo(clientData.logo, clientData.name);
      }
    }
  }, [clientData]);
  
  // Tamanhos pré-definidos
  const sizeClasses = {
    xs: "h-5 w-5",
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };
  
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

  return (
    <Avatar className={`${sizeClasses[size]} ${className} border border-gray-200`}>
      {!error && validLogo ? (
        <>
          <img 
            key={`logo-${clientName}-${Math.random()}`}
            src={validLogo} 
            alt={`Logo de ${clientName}`}
            className="h-full w-full object-cover relative z-10"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onError={(e) => {
              console.error(`ClientAvatar: Erro ao carregar logo para "${clientName}"`, e);
              setError(true);
            }}
          />
        </>
      ) : null}
      <AvatarFallback 
        style={{ 
          backgroundColor, 
          color: 'white',
          position: !error && validLogo ? 'relative' : 'static',
          zIndex: !error && validLogo ? 5 : 10,
          fontSize: size === "xs" || size === "sm" ? "0.625rem" : undefined
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
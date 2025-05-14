import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Building, User as UserIcon } from "lucide-react";

// Interface genérica para qualquer tipo de usuário que tenha ao menos id, name e avatar
export interface UserLike {
  id: number;
  name: string;
  avatar?: string | null;
  avatar_url?: string | null;
  user_type?: string;
}

interface UserAvatarProps {
  user: User | UserLike | null;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function getAvatarFallbackColor(name: string): string {
  // Cores da nossa paleta para fallback (ajustar conforme paleta real do projeto)
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-red-500",
    "bg-indigo-500",
  ];
  
  // Gerar um índice baseado no nome
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({ user, className = "" }: UserAvatarProps) {
  // Se o usuário for nulo, mostrar um avatar padrão
  if (!user) {
    return (
      <Avatar className={className}>
        <AvatarFallback className="bg-muted text-muted-foreground">
          <UserIcon className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }
  
  const fallbackClass = getAvatarFallbackColor(user.name || "User");
  
  // Verificar qual campo de avatar utilizar, com fallback seguro
  const avatarSrc = 
    (('avatar_url' in user) ? user.avatar_url : null) || 
    user.avatar || 
    "";
    
  // Verificar tipo de usuário com segurança
  const isPJ = ('user_type' in user) && user.user_type === 'pj';
  
  return (
    <Avatar className={className}>
      <AvatarImage src={avatarSrc} alt={user.name || "User"} />
      <AvatarFallback className={fallbackClass + " text-white"}>
        {isPJ ? (
          <Building className="h-5 w-5" />
        ) : (
          getInitials(user.name || "User")
        )}
      </AvatarFallback>
    </Avatar>
  );
}

// Exportação padrão para compatibilidade com importações existentes
export default UserAvatar;
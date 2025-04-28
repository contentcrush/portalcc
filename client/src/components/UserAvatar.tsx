import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Building, User as UserIcon } from "lucide-react";

interface UserAvatarProps {
  user: User | null;
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
  
  return (
    <Avatar className={className}>
      <AvatarImage src={user.avatar_url || user.avatar || ""} alt={user.name || "User"} />
      <AvatarFallback className={fallbackClass + " text-white"}>
        {user.user_type === 'pj' ? (
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
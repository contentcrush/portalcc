import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "@/lib/constants";
import { LucideIcon, LucideProps, LogOut } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@/assets/CNTN_CRUSH_no_bg.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import PriorityBadge from "@/components/PriorityBadge";

// Get icons from Lucide dynamically
const DynamicIcon = ({ name }: { name: string }) => {
  // Mapa de conversão para nomes de ícones específicos
  const iconNameMap: Record<string, string> = {
    // Ícones básicos que sabemos que existem na biblioteca Lucide
    "home": "Home",
    "folder": "Folder",
    "folder-open": "FolderOpen",
    "list": "List",
    "list-checks": "ListChecks",
    "users": "Users",
    "users-2": "Users2",
    "user-circle-2": "UserCircle2",
    "dollar-sign": "DollarSign",
    "calendar": "Calendar",
    "video": "Video",
    "settings": "Settings",
    "gauge": "Gauge",
    "chart": "BarChart",
    "clapperboard": "Clapperboard",
    "file": "File"
  };

  // Usar o nome mapeado se existir, caso contrário, converter com a primeira letra maiúscula
  const iconName = iconNameMap[name] || (name.charAt(0).toUpperCase() + name.slice(1));
  
  // Type assertion - we know these icons exist in Lucide
  const IconComponent = (LucideIcons as any)[iconName];
  
  // Se não encontrou o componente, mostrar qual ícone está faltando para depuração
  if (!IconComponent) {
    console.warn(`Ícone não encontrado: ${name} (como ${iconName})`);
    // Fallback para o ícone File se não encontrar o componente
    return <LucideIcons.File />;
  }
  
  // Aplicar estilo padrão para todos os ícones: stroke mais fino, tamanho uniforme
  return <IconComponent className="w-5 h-5" strokeWidth={1.5} />;
};

interface SidebarProps {
  onNavigate: (path: string) => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [location] = useLocation();



  const getStatusColor = (status: string) => {
    switch(status) {
      case 'em_andamento': return 'bg-green-500';
      case 'em_producao': return 'bg-yellow-500';
      case 'pre_producao': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const { user, logoutMutation } = useAuth();



  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutMutation.mutate();
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-4 flex items-center border-b border-gray-200">
        <img 
          src={logoImage} 
          alt="Content Crush Logo" 
          className="h-8 mr-2 object-contain" 
        />
        <span className="font-semibold text-gray-800">Content Crush</span>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3">
          {/* Navigation items */}
          {SIDEBAR_ITEMS.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.path);
              }}
              className={cn(
                "sidebar-item",
                location === item.path
                  ? "active"
                  : ""
              )}
            >
              <DynamicIcon name={item.icon} />
              <span>{item.name}</span>
            </a>
          ))}
        </div>

      </nav>
      
      {/* Footer com menu dropdown */}
      <div className="px-4 py-3 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full focus:outline-none" asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-100 transition-colors text-left">
              <UserAvatar 
                user={user} 
                className="h-8 w-8 shrink-0 border-2 border-gray-100" 
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user?.name || "Usuário"}</p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role === "admin" ? "Administrador" : user?.position || "Usuário"}
                </p>
              </div>
              <LucideIcons.ChevronDown className="h-4 w-4 text-gray-400 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onNavigate("/settings")}>
              <LucideIcons.Settings className="mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate("/settings?tab=notifications")}>
              <LucideIcons.Bell className="mr-2" />
              Notificações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-500 focus:text-red-500 hover:text-red-600"
            >
              <LogOut className="mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

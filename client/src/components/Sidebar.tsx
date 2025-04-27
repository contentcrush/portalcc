import { useMemo } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { LucideIcon, LucideProps } from "lucide-react";
import * as LucideIcons from "lucide-react";

// Get icons from Lucide dynamically
const DynamicIcon = ({ name }: { name: string }) => {
  // Mapa de conversão para nomes de ícones específicos
  const iconNameMap: Record<string, string> = {
    "layout-dashboard": "LayoutDashboard",
    "folder": "Folder",
    "list-todo": "ListTodo",
    "list-checks": "ListChecks",
    "clipboard-list": "ClipboardList",
    "check-square": "CheckSquare",
    "users": "Users",
    "wallet": "Wallet",
    "credit-card": "CreditCard",
    "landmark": "Landmark",
    "calendar": "Calendar",
    "video": "Video",
    "settings": "Settings"
  };

  // Usar o nome mapeado se existir, caso contrário, converter com a primeira letra maiúscula
  const iconName = iconNameMap[name] || (name.charAt(0).toUpperCase() + name.slice(1));
  
  // Type assertion - we know these icons exist in Lucide
  const IconComponent = (LucideIcons as any)[iconName];
  
  // Se não encontrou o componente, mostrar qual ícone está faltando para depuração
  if (!IconComponent) {
    console.warn(`Ícone não encontrado: ${name} (como ${iconName})`);
    return null;
  }
  
  return <IconComponent className="h-5 w-5" />;
};

interface SidebarProps {
  onNavigate: (path: string) => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [location] = useLocation();

  // Define a simple Project type
  interface Project {
    id: number;
    name: string;
    status: string;
  }

  // Fetch projects for the recent projects section
  const { data: projects } = useQuery<any, Error, Project[]>({
    queryKey: ['/api/projects'],
    select: (data) => data.slice(0, 3) // Show only the first 3 projects
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'em_andamento': return 'bg-green-500';
      case 'em_producao': return 'bg-yellow-500';
      case 'pre_producao': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-4 flex items-center border-b border-gray-200">
        <div className="bg-indigo-600 text-white p-2 rounded-md mr-3">
          <DynamicIcon name="video" />
        </div>
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
              <span className="ml-3">{item.name}</span>
            </a>
          ))}
        </div>
        
        <div className="mt-8 px-3">
          <p className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            PROJETOS RECENTES
          </p>
          <div className="space-y-1">
            {projects?.map((project) => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/projects/${project.id}`);
                }}
                className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
              >
                <span className={cn("status-badge", getStatusColor(project.status))}></span>
                <span className="truncate">{project.name}</span>
              </a>
            ))}
            
            {!projects && (
              <div className="px-3 py-2 text-gray-500 text-sm">
                Carregando projetos...
              </div>
            )}
            
            {projects?.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-sm">
                Nenhum projeto recente.
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <a
          href="/settings"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/settings");
          }}
          className="sidebar-item"
        >
          <DynamicIcon name="settings" />
          <span className="ml-3">Configurações</span>
        </a>
      </div>
    </aside>
  );
}

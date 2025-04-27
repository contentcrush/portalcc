import { useMemo } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

// Get icons from Lucide dynamically
const DynamicIcon = ({ name }: { name: string }) => {
  const Icon = (LucideIcons as Record<string, LucideIcon>)[
    name.charAt(0).toUpperCase() + name.slice(1)
  ];
  return Icon ? <Icon className="h-5 w-5" /> : null;
};

interface SidebarProps {
  onNavigate: (path: string) => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [location] = useLocation();

  // Fetch projects for the recent projects section
  const { data: projects } = useQuery({
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
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center border-b border-sidebar-border">
        <div className="bg-primary text-white p-2 rounded-md mr-3">
          <DynamicIcon name="video" />
        </div>
        <span className="font-semibold text-sidebar-foreground">Content Crush</span>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-2">
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
                "flex items-center px-3 py-2 rounded-md hover:bg-sidebar-accent mb-1 transition-colors",
                location === item.path
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground"
              )}
            >
              <DynamicIcon name={item.icon} />
              <span className="ml-3">{item.name}</span>
            </a>
          ))}
        </div>
        
        <div className="mt-6 px-3">
          <p className="px-3 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
            PROJETOS RECENTES
          </p>
          <div className="mt-2">
            {projects?.map((project) => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/projects/${project.id}`);
                }}
                className="flex items-center px-3 py-2 text-sidebar-foreground text-sm rounded-md hover:bg-sidebar-accent"
              >
                <span className={cn("w-2 h-2 rounded-full mr-3", getStatusColor(project.status))}></span>
                {project.name}
              </a>
            ))}
            
            {!projects && (
              <div className="px-3 py-2 text-sidebar-foreground/60 text-sm">
                Carregando projetos...
              </div>
            )}
            
            {projects?.length === 0 && (
              <div className="px-3 py-2 text-sidebar-foreground/60 text-sm">
                Nenhum projeto recente.
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <a
          href="/settings"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/settings");
          }}
          className="flex items-center px-3 py-2 text-sidebar-foreground rounded-md hover:bg-sidebar-accent"
        >
          <DynamicIcon name="settings" />
          <span className="ml-3">Configurações</span>
        </a>
      </div>
    </aside>
  );
}

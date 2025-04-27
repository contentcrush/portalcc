import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import { Button } from "@/components/ui/button";
import { Bell, Menu, UserCircle, Plus, List, User, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { user, logoutMutation } = useAuth();
  
  // Se estivermos na rota de autenticação ou não houver usuário, renderize apenas o conteúdo sem layout
  const isAuthPage = location === "/auth";
  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Lidar com logout
  const handleLogout = () => {
    logoutMutation.mutate();
    // O redirecionamento será feito automaticamente pelo mutate
  };

  // Close mobile menu when location changes
  const onNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Iniciais para avatar (se não houver foto)
  const getUserInitials = () => {
    if (!user?.name) return "U";
    const parts = user.name.split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - hidden on mobile unless menu is open */}
      <div className={`${isMobile ? (mobileMenuOpen ? 'fixed inset-0 z-50 w-64' : 'hidden') : 'w-64'}`}>
        <Sidebar onNavigate={onNavigate} />
      </div>

      {/* Backdrop for mobile menu */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50" 
          onClick={toggleMobileMenu}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Top navigation bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile menu button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={toggleMobileMenu}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            {/* Search bar */}
            <div className="relative flex-1 max-w-2xl mx-4">
              <SearchBar />
            </div>

            {/* User navigation */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Bell className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      {getUserInitials()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                  <DropdownMenuLabel className="text-xs text-gray-500 font-normal">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content container with quick actions sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {children}
          </div>

          {/* Quick actions sidebar - hidden on mobile */}
          {!isMobile && (
            <div className="w-64 border-l border-gray-200 overflow-y-auto bg-white p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-sm uppercase tracking-wide text-gray-500 mb-3">
                    AÇÕES RÁPIDAS
                  </h3>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        navigate("/projects");
                        // Usando um timeout para garantir que a navegação termine antes de abrir o modal
                        setTimeout(() => {
                          // Disparando um evento customizado para abrir o modal de novo projeto
                          const event = new CustomEvent('openProjectForm');
                          window.dispatchEvent(event);
                        }, 100);
                      }}
                      className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Novo Projeto
                    </Button>
                    <Button 
                      onClick={() => navigate("/tasks/new")}
                      variant="outline"
                      className="w-full justify-start flex items-center"
                    >
                      <List className="mr-2 h-4 w-4" /> Nova Tarefa
                    </Button>
                    <Button 
                      onClick={() => navigate("/clients/new")}
                      variant="outline"
                      className="w-full justify-start flex items-center"
                    >
                      <User className="mr-2 h-4 w-4" /> Novo Cliente
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-sm uppercase tracking-wide text-gray-500 mb-3">
                    CALENDÁRIO
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {/* Mini calendar would go here */}
                    <div className="text-center text-sm">
                      <div className="font-medium">Abril 2025</div>
                      <div className="grid grid-cols-7 gap-1 mt-2 text-xs">
                        <div>D</div>
                        <div>S</div>
                        <div>T</div>
                        <div>Q</div>
                        <div>Q</div>
                        <div>S</div>
                        <div>S</div>
                        {/* Example calendar days */}
                        {Array.from({ length: 30 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center", 
                              i === 11 ? "bg-blue-600 text-white" : ""
                            )}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-sm uppercase tracking-wide text-gray-500 mb-3">
                    EQUIPE
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                        BS
                      </div>
                      <div className="ml-2">
                        <div className="text-sm font-medium">Bruno Silva</div>
                        <div className="text-xs text-green-500">Online</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">
                        AO
                      </div>
                      <div className="ml-2">
                        <div className="text-sm font-medium">Ana Oliveira</div>
                        <div className="text-xs text-green-500">Online</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs">
                        CM
                      </div>
                      <div className="ml-2">
                        <div className="text-sm font-medium">Carlos Mendes</div>
                        <div className="text-xs text-gray-500">Offline</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">
                        JS
                      </div>
                      <div className="ml-2">
                        <div className="text-sm font-medium">Julia Santos</div>
                        <div className="text-xs text-green-500">Online</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import { Button } from "@/components/ui/button";
import { Bell, Menu, UserCircle, Plus, LayoutDashboard, List, User, Wallet, Calendar, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when location changes
  const onNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
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
                    <img 
                      src="https://randomuser.me/api/portraits/men/32.jpg" 
                      alt="Avatar" 
                      className="h-8 w-8 rounded-full border-2 border-white"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Bruno Silva</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    Sair
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
                      onClick={() => navigate("/projects/new")}
                      className="w-full justify-start bg-indigo-600 hover:bg-indigo-700"
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
                              i === 11 ? "bg-indigo-600 text-white" : ""
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
                      <img 
                        src="https://randomuser.me/api/portraits/men/32.jpg" 
                        alt="Bruno Silva" 
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="ml-2">
                        <div className="text-sm font-medium">Bruno Silva</div>
                        <div className="text-xs text-green-500">Online</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <img 
                        src="https://randomuser.me/api/portraits/women/44.jpg" 
                        alt="Ana Oliveira" 
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="ml-2">
                        <div className="text-sm font-medium">Ana Oliveira</div>
                        <div className="text-xs text-green-500">Online</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <img 
                        src="https://randomuser.me/api/portraits/men/67.jpg" 
                        alt="Carlos Mendes" 
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="ml-2">
                        <div className="text-sm font-medium">Carlos Mendes</div>
                        <div className="text-xs text-gray-500">Offline</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <img 
                        src="https://randomuser.me/api/portraits/women/23.jpg" 
                        alt="Julia Santos" 
                        className="h-8 w-8 rounded-full"
                      />
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

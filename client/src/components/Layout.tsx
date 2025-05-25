import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import { ChatWidget } from "./ChatWidget";
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
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { cn } from "@/lib/utils";
import logoImage from "@/assets/CNTN_CRUSH_no_bg.png";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { user, logoutMutation } = useAuth();
  const { openProjectForm } = useProjectForm();
  
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

            {/* Notification button */}
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content container */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {children}
          </div>
        </div>
      </main>
      
      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}

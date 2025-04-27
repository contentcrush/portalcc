import { useState, ReactNode } from "react";
import { useLocation } from "wouter";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import { Button } from "@/components/ui/button";
import { Bell, Menu, UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-mobile";

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
      <div className={`${isMobile ? (mobileMenuOpen ? 'fixed inset-0 z-50 w-64' : 'hidden') : 'w-64'} bg-sidebar border-r border-sidebar-border`}>
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

        {/* Page content */}
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

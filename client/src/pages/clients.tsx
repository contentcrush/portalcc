import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  MapPin,
  Clock,
  FileText,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, getInitials, generateAvatarColor } from "@/lib/utils";
import { CLIENT_TYPE_OPTIONS, CLIENT_CATEGORY_OPTIONS } from "@/lib/constants";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients']
  });

  // Filter clients based on criteria
  const filteredClients = clients?.filter(client => {
    // Search term filter
    if (searchTerm && !client.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Type filter
    if (typeFilter !== "all" && client.type !== typeFilter) {
      return false;
    }
    
    // Category filter
    if (categoryFilter !== "all" && client.category !== categoryFilter) {
      return false;
    }
    
    return true;
  });

  // Sort clients
  const sortedClients = filteredClients?.sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime();
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "category") {
      return (a.category || "").localeCompare(b.category || "");
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Gerenciamento de clientes e relacionamentos</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>
      
      {/* Filter and search */}
      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-lg shadow-sm space-y-4 md:space-y-0">
        <div className="w-full md:w-auto mb-3 md:mb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes"
              className="pl-10 w-full md:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {CLIENT_TYPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CLIENT_CATEGORY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="category">Categoria</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* Empty state */}
      {sortedClients && sortedClients.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Filter className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Tente ajustar os filtros ou adicione um novo cliente.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      )}
      
      {/* Clients grid */}
      {sortedClients && sortedClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedClients.map(client => (
            <Card key={client.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarFallback 
                          style={{ 
                            backgroundColor: generateAvatarColor(client.name),
                            color: 'white'
                          }}
                        >
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/clients/${client.id}`}>
                          <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                            {client.name}
                          </h3>
                        </Link>
                        <div className="flex items-center">
                          {client.category && (
                            <Badge variant="outline" className="mr-2">
                              {client.category}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {client.type || 'Cliente'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Link href={`/clients/${client.id}`}>
                            Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Editar cliente
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          Novo projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Nova interação
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {client.contactName && (
                      <div className="flex items-center text-sm">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {client.contactName}, {client.contactPosition || ''}
                        </span>
                      </div>
                    )}
                    
                    {client.contactEmail && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{client.contactEmail}</span>
                      </div>
                    )}
                    
                    {client.contactPhone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{client.contactPhone}</span>
                      </div>
                    )}
                    
                    {client.address && (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{client.address}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>Cliente desde {formatDate(client.since)}</span>
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                      <span>CNPJ: {client.cnpj || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex border-t border-gray-200 divide-x divide-gray-200">
                  <Link href={`/clients/${client.id}`} className="flex-1">
                    <Button variant="ghost" className="w-full rounded-none py-2">
                      Ver detalhes
                    </Button>
                  </Link>
                  <Button variant="ghost" className="flex-1 rounded-none py-2">
                    Novo projeto
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add new client card */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-primary/40 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 h-full min-h-[280px]">
              <div className="bg-primary/10 rounded-full p-3 mb-3">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Novo Cliente</h3>
              <p className="text-sm text-gray-500 text-center mb-4">Adicione um novo cliente à sua base</p>
              <Button>Adicionar Cliente</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

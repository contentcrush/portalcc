import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClientSheet } from "@/components/ClientSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { insertClientSchema, insertProjectSchema, type InsertClient, type InsertProject, type Client, type Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getInitials, generateAvatarColor, cn, formatDate, formatCurrency, showSuccessToast } from "@/lib/utils";
import { ClientAvatar } from "@/components/ClientAvatar";
import { ClientListPreloader } from "@/components/client-list-preloader";

// Importação dos componentes de UI
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
  X,
  Globe,
  LayoutGrid,
  List,
  CircleDollarSign,
  Folders,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch clients
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    staleTime: 5 * 60 * 1000, // 5 minutos de stale time
    gcTime: 10 * 60 * 1000, // 10 minutos de cache time
    refetchOnWindowFocus: false // Evita refetches constantes ao focar na janela
  });
  
  // Fetch projects (para contagem)
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Function to count projects by client
  const getClientProjectsCount = (clientId: number) => {
    if (!projects || !Array.isArray(projects)) return 0;
    
    try {
      return projects.filter((project) => {
        if (!project || typeof project !== 'object') return false;
        return project.client_id === clientId;
      }).length;
    } catch (err) {
      console.error("Erro ao contar projetos do cliente:", err);
      return 0;
    }
  };
  
  // Function to get total revenue by client
  const getClientRevenue = (clientId: number) => {
    if (!projects || !Array.isArray(projects)) return 0;
    
    try {
      return projects
        .filter((project) => {
          if (!project || typeof project !== 'object') return false;
          return project.client_id === clientId;
        })
        .reduce((total, project) => {
          const budget = typeof project.budget === 'number' ? project.budget : 0;
          return total + budget;
        }, 0);
    } catch (err) {
      console.error("Erro ao calcular receita do cliente:", err);
      return 0;
    }
  };

  // Filter clients based on criteria
  const filteredClients = clients?.filter((client: Client) => {
    // Validação de client para evitar erros
    if (!client || typeof client !== 'object') return false;
    
    // Search term filter
    if (searchTerm && client.name && typeof client.name === 'string' && 
        !client.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Type filter
    if (typeFilter !== "all" && client.type && client.type !== typeFilter) {
      return false;
    }
    
    return true;
  });

  // Sort clients
  const sortedClients = Array.isArray(filteredClients) ? [...filteredClients].sort((a, b) => {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return 0;
    
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "recent":
        const dateA = a.since ? new Date(a.since).getTime() : 0;
        const dateB = b.since ? new Date(b.since).getTime() : 0;
        return dateB - dateA;
      case "projects":
        const countA = getClientProjectsCount(a.id);
        const countB = getClientProjectsCount(b.id);
        return countB - countA;
      default:
        return 0;
    }
  }) : [];

  // Handle client filtering
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  // Handle new client button click
  const handleNewClientClick = () => {
    setIsNewClientDialogOpen(true);
  };

  // Handle view mode toggle
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  // Check if client has active projects
  const isClientActive = (client: Client) => {
    if (!projects || !Array.isArray(projects)) return false;
    
    return projects.some(project => 
      project.client_id === client.id && 
      ['em_andamento', 'proposta_aceita', 'concluido'].includes(project.status || '')
    );
  };

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie sua base de clientes e veja suas interações
          </p>
        </div>
        <Button 
          onClick={handleNewClientClick}
          className="w-full md:w-auto gap-1"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center w-full">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar clientes..."
            className="pl-8"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={handleTypeFilterChange}
            >
              <SelectTrigger className="w-[180px] h-10">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Tipo de cliente" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="empresa">Empresa</SelectItem>
                <SelectItem value="agencia">Agência</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="ong">ONG / Sem fins lucrativos</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[180px] h-10">
                <div className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4" />
                  <SelectValue placeholder="Ordenar por" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="name">Nome A-Z</SelectItem>
                <SelectItem value="projects">Quantidade de projetos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => handleViewModeChange('grid')}
              className="h-10 w-10 rounded-none rounded-l-md"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => handleViewModeChange('list')}
              className="h-10 w-10 rounded-none rounded-r-md"
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <ClientListPreloader viewMode={viewMode} />
      ) : !sortedClients?.length ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Building className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">Nenhum cliente encontrado</CardTitle>
          <CardDescription className="max-w-md">
            {searchTerm || typeFilter !== "all" ? 
              "Não encontramos nenhum cliente com os filtros selecionados. Tente ajustar sua busca ou os filtros." : 
              "Você ainda não tem nenhum cliente. Comece adicionando seu primeiro cliente para começar a gerenciar seus projetos."}
          </CardDescription>
          <Button variant="default" className="mt-6" onClick={handleNewClientClick}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar cliente
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClients.map((client) => (
            <Card key={client.id} className="overflow-hidden group">
              <Link href={`/clients/${client.id}`} className="block">
                <CardHeader className="pb-3 cursor-pointer">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-3 items-center">
                      <ClientAvatar client={client} size="lg" />
                      <div className="space-y-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {client.name}
                        </CardTitle>
                        {client.type && (
                          <Badge variant="outline" className="capitalize">
                            {client.type === 'empresa' ? 'Empresa' : 
                            client.type === 'agencia' ? 'Agência' : 
                            client.type === 'freelancer' ? 'Freelancer' : 
                            client.type === 'ong' ? 'ONG' : 'Outro'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs ${isClientActive(client) ? 'bg-green-50 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isClientActive(client) ? 'bg-green-600' : 'bg-muted-foreground'}`} />
                      {isClientActive(client) ? 'Ativo' : 'Inativo'}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Link>
              
              <CardContent className="pb-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {client.contactName && (
                    <div className="col-span-2 flex items-start gap-2 text-sm">
                      <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <p className="font-medium text-muted-foreground">
                          {client.contactName}
                        </p>
                        {client.contactPhone && <p>{client.contactPhone}</p>}
                      </div>
                    </div>
                  )}
                  
                  {client.contactEmail && (
                    <div className="col-span-2 flex items-start gap-2 text-sm">
                      <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <p className="break-all">{client.contactEmail}</p>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="col-span-2 flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <p>
                        {client.address}
                        {client.city && `, ${client.city}`}
                      </p>
                    </div>
                  )}
                  
                  {client.website && (
                    <div className="col-span-2 flex items-start gap-2 text-sm">
                      <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <a 
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {client.website.replace(/^https?:\/\//i, '')}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  
                  {client.since && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <p>Cliente desde {formatDate(client.since)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="grid grid-cols-2 gap-4 pt-0 pb-4">
                <div className="rounded-md p-2 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">Projetos</p>
                    <Folders className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mt-1">{getClientProjectsCount(client.id) || '0'}</p>
                </div>
                
                <div className="rounded-md p-2 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">Receita total</p>
                    <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mt-1">{formatCurrency(getClientRevenue(client.id))}</p>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <ScrollArea className="h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead className="text-right">Receita total</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="block">
                        <div className="flex gap-3 items-center">
                          <ClientAvatar client={client} size="md" />
                          <div className="space-y-1">
                            <p className="font-medium group-hover:text-primary transition-colors">
                              {client.name}
                              {client.shortName && 
                                <span className="text-muted-foreground font-normal ml-1">
                                  ({client.shortName})
                                </span>
                              }
                            </p>
                            {client.type && (
                              <Badge variant="outline" className="capitalize">
                                {client.type === 'empresa' ? 'Empresa' : 
                                client.type === 'agencia' ? 'Agência' : 
                                client.type === 'freelancer' ? 'Freelancer' : 
                                client.type === 'ong' ? 'ONG' : 'Outro'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {client.contactName && <p className="text-sm font-medium">{client.contactName}</p>}
                        {client.contactEmail && (
                          <a 
                            href={`mailto:${client.contactEmail}`} 
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {client.contactEmail}
                          </a>
                        )}
                        {client.contactPhone && <p className="text-sm">{client.contactPhone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs ${isClientActive(client) ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isClientActive(client) ? 'bg-green-700' : 'bg-muted-foreground'}`} />
                        <span className="ml-1">{isClientActive(client) ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1 text-sm">
                        <Folders className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{getClientProjectsCount(client.id) || '0'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-medium">{formatCurrency(getClientRevenue(client.id))}</p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedClient({
                                id: client.id,
                                name: client.name || ""
                              });
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
      
      {/* Sheet com formulário simplificado de novo cliente */}
      <ClientSheet open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen} />
    </div>
  );
}
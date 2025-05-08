import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials, cn, formatDate, formatCurrency } from "@/lib/utils";
import { ClientAvatar } from "@/components/ClientAvatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Plus,
  Search,
  Building,
  LayoutGrid,
  List,
  Calendar,
  BarChart4,
  Briefcase,
  CircleDollarSign,
  ArrowUpRight,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CLIENT_TYPE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Client, type Project } from "@shared/schema";
import { NewClientSheet } from "@/components/NewClientSheet";

export default function ImprovedClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewClientSheetOpen, setIsNewClientSheetOpen] = useState(false);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Buscar clientes
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    throwOnError: false,
  });

  // Buscar projetos
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    throwOnError: false,
  });

  // Mutation para ativar/desativar cliente
  const toggleClientActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/clients/${id}`, { active });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Status atualizado",
        description: "O status do cliente foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/clients/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
      });
      setIsDeleteClientDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtrar clientes por termo de busca e tipo
  const filteredClients = clients?.filter((client: Client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || client.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Ordenar clientes por nome
  const sortedClients = filteredClients?.sort((a: Client, b: Client) => {
    return a.name.localeCompare(b.name);
  });

  // Verificar se um cliente está ativo
  const isClientActive = (client: Client) => {
    return client.active !== false; // Se a propriedade não existir, considere como ativo
  };

  // Contar projetos de um cliente
  const getClientProjectsCount = (clientId: number) => {
    if (!projects) return 0;
    return projects.filter((project: Project) => project.client_id === clientId).length;
  };

  // Calcular receita total de um cliente
  const getClientTotalRevenue = (clientId: number) => {
    if (!projects) return 0;
    return projects
      .filter((project: Project) => project.client_id === clientId)
      .reduce((total: number, project: Project) => total + (project.budget || 0), 0);
  };

  // Toggle do status ativo/inativo do cliente
  const handleToggleClientActive = (client: Client) => {
    toggleClientActiveMutation.mutate({
      id: client.id,
      active: !isClientActive(client),
    });
  };

  // Abrir dialog de confirmação para excluir cliente
  const handleDeleteClient = (client: Client) => {
    setSelectedClient({ id: client.id, name: client.name });
    setIsDeleteClientDialogOpen(true);
  };

  // Navegar para a página de detalhes do cliente
  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`);
  };

  // Lidar com a criação bem-sucedida de um cliente
  const handleClientCreated = (clientId: number) => {
    // Opcionalmente poderia navegar para a página do cliente recém-criado
    toast({
      title: "Cliente criado!",
      description: "Deseja criar um projeto para este cliente agora?",
      action: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/projects/new?client=${clientId}`)}
        >
          Criar Projeto
        </Button>
      ),
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e acesse informações importantes rapidamente.
          </p>
        </div>
        <Button 
          onClick={() => setIsNewClientSheetOpen(true)}
          className="sm:w-auto w-full"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full">
        <div className="relative w-full md:w-3/4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 h-10"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-1/4 flex-shrink-0">
          <ToggleGroup 
            type="single" 
            variant="outline"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}
            className="md:justify-end"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1 bg-background"
          >
            <option value="all">Todos os tipos</option>
            {CLIENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <CardHeader className="h-24 bg-muted" />
              <CardContent className="p-4 space-y-3">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
              <CardFooter className="h-16 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {sortedClients?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg p-6 text-center">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {searchTerm || typeFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Comece adicionando seu primeiro cliente"}
              </p>
              <Button 
                onClick={() => setIsNewClientSheetOpen(true)}
                variant="default"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar Cliente
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedClients?.map((client: Client) => (
                <Card 
                  key={client.id} 
                  className={cn(
                    "hover:shadow-md transition-shadow overflow-hidden border",
                    !isClientActive(client) && "bg-muted/30 border-dashed"
                  )}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start space-y-0 gap-3">
                    <ClientAvatar 
                      client={client} 
                      className="h-14 w-14 flex-shrink-0" 
                      fallbackClassName="text-xl"
                    />
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <CardTitle className="text-base line-clamp-2">
                        {client.shortName || client.name}
                      </CardTitle>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge 
                          variant={CLIENT_TYPE_OPTIONS.find(opt => opt.value === client.type)?.color || "default"}
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {CLIENT_TYPE_OPTIONS.find(opt => opt.value === client.type)?.label || client.type}
                        </Badge>
                        
                        <Badge 
                          variant={isClientActive(client) ? "outline" : "secondary"}
                          className="text-[10px] px-1 py-0 h-4 cursor-pointer hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleClientActive(client);
                          }}
                        >
                          {isClientActive(client) ? (
                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                          ) : (
                            <XCircle className="mr-1 h-2.5 w-2.5" />
                          )}
                          {isClientActive(client) ? "Ativo" : "Inativo"}
                        </Badge>
                        
                        {client.segments && client.segments.length > 0 && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {Array.isArray(client.segments) 
                              ? client.segments[0] 
                              : typeof client.segments === 'string' 
                                ? client.segments.split(',')[0].trim() 
                                : ''
                            }
                            {(Array.isArray(client.segments) && client.segments.length > 1) || 
                            (typeof client.segments === 'string' && client.segments.split(',').length > 1) 
                              ? "+" 
                              : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="px-4 pt-1 pb-2">
                    <div className="text-xs text-muted-foreground">
                      {client.contactEmail && (
                        <div className="flex items-center gap-1 truncate mb-1">
                          <span>{client.contactEmail}</span>
                        </div>
                      )}
                      
                      {client.contactName && (
                        <div className="flex items-center gap-1 truncate mb-1">
                          <span>{client.contactName}</span>
                          {client.contactPhone && (
                            <span className="opacity-70">• {client.contactPhone}</span>
                          )}
                        </div>
                      )}
                      
                      {client.cnpj && (
                        <div className="flex items-center gap-1 truncate mb-1">
                          <span className="opacity-70">{client.cnpj}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="px-4 py-2 bg-muted/20 flex justify-between items-center text-sm border-t">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1" title="Projetos">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{getClientProjectsCount(client.id)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1" title="Receita total">
                        <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{formatCurrency(getClientTotalRevenue(client.id))}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={() => handleClientClick(client.id)}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Contato</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Projetos</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Receita</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground w-16">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClients?.map((client: Client) => (
                    <tr 
                      key={client.id} 
                      className={cn(
                        "border-t hover:bg-muted/50 cursor-pointer",
                        !isClientActive(client) && "bg-muted/20"
                      )}
                      onClick={() => handleClientClick(client.id)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <ClientAvatar 
                            client={client} 
                            className="h-8 w-8 flex-shrink-0" 
                          />
                          <div>
                            <div className="font-medium">{client.shortName || client.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {client.cnpj || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {client.contactEmail ? (
                          <div>
                            <div>{client.contactEmail}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.contactName || "-"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div 
                          className="flex flex-wrap gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge 
                            variant={CLIENT_TYPE_OPTIONS.find(opt => opt.value === client.type)?.color || "default"}
                            className="text-xs"
                          >
                            {CLIENT_TYPE_OPTIONS.find(opt => opt.value === client.type)?.label || client.type}
                          </Badge>
                          
                          <Badge 
                            variant={isClientActive(client) ? "outline" : "secondary"}
                            className="text-xs cursor-pointer hover:bg-muted"
                            onClick={() => handleToggleClientActive(client)}
                          >
                            {isClientActive(client) ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span>{getClientProjectsCount(client.id)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">
                          {formatCurrency(getClientTotalRevenue(client.id))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClientClick(client.id);
                            }}
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Sheet para novo cliente (fluxo ultra-rápido) */}
      <NewClientSheet
        open={isNewClientSheetOpen}
        onOpenChange={setIsNewClientSheetOpen}
        onClientCreated={handleClientCreated}
      />
      
      {/* Dialog para confirmação de exclusão */}
      <AlertDialog open={isDeleteClientDialogOpen} onOpenChange={setIsDeleteClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              <span className="font-semibold"> {selectedClient?.name}</span> e todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClient && deleteClientMutation.mutate(selectedClient.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
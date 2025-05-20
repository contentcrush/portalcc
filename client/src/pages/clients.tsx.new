import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { NewClientForm } from "@/components/NewClientForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { insertClientSchema, insertProjectSchema, type InsertClient, type InsertProject } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getInitials, generateAvatarColor, cn, formatDate, formatCurrency, showSuccessToast } from "@/lib/utils";
import { ClientAvatar } from "@/components/ClientAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  MoreHorizontal,
  ExternalLink,
  CalendarRange,
  CreditCard,
  Languages
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CLIENT_TYPE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { EntityFileManager } from "@/components/EntityFileManager";

export default function ClientsPage() {
  const [location, navigate] = useLocation();
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const { toast } = useToast();

  // Consulta para obter os clientes
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Falha ao carregar clientes");
      return res.json();
    },
  });

  // Consulta para obter os usuários (necessário para projetos relacionados)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Falha ao carregar usuários");
      return res.json();
    },
  });

  // Filtrar clientes com base na pesquisa e no tipo selecionado
  const filteredClients = clients.filter((client: any) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.shortName && client.shortName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.contactName && client.contactName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType ? client.type === selectedType : true;

    return matchesSearch && matchesType;
  });

  // Função para abrir o diálogo de novo cliente
  const handleNewClientClick = () => {
    setIsNewClientDialogOpen(true);
  };

  // Manipulador para excluir um cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      showSuccessToast({
        title: "Cliente excluído com sucesso",
        description: "O cliente foi removido da sua lista"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Não foi possível remover o cliente",
        variant: "destructive",
      });
    },
  });

  // Função para confirmar exclusão de cliente
  const confirmDeleteClient = (id: number, clientName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${clientName}"?`)) {
      deleteClientMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e veja seus projetos e faturamento.
          </p>
        </div>
        <Button onClick={handleNewClientClick} size="sm" className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full sm:w-auto">
          {/* Barra de busca */}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar clientes..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtro por tipo */}
          <Select
            value={selectedType || ""}
            onValueChange={(value) => setSelectedType(value || null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              {CLIENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Alternador de visualização */}
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="px-3"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="px-3"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Tabela
          </Button>
        </div>
      </div>

      {/* Status da pesquisa */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground mb-4">
          Exibindo {filteredClients.length} de {clients.length} clientes
          {selectedType && (
            <span> (Filtro: {CLIENT_TYPE_OPTIONS.find(option => option.value === selectedType)?.label || selectedType})</span>
          )}
        </div>
      )}

      {/* Mostrar estado de carregamento */}
      {isLoadingClients ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Projetos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-[40px] ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )
      ) : filteredClients.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <Building className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum cliente encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? "Não encontramos nenhum cliente correspondente à sua busca."
                : "Você ainda não tem nenhum cliente cadastrado."}
            </p>
            <Button onClick={handleNewClientClick} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar cliente
            </Button>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClients.map((client: any) => (
            <Card key={client.id} className="overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Link href={`/clients/${client.id}`} className="flex-1">
                    <div className="flex items-center gap-3 group cursor-pointer">
                      <ClientAvatar client={client} className="h-12 w-12" />
                      <div>
                        <div className="font-medium group-hover:underline line-clamp-1">{client.name}</div>
                        {client.type && (
                          <Badge variant="outline" className="mt-1">
                            {CLIENT_TYPE_OPTIONS.find((option) => option.value === client.type)?.label || client.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                        <Building className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/projects?client=${client.id}`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Ver projetos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/edit`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Editar cliente
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => confirmDeleteClient(client.id, client.name)}
                      >
                        Excluir cliente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-2 space-y-2 text-sm">
                {client.contactName && (
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <span className="truncate">{client.contactName}</span>
                  </div>
                )}
                
                {client.contactEmail && (
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <a 
                      href={`mailto:${client.contactEmail}`}
                      className="truncate hover:underline"
                    >
                      {client.contactEmail}
                    </a>
                  </div>
                )}
                
                {client.contactPhone && (
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <a 
                      href={`tel:${client.contactPhone}`}
                      className="truncate hover:underline"
                    >
                      {client.contactPhone}
                    </a>
                  </div>
                )}
                
                {client.website && (
                  <div className="flex items-center text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <a 
                      href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                    >
                      {client.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link href={`/clients/${client.id}`}>
                        <div className="flex items-center gap-3 group cursor-pointer">
                          <ClientAvatar client={client} className="h-10 w-10" />
                          <div>
                            <div className="font-medium group-hover:underline">{client.name}</div>
                            {client.shortName && (
                              <div className="text-xs text-muted-foreground">{client.shortName}</div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {client.type ? (
                        <Badge variant="outline">
                          {CLIENT_TYPE_OPTIONS.find((option) => option.value === client.type)?.label || client.type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não definido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.contactName ? (
                          <div className="text-sm font-medium">{client.contactName}</div>
                        ) : null}
                        {client.contactEmail ? (
                          <a
                            href={`mailto:${client.contactEmail}`}
                            className="text-xs text-muted-foreground hover:underline flex items-center"
                          >
                            <Mail className="h-3 w-3 mr-1" /> {client.contactEmail}
                          </a>
                        ) : null}
                        {client.contactPhone ? (
                          <a
                            href={`tel:${client.contactPhone}`}
                            className="text-xs text-muted-foreground hover:underline flex items-center"
                          >
                            <Phone className="h-3 w-3 mr-1" /> {client.contactPhone}
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-primary hover:text-primary/80 justify-start"
                          onClick={() => navigate(`/projects?client=${client.id}`)}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" /> Ver projetos
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-primary hover:text-primary/80 justify-start"
                          onClick={() => navigate(`/financial?client=${client.id}`)}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" /> Financeiro
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                            <Building className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/projects?client=${client.id}`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Ver projetos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/edit`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Editar cliente
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => confirmDeleteClient(client.id, client.name)}
                          >
                            Excluir cliente
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

      {/* Dialog para novo cliente - Versão simplificada */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações básicas para adicionar um novo cliente.
            </DialogDescription>
          </DialogHeader>
          
          {/* Novo formulário simplificado */}
          <div className="py-1">
            <NewClientForm 
              onSuccess={() => {
                setIsNewClientDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                showSuccessToast({
                  title: "Cliente criado com sucesso!",
                  description: "O novo cliente foi adicionado à sua lista"
                });
              }}
              onCancel={() => setIsNewClientDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
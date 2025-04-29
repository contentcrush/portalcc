import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { insertClientSchema, insertProjectSchema, type InsertClient, type InsertProject } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getInitials, generateAvatarColor } from "@/lib/utils";
import { ClientAvatar } from "@/components/ClientAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Clock,
  FileText,
  Filter,
  MoreHorizontal,
  X,
  Globe,
  LayoutGrid,
  List,
  Download,
  CircleDollarSign,
  Folders,
  Activity,
  Upload,
  ChevronDown,
  ChevronRight,
  Info,
  Image,
  Tag,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
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

// Schema para validação do formulário
const formSchema = insertClientSchema.extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  contactEmail: z.string().email("Email inválido").nullable().optional(),
});

// Schema para validação do formulário de projeto
const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(2, "Nome do projeto deve ter pelo menos 2 caracteres"),
});

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [deleteItemsCount, setDeleteItemsCount] = useState<{
    projects: number;
    interactions: number;
    financialDocuments: number;
  }>({ projects: 0, interactions: 0, financialDocuments: 0 });
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Formulário para novo cliente
  // Estado para controlar etapas do formulário e outros estados do novo cliente
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formStep, setFormStep] = useState<number>(0);
  const [isCollapseOpen, setIsCollapseOpen] = useState(false);
  const [segmentTags, setSegmentTags] = useState<string[]>([]);
  const [isLookupCnpj, setIsLookupCnpj] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "",
      cnpj: "",
      website: "",
      contactName: "",
      contactPosition: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      notes: "",
      logo: "", // Campo para armazenar a URL da imagem de logo do cliente
    },
  });

  // Formulário para novo projeto
  const projectForm = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      client_id: 0,
      status: "draft",
      budget: undefined,
      startDate: undefined,
      endDate: undefined,
      progress: 0,
      thumbnail: "",
    },
  });

  // Mutation para criar novo cliente
  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await apiRequest("POST", "/api/clients", data);
      return await response.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsNewClientDialogOpen(false);
      setFormStep(0); // Reset para o primeiro passo para próxima vez
      setAvatarPreview(null); // Limpar preview
      setSegmentTags([]); // Limpar tags
      setIsCollapseOpen(false); // Resetar collapse
      form.reset();
      
      // Toast com CTA para criar novo projeto
      toast({
        title: "Cliente criado com sucesso",
        description: (
          <div className="flex flex-col gap-2">
            <p>{newClient.name} foi adicionado à sua base de clientes.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full justify-center"
              onClick={() => {
                handleNewProjectClick({
                  id: newClient.id,
                  name: newClient.name
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar novo projeto para este cliente
            </Button>
          </div>
        ),
        duration: 5000,
      });
      
      navigate(`/clients/${newClient.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Ocorreu um erro ao criar o cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation para criar novo projeto
  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return await response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', selectedClient?.id, 'projects'] });
      setIsNewProjectDialogOpen(false);
      projectForm.reset();
      toast({
        title: "Projeto criado com sucesso",
        description: `${newProject.name} foi criado para o cliente ${selectedClient?.name}.`,
      });
      navigate(`/projects/${newProject.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message || "Ocorreu um erro ao criar o projeto. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função para lidar com upload de avatar
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verificar tipo e tamanho
    if (!file.type.includes('image/')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Criar uma URL temporária para visualização usando FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string;
        setAvatarPreview(dataUrl);
        
        // Também armazenamos a dataUrl para enviar ao servidor
        form.setValue('logo', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Função para buscar dados do CNPJ
  const handleCnpjLookup = async () => {
    const cnpj = form.getValues('cnpj')?.replace(/[^\d]/g, '');
    
    if (!cnpj || cnpj.length !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "Digite um CNPJ válido para realizar a consulta.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLookupCnpj(true);
    
    try {
      // Simulação de consulta à API
      // Em um ambiente real, isso seria uma chamada à API Receita WS / Brasil.io
      setTimeout(() => {
        // Simular dados retornados
        form.setValue('name', 'Empresa Simulada Ltda.');
        form.setValue('address', 'Av. Brasil, 1500');
        form.setValue('city', 'São Paulo');
        
        toast({
          title: "CNPJ encontrado",
          description: "Dados da empresa preenchidos automaticamente.",
        });
        setIsLookupCnpj(false);
      }, 1500);
    } catch (error) {
      toast({
        title: "Erro na consulta",
        description: "Não foi possível consultar os dados do CNPJ.",
        variant: "destructive",
      });
      setIsLookupCnpj(false);
    }
  };
  
  // Função para navegar entre etapas do formulário
  const handleNextStep = () => {
    const currentValues = form.getValues();
    
    // Validar campos da etapa 1
    if (formStep === 0) {
      if (!currentValues.name || !currentValues.type) {
        form.trigger(['name', 'type']);
        return;
      }
    }
    
    setFormStep(formStep + 1);
  };
  
  const handlePrevStep = () => {
    setFormStep(formStep - 1);
  };
  
  // Função para submeter o formulário
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Convertendo valores para o formato esperado pela API
    const clientData: InsertClient = {
      ...data,
      // Não enviar o campo since para deixar o servidor usar o defaultNow()
      since: undefined,
      // Adicionar os segmentos aos dados do cliente
      segments: segmentTags.join(', '),
    };
    createClientMutation.mutate(clientData);
  };

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients']
  });
  
  // Fetch projects para cada cliente (para contagem e badges)
  const { data: projects } = useQuery({
    queryKey: ['/api/projects']
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
    
    // Removido filtro de categoria
    
    return true;
  });

  // Sort clients
  const sortedClients = filteredClients?.sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime();
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "revenue") {
      const revenueA = getClientRevenue(a.id);
      const revenueB = getClientRevenue(b.id);
      return revenueB - revenueA; // Ordem decrescente
    }
    return 0;
  });

  const handleNewClientClick = () => {
    setIsNewClientDialogOpen(true);
  };
  
  const handleNewProjectClick = (client: { id: number; name: string }) => {
    setSelectedClient(client);
    projectForm.reset({
      name: "",
      description: "",
      client_id: client.id,
      status: "draft",
      budget: undefined,
      startDate: undefined,
      endDate: undefined,
      progress: 0,
      thumbnail: "",
    });
    setIsNewProjectDialogOpen(true);
  };
  
  const onProjectSubmit = (data: z.infer<typeof projectFormSchema>) => {
    // Converter valores para o formato esperado pela API
    const projectData: InsertProject = {
      ...data,
      client_id: selectedClient?.id as number,
    };
    createProjectMutation.mutate(projectData);
  };
  
  // Função para verificar se um cliente tem projetos ativos
  const isClientActive = (clientId: number) => {
    // Verifica se há projetos ativos nos últimos 6 meses
    if (!projects) return false;
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return projects.some((project: any) => 
      project.client_id === clientId && new Date(project.updated_at || project.created_at) > sixMonthsAgo
    );
  };
  
  // Função para contar o número de projetos por cliente
  const getClientProjectsCount = (clientId: number) => {
    if (!projects) return 0;
    return projects.filter((project: any) => project.client_id === clientId).length;
  };
  
  // Função para calcular a receita total de projetos por cliente
  const getClientRevenue = (clientId: number) => {
    if (!projects) return 0;
    return projects
      .filter((project: any) => project.client_id === clientId)
      .reduce((total: number, project: any) => total + (project.budget || 0), 0);
  };
  
  // Mutation para excluir cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest("DELETE", `/api/clients/${clientId}`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsDeleteClientDialogOpen(false);
      setSelectedClient(null);
      
      toast({
        title: "Cliente excluído com sucesso",
        description: `O cliente foi excluído junto com ${data.deletedItems.projects} projeto(s), ${data.deletedItems.interactions} interação(ões) e ${data.deletedItems.financialDocuments} documento(s) financeiro(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Ocorreu um erro ao excluir o cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Esta mutation não é mais utilizada, pois estamos usando fetch diretamente no handler
  // Foi substituída pela chamada direta na função handleDeleteClientClick

  // Função para abrir o diálogo de confirmação de exclusão
  const handleDeleteClientClick = (client: { id: number; name: string }) => {
    setSelectedClient(client);
    
    // Usar a nova rota OPTIONS para obter informações relacionadas eficientemente
    fetch(`/api/clients/${client.id}`, { method: 'OPTIONS' })
      .then(response => response.json())
      .then(data => {
        setDeleteItemsCount({
          projects: data.relatedItems.projects || 0,
          interactions: data.relatedItems.interactions || 0,
          financialDocuments: data.relatedItems.financialDocuments || 0
        });
        setIsDeleteClientDialogOpen(true);
      })
      .catch(error => {
        console.error("Erro ao buscar informações de exclusão:", error);
        
        // Em caso de erro, mostrar contagem zero
        setDeleteItemsCount({
          projects: 0,
          interactions: 0,
          financialDocuments: 0
        });
        
        toast({
          title: "Aviso",
          description: "Não foi possível obter a contagem precisa de itens relacionados.",
          variant: "warning"
        });
        
        setIsDeleteClientDialogOpen(true);
      });
  };

  // Função para excluir o cliente após confirmação
  const confirmDeleteClient = () => {
    if (selectedClient) {
      deleteClientMutation.mutate(selectedClient.id);
    }
  };

  // Função para exportar dados para Excel
  const exportToExcel = () => {
    toast({
      title: "Exportando dados",
      description: "Os dados serão exportados em um formato Excel.",
    });
    // Implementação real usando uma biblioteca como xlsx seria feita aqui
    setIsExportDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Gerenciamento de clientes e relacionamentos</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={handleNewClientClick}>
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
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="revenue">Faturamento</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={() => setIsExportDialogOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>
      
      {/* View mode toggle */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
        <div className="text-sm text-muted-foreground">
          {sortedClients?.length || 0} clientes encontrados
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
          <ToggleGroupItem value="grid" aria-label="Visualização em grade">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Visualização em lista">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
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
          <Button onClick={handleNewClientClick}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      )}
      
      {/* Clients grid view */}
      {sortedClients && sortedClients.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedClients.map(client => (
            <Card key={client.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <ClientAvatar 
                        name={client.name}
                        logoUrl={client.logo}
                        size="md"
                        className="mr-4"
                      />
                      <div>
                        <Link href={`/clients/${client.id}`}>
                          <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                            {client.name}
                          </h3>
                        </Link>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {client.type || 'Cliente'}
                          </span>
                          
                          {/* Status badge */}
                          <div className="flex items-center">
                            <Badge 
                              className={`px-1 py-0 h-2 rounded-full ${isClientActive(client.id) 
                                ? 'bg-emerald-500' 
                                : 'bg-gray-300'}`}
                            />
                          </div>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>
                            Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}/edit`}>
                            Editar cliente
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleNewProjectClick(client)}>
                          Novo projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}?tab=interactions&new=true`}>
                            Nova interação
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:bg-red-50 focus:text-red-600"
                          onClick={() => handleDeleteClientClick({id: client.id, name: client.name})}
                        >
                          Excluir cliente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex space-x-3 mb-4">
                    <Badge variant="outline" className="flex items-center gap-1.5 bg-gray-50">
                      <Folders className="h-3.5 w-3.5 text-muted-foreground" />
                      {getClientProjectsCount(client.id)} projetos
                    </Badge>
                    
                    <Badge variant="outline" className="flex items-center gap-1.5 bg-gray-50">
                      <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      R$ {getClientRevenue(client.id).toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {client.contactName && (
                      <div className="flex items-center text-sm">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {client.contactName}{client.contactPosition ? `, ${client.contactPosition}` : ''}
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
                        <span>{client.address}{client.city ? `, ${client.city}` : ''}</span>
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
                  <div className="flex-1">
                    <Button 
                      variant="ghost" 
                      className="w-full rounded-none py-2"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNewProjectClick(client);
                      }}
                    >
                      Novo projeto
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add new client card */}
          <Card 
            className="border-2 border-dashed border-gray-300 hover:border-primary/40 transition-colors cursor-pointer"
            onClick={handleNewClientClick}
          >
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
      
      {/* Clients list view */}
      {sortedClients && sortedClients.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="text-center">Projetos</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Desde</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.map(client => (
                <TableRow key={client.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center">
                      <ClientAvatar 
                        name={client.name}
                        logoUrl={client.logo}
                        size="sm"
                        className="mr-3"
                      />
                      <div>
                        <Link href={`/clients/${client.id}`}>
                          <div className="font-medium hover:text-primary cursor-pointer">
                            {client.name}
                          </div>
                        </Link>
                        {client.cnpj && (
                          <div className="text-sm text-muted-foreground md:hidden">
                            CNPJ: {client.cnpj}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.type || 'Cliente'}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {client.contactName ? (
                      <div>
                        <div className="font-medium">{client.contactName}</div>
                        {client.contactEmail && (
                          <div className="text-sm text-muted-foreground">{client.contactEmail}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem contato</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-gray-100">
                      {getClientProjectsCount(client.id)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-medium">
                      R$ {getClientRevenue(client.id).toLocaleString('pt-BR')}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center">
                      <Badge 
                        variant="outline" 
                        className={`px-2 py-0.5 ${isClientActive(client.id) 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      >
                        {isClientActive(client.id) ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(client.since)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>
                            Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}/edit`}>
                            Editar cliente
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleNewProjectClick(client)}>
                          Novo projeto
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}?tab=interactions&new=true`}>
                            Nova interação
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:bg-red-50 focus:text-red-600"
                          onClick={() => handleDeleteClientClick({id: client.id, name: client.name})}
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
        </div>
      )}

      {/* Export dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Dados</DialogTitle>
            <DialogDescription>
              Selecione o formato e as opções de exportação desejadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Formato</h4>
              <div className="flex space-x-3">
                <div className="flex items-center space-x-2">
                  <RadioGroup defaultValue="excel">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="excel" id="excel" />
                      <Label htmlFor="excel">Excel (.xlsx)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="csv" />
                      <Label htmlFor="csv">CSV (.csv)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Opções</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="includeProjects" defaultChecked />
                  <Label htmlFor="includeProjects">Incluir projetos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="includeContacts" defaultChecked />
                  <Label htmlFor="includeContacts">Incluir informações de contato</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="includeRevenue" defaultChecked />
                  <Label htmlFor="includeRevenue">Incluir faturamento</Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para criação de novo projeto */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
            <DialogDescription>
              {selectedClient ? `Criar novo projeto para ${selectedClient.name}` : 'Criar novo projeto'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-6">
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Projeto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Landing Page" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o projeto..." 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={projectForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Início</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={projectForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Entrega</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const startDate = projectForm.getValues("startDate");
                              return date < new Date("1900-01-01") || 
                                (startDate ? date < new Date(startDate) : false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={projectForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      defaultValue="draft"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="in_progress">Em Progresso</SelectItem>
                        <SelectItem value="review">Revisão</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewProjectDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">◌</span>
                      Criando...
                    </>
                  ) : (
                    'Criar Projeto'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de confirmação para excluir cliente */}
      <AlertDialog open={isDeleteClientDialogOpen} onOpenChange={setIsDeleteClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <span className="font-semibold">{selectedClient?.name}</span>?
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="text-sm font-medium text-amber-800 mb-2">
                  Atenção: Essa ação não pode ser desfeita.
                </div>
                <div className="text-sm text-amber-700">
                  <p>Os seguintes itens também serão excluídos:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>{deleteItemsCount.projects} projetos</li>
                    <li>{deleteItemsCount.interactions} interações com cliente</li>
                    <li>{deleteItemsCount.financialDocuments} documentos financeiros</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteClient}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteClientMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  Excluindo...
                </>
              ) : (
                'Excluir Cliente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para criação de novo cliente */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações do novo cliente. Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs 
                defaultValue="step1" 
                value={formStep === 0 ? "step1" : "step2"}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="step1" onClick={() => setFormStep(0)}>
                    Passo 1 — Dados básicos
                  </TabsTrigger>
                  <TabsTrigger value="step2" onClick={() => setFormStep(1)}>
                    Passo 2 — Endereço & extras
                  </TabsTrigger>
                </TabsList>
                
                {/* Passo 1: Dados básicos */}
                <TabsContent value="step1" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="col-span-1 flex flex-col items-center justify-start space-y-3">
                      <div className="text-center">
                        <label 
                          htmlFor="avatar-upload" 
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Foto / Logo
                        </label>
                        <div className="relative">
                          <label htmlFor="avatar-upload" className="group cursor-pointer block">
                            <div className="h-24 w-24 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-primary transition-colors">
                              {avatarPreview ? (
                                <Avatar className="h-full w-full">
                                  <AvatarImage src={avatarPreview} alt="Preview" />
                                  <AvatarFallback className="text-lg">
                                    {form.watch('name') ? getInitials(form.watch('name')) : 'CL'}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="flex flex-col items-center justify-center p-2">
                                  <Image className="h-8 w-8 text-gray-400" />
                                  <span className="text-xs text-gray-500 mt-1 text-center">Adicionar imagem</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Upload className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          </label>
                          <input
                            id="avatar-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          JPG, PNG ou GIF
                          <br />Máx. 5MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="md:col-span-3 space-y-6">
                      {/* Informações básicas */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold uppercase text-gray-500">
                            Informações Básicas
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome do Cliente *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: Empresa XYZ" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="shortName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Curto / Sigla</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: XYZ" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Abreviação ou acrônimo da empresa
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Cliente *</FormLabel>
                                <Select value={field.value || ""} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecionar tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {CLIENT_TYPE_OPTIONS.map(option => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="cnpj"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  CNPJ
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-6 px-2 text-xs"
                                    onClick={handleCnpjLookup}
                                    disabled={isLookupCnpj}
                                  >
                                    {isLookupCnpj ? (
                                      <div className="h-3 w-3 animate-spin rounded-full border border-background border-r-transparent mr-1"></div>
                                    ) : null}
                                    Consultar
                                  </Button>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="00.000.000/0000-00" {...field} />
                                </FormControl>
                                <FormDescription>
                                  {isLookupCnpj ? 'Buscando dados...' : 'Digite o CNPJ e clique em consultar para preencher dados automaticamente'}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* Informações de Contato */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase text-gray-500">
                          Contato Principal
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="contactName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome do Contato</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome do responsável" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="contactPosition"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cargo do Contato</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex: Gerente de Marketing" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="contactEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email de Contato</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="contato@empresa.com" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="contactPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone de Contato</FormLabel>
                                <FormControl>
                                  <Input placeholder="(00) 00000-0000" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="button" onClick={handleNextStep}>
                      Próximo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Passo 2: Endereço & extras */}
                <TabsContent value="step2" className="space-y-6">
                  {/* Produtos/Segmentos */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase text-gray-500">
                      Produtos/Segmentos (opcional)
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {segmentTags.map(tag => (
                        <Badge key={tag} variant="outline" className="px-3 py-1.5">
                          {tag}
                          <X 
                            className="ml-2 h-3 w-3 cursor-pointer" 
                            onClick={() => setSegmentTags(segmentTags.filter(t => t !== tag))}
                          />
                        </Badge>
                      ))}
                      
                      {segmentTags.length === 0 && (
                        <div className="text-sm text-muted-foreground italic">
                          Nenhum segmento selecionado
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={(value) => {
                          if (value && !segmentTags.includes(value)) {
                            setSegmentTags([...segmentTags, value]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[240px]">
                          <SelectValue placeholder="Selecionar segmento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Agro">Agro</SelectItem>
                          <SelectItem value="Educação">Educação</SelectItem>
                          <SelectItem value="B2B SaaS">B2B SaaS</SelectItem>
                          <SelectItem value="Varejo">Varejo</SelectItem>
                          <SelectItem value="Saúde">Saúde</SelectItem>
                          <SelectItem value="Finanças">Finanças</SelectItem>
                          <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          // Em uma implementação real, isso abriria um dialog para adicionar novo segmento
                          const newSegment = prompt("Adicionar novo segmento:");
                          if (newSegment && !segmentTags.includes(newSegment)) {
                            setSegmentTags([...segmentTags, newSegment]);
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Endereço e Detalhes */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase text-gray-500">
                      Endereço
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input placeholder="Rua, número, bairro" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Campos colapsáveis */}
                  <Collapsible
                    open={isCollapseOpen}
                    onOpenChange={setIsCollapseOpen}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        Informações Adicionais
                      </h3>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {isCollapseOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <>
                              <ChevronRight className="h-4 w-4 mr-1" />
                              <span className="text-xs">Mostrar mais</span>
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="www.empresa.com.br" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notas</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Observações adicionais sobre o cliente" 
                                  className="min-h-[100px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={handlePrevStep}>
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createClientMutation.isPending}
                    >
                      {createClientMutation.isPending ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                          Salvando...
                        </>
                      ) : (
                        'Criar Cliente'
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

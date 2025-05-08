import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, DatePickerWithYearNavigation } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { insertClientSchema, insertProjectSchema, type InsertClient, type InsertProject } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getInitials, generateAvatarColor, cn, formatDate, formatCurrency } from "@/lib/utils";
import { ClientAvatar } from "@/components/ClientAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  ChevronLeft,
  Info,
  Image,
  Tag,
  ArrowRight,
  Calendar as CalendarIcon,
  User,
  UserPlus,
  Settings,
  Briefcase,
  ExternalLink,
  BarChart,
  Trash2,
  ArrowUpRight,
  Check,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Opções para tipo de cliente
const CLIENT_TYPE_OPTIONS = [
  { value: "corporate", label: "Corporativo" },
  { value: "agency", label: "Agência" },
  { value: "retail", label: "Varejo" },
  { value: "nonprofit", label: "ONG / Sem fins lucrativos" },
  { value: "government", label: "Governo" },
  { value: "education", label: "Educação" },
  { value: "personal", label: "Pessoa Física" },
];

// Extend the schema for form validation
const formSchema = insertClientSchema
  .extend({
    // Adicione campos temporários que não vão para o banco de dados
    contactName: z.string().optional().nullable(),
    contactPosition: z.string().optional().nullable(),
    contactEmail: z.string().email().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // Se nome ou tipo não estiver preenchido, falha
      return data.name && data.type;
    },
    {
      message: "Preencha os campos obrigatórios",
      path: ["name"],
    }
  );

// Extend the schema for project form validation
const projectFormSchema = insertProjectSchema
  .extend({
    // Add client_id field
    client_id: z.number(),
    // Define start and end date fields
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })
  .refine(
    (data) => {
      // Se nome não estiver preenchido, falha
      return data.name;
    },
    {
      message: "Preencha o nome do projeto",
      path: ["name"],
    }
  );

export default function Clients() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [formStep, setFormStep] = useState(0);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(null);
  const [isDeleteClientDialogOpen, setIsDeleteClientDialogOpen] = useState(false);
  const [isLookupCnpj, setIsLookupCnpj] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [deleteItemsCount, setDeleteItemsCount] = useState({
    projects: 0,
    interactions: 0,
    financialDocuments: 0
  });
  
  // Segments (tags) state
  const [segmentTags, setSegmentTags] = useState<string[]>([]);
  const [segmentInput, setSegmentInput] = useState("");
  
  // Create form for new client
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "",
      cnpj: "",
      website: "",
      address: "",
      city: "",
      since: new Date(),
      contactName: "",
      contactPosition: "",
      contactEmail: "",
      contactPhone: "",
      logo: "",
      notes: "",
      active: true,
    },
  });
  
  // Create form for new project
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
  
  // Mutation for creating a new client
  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await apiRequest("POST", "/api/clients", data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsNewClientDialogOpen(false);
      setFormStep(0);
      
      // Limpar o formulário
      form.reset();
      setAvatarPreview(null);
      setSegmentTags([]);
      
      toast({
        title: "Cliente criado com sucesso!",
        description: `${data.name} foi adicionado à sua lista de clientes.`,
      });
      
      // Navegar para a página de detalhes do cliente
      setLocation(`/clients/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Ocorreu um erro ao criar o cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for creating a new project
  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsNewProjectDialogOpen(false);
      
      toast({
        title: "Projeto criado com sucesso!",
        description: `${data.name} foi adicionado a ${selectedClient?.name}.`,
      });
      
      // Navegar para a página de detalhes do projeto
      setLocation(`/projects/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message || "Ocorreu um erro ao criar o projeto. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Função para adicionar um segment tag
  const addSegmentTag = () => {
    if (segmentInput.trim() !== "" && !segmentTags.includes(segmentInput.trim())) {
      setSegmentTags([...segmentTags, segmentInput.trim()]);
      setSegmentInput("");
    }
  };
  
  // Função para remover um segment tag
  const removeSegmentTag = (tagToRemove: string) => {
    setSegmentTags(segmentTags.filter(tag => tag !== tagToRemove));
  };
  
  // Função para processar o upload de avatar
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verificar o tamanho do arquivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo para o logo é de 2MB.",
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
  
  // Função para navegar para a próxima etapa do formulário
  const handleNextStep = () => {
    if (formStep === 0) {
      // Validar campos obrigatórios da etapa 1
      form.trigger(['name', 'type']).then(isValid => {
        if (isValid) {
          setFormStep(1);
        }
      });
    } else if (formStep === 1) {
      // Para a etapa 2, avançamos sem validação obrigatória
      setFormStep(2);
    }
    // Não há próxima etapa após a etapa 2
  };
  
  // Função para voltar para a etapa anterior
  const handlePrevStep = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1);
    }
  };
  
  // Função para submeter o formulário
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Convertendo valores para o formato esperado pela API
    const clientData: InsertClient = {
      ...data,
      // A data já será tratada pelo schema Zod, não precisamos converter aqui
      since: data.since,
      // Adicionar os segmentos aos dados do cliente
      segments: segmentTags.join(', '),
    };
    createClientMutation.mutate(clientData);
  };

  // Fetch clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['/api/clients']
  });
  
  // Fetch projects para cada cliente (para contagem e badges)
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects']
  });

  // Filter clients based on criteria
  const filteredClients = clients.filter((client: any) => {
    // Search term filter
    if (searchTerm && !client.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Type filter
    if (typeFilter !== "all" && client.type !== typeFilter) {
      return false;
    }
    
    return true;
  });

  // Sort clients
  const sortedClients = filteredClients.sort((a: any, b: any) => {
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
    // Reset form before opening
    form.reset({
      name: "",
      shortName: "",
      type: "",
      cnpj: "",
      website: "",
      address: "",
      city: "",
      since: new Date(),
      contactName: "",
      contactPosition: "",
      contactEmail: "",
      contactPhone: "",
      logo: "",
      notes: "",
      active: true,
    });
    setAvatarPreview(null);
    setSegmentTags([]);
    setFormStep(0);
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
  
  // Função para verificar se um cliente está ativo com base no campo 'active'
  const isClientActive = (client: any) => {
    return client.active !== false; // Se o campo for undefined ou null, considera como ativo
  };
  
  // Função para alternar o status ativo/inativo de um cliente
  const toggleClientActiveStatus = async (clientId: number, currentStatus: boolean) => {
    try {
      const response = await apiRequest('PATCH', `/api/clients/${clientId}`, {
        active: !currentStatus,
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        toast({
          title: `Cliente ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
          description: `O cliente foi marcado como ${!currentStatus ? 'ativo' : 'inativo'}.`,
        });
      } else {
        throw new Error('Falha ao atualizar status do cliente');
      }
    } catch (error) {
      console.error('Erro ao alternar status do cliente:', error);
      toast({
        title: "Erro ao atualizar cliente",
        description: "Não foi possível alterar o status do cliente. Tente novamente.",
        variant: "destructive",
      });
    }
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

  // Função para abrir o diálogo de confirmação de exclusão
  const handleDeleteClientClick = (client: { id: number; name: string }) => {
    setSelectedClient(client);
    
    // Usar a nova rota OPTIONS para obter informações relacionadas eficientemente
    fetch(`/api/clients/${client.id}`, { method: 'OPTIONS' })
      .then(res => res.json())
      .then(data => {
        setDeleteItemsCount({
          projects: data.related?.projects || 0,
          interactions: data.related?.interactions || 0,
          financialDocuments: data.related?.financialDocuments || 0
        });
        setIsDeleteClientDialogOpen(true);
      })
      .catch(err => {
        console.error("Erro ao buscar informações relacionadas:", err);
        setDeleteItemsCount({ projects: 0, interactions: 0, financialDocuments: 0 });
        setIsDeleteClientDialogOpen(true);
      });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Gerencie, visualize e adicione clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleNewClientClick} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>
      
      {/* Filters and search */}
      <Card className="border border-border/40 shadow-sm">
        <CardContent className="p-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            {/* Campo de busca compacto */}
            <div className="relative sm:col-span-4 w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar clientes..."
                className="pl-8 h-9 bg-background w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap sm:col-span-8 gap-2 items-center justify-between w-full">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Filtro de tipo mais compacto */}
                <Select
                  defaultValue="all"
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                >
                  <SelectTrigger className="h-9 w-[120px] md:w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {CLIENT_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Ordenação mais compacta */}
                <Select
                  defaultValue="recent"
                  value={sortBy}
                  onValueChange={setSortBy}
                >
                  <SelectTrigger className="h-9 w-[120px] md:w-[140px]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="revenue">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Toggle de visualização à direita */}
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => {
                  if (value) setViewMode(value as 'grid' | 'list');
                }}
                className="border rounded-md p-0.5"
              >
                <ToggleGroupItem value="grid" aria-label="Visualização em grade" className="h-8 w-8 px-0">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="Visualização em lista" className="h-8 w-8 px-0">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          
          {/* Contador de resultados */}
          {!isLoading && filteredClients && (
            <div className="text-sm text-muted-foreground mt-1">
              {filteredClients.length} {filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 px-6 py-3 flex justify-between">
                <div className="h-3 bg-muted rounded animate-pulse w-20" />
                <div className="h-3 bg-muted rounded animate-pulse w-16" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Grid View */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClients.map((client: any) => (
            <Card key={client.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              <Link href={`/clients/${client.id}`}>
                <CardContent className="p-6 cursor-pointer">
                  <div className="flex items-start gap-4 mb-4">
                    <ClientAvatar
                      name={client.name}
                      logo={client.logo}
                      size="md"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-base truncate">{client.name}</h3>
                        <div onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleClientActiveStatus(client.id, isClientActive(client));
                        }}>
                          {!isClientActive(client) && (
                            <Badge 
                              variant="outline" 
                              className="bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                            >
                              Inativo
                            </Badge>
                          )}
                        </div>
                      </div>
                      {client.shortName && (
                        <p className="text-sm text-muted-foreground">{client.shortName}</p>
                      )}
                      {client.type && (
                        <Badge variant="secondary" className="mt-1">
                          {CLIENT_TYPE_OPTIONS.find(option => option.value === client.type)?.label || client.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    {client.website && (
                      <div className="flex items-center text-muted-foreground">
                        <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{client.website}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{client.address}{client.city ? `, ${client.city}` : ''}</span>
                      </div>
                    )}
                    {client.since && (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Cliente desde {formatDate(client.since)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Link>
              <CardFooter className="bg-muted/5 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Folders className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {getClientProjectsCount(client.id)} 
                    {getClientProjectsCount(client.id) === 1 ? ' projeto' : ' projetos'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleNewProjectClick(client)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => window.open(`/clients/${client.id}`, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir em nova aba
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleClientActiveStatus(client.id, isClientActive(client))}
                      >
                        {isClientActive(client) ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Marcar como inativo
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Marcar como ativo
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClientClick(client)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir cliente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* List View */}
      {!isLoading && viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="hover:underline">
                        <div className="flex items-center gap-3">
                          <ClientAvatar
                            name={client.name}
                            logo={client.logo}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{client.name}</span>
                              {!isClientActive(client) && (
                                <Badge 
                                  variant="outline" 
                                  className="bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleClientActiveStatus(client.id, isClientActive(client));
                                  }}
                                >
                                  Inativo
                                </Badge>
                              )}
                            </div>
                            {client.shortName && <div className="text-sm text-muted-foreground">{client.shortName}</div>}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {client.type && (
                        <Badge variant="secondary">
                          {CLIENT_TYPE_OPTIONS.find(option => option.value === client.type)?.label || client.type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.website ? (
                        <a 
                          href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-4 w-4 mr-1" />
                          <span className="truncate max-w-[200px]">{client.website}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não informado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getClientProjectsCount(client.id)} 
                      {getClientProjectsCount(client.id) === 1 ? ' projeto' : ' projetos'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{formatCurrency(getClientRevenue(client.id))}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleNewProjectClick(client)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        
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
                                <User className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleClientActiveStatus(client.id, isClientActive(client))}
                            >
                              {isClientActive(client) ? (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Marcar como inativo
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Marcar como ativo
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClientClick(client)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir cliente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {sortedClients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <Building className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Nenhum cliente encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || typeFilter !== "all" 
                    ? "Tente ajustar os filtros ou pesquisar por outro termo."
                    : "Comece adicionando um novo cliente."}
                </p>
                {(searchTerm || typeFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("");
                      setTypeFilter("all");
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Dialog para novo cliente */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações do novo cliente abaixo.
            </DialogDescription>
          </DialogHeader>
          
          {/* Indicador de etapas */}
          <div className="mb-6 w-full flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formStep === 0 ? "bg-primary text-white" : "bg-muted"}`}>1</div>
              <div className={`w-16 h-1 ${formStep >= 1 ? "bg-primary" : "bg-muted"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formStep === 1 ? "bg-primary text-white" : formStep > 1 ? "bg-primary/80 text-white" : "bg-muted"}`}>2</div>
              <div className={`w-16 h-1 ${formStep >= 2 ? "bg-primary" : "bg-muted"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formStep === 2 ? "bg-primary text-white" : "bg-muted"}`}>3</div>
            </div>
          </div>
          
          {/* Título da etapa atual */}
          <div className="text-center mb-4">
            {formStep === 0 && <h3 className="font-medium">Informações Básicas</h3>}
            {formStep === 1 && <h3 className="font-medium">Informações de Contato</h3>}
            {formStep === 2 && <h3 className="font-medium">Endereço e Detalhes Adicionais</h3>}
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Etapa 1: Informações Básicas */}
              {formStep === 0 && (
                <>
                  <div className="mb-4 flex justify-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        {avatarPreview ? (
                          <AvatarImage src={avatarPreview} alt="Preview" />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-primary text-xl">
                            {getInitials(form.watch('name') || "NC")}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="absolute bottom-0 right-0">
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          <div className="bg-primary text-white p-1.5 rounded-full shadow-sm">
                            <Upload className="h-4 w-4" />
                          </div>
                        </label>
                        <input 
                          id="avatar-upload" 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleAvatarUpload}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Cliente*</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Empresa XYZ" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="shortName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome abreviado</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: XYZ" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Cliente*</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
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
                    
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="cnpj"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="00.000.000/0001-00" {...field} />
                              </FormControl>
                              <Button 
                                type="button" 
                                variant="outline"
                                size="icon"
                                disabled={isLookupCnpj}
                                onClick={handleCnpjLookup}
                                className="flex-shrink-0"
                              >
                                {isLookupCnpj ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Search className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="since"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data de início</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: ptBR })
                                    ) : (
                                      <span>Selecione uma data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <DatePickerWithYearNavigation
                                  date={field.value ?? undefined}
                                  setDate={field.onChange}
                                  fromYear={1970}
                                  locale={ptBR}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Etapa 2: Informações de Contato */}
              {formStep === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do contato</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: João Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="contactPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo do contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Gerente de Marketing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email do contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: joao@empresa.com" {...field} />
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
                        <FormLabel>Telefone do contato</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: (11) 98765-4321" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: www.empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Etapa 3: Informações Adicionais */}
              {formStep === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Rua das Flores, 123" {...field} />
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
                          <Input placeholder="Ex: São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Informações adicionais sobre o cliente..." 
                              className="min-h-[100px] resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {/* Navegação entre etapas */}
              <DialogFooter className="flex justify-between">
                {formStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                )}
                
                {formStep < 2 ? (
                  <Button type="button" onClick={handleNextStep} className={formStep === 0 ? "ml-auto" : ""}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={createClientMutation.isPending}
                  >
                    {createClientMutation.isPending ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Criando...
                      </>
                    ) : (
                      "Criar cliente"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para novo projeto */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Projeto para {selectedClient?.name}</DialogTitle>
            <DialogDescription>
              Adicione um novo projeto para este cliente.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-4">
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Projeto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Campanha de Marketing" {...field} />
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
                        className="min-h-[100px] resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={projectForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="on-hold">Em espera</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={projectForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orçamento (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0,00"
                          {...field}
                          onChange={event => field.onChange(
                            event.target.value === '' ? undefined : Number(event.target.value)
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePickerWithYearNavigation
                            date={field.value ?? undefined}
                            setDate={field.onChange}
                            fromYear={1950}
                            locale={ptBR}
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
                      <FormLabel>Data de Término</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePickerWithYearNavigation
                            date={field.value ?? undefined}
                            setDate={field.onChange}
                            fromYear={1950}
                            locale={ptBR}
                            initialFocus
                            disabled={(date) => date < (projectForm.watch('startDate') || new Date())}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Criar projeto
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para confirmação de exclusão */}
      <AlertDialog open={isDeleteClientDialogOpen} onOpenChange={setIsDeleteClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
              <span className="font-semibold"> {selectedClient?.name}</span> e todos os dados associados.
              
              {(deleteItemsCount.projects > 0 || 
                deleteItemsCount.interactions > 0 || 
                deleteItemsCount.financialDocuments > 0) && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-md text-destructive text-sm">
                  <p className="font-medium mb-1">Atenção: Os seguintes itens também serão excluídos:</p>
                  <ul className="list-disc pl-5">
                    {deleteItemsCount.projects > 0 && (
                      <li>{deleteItemsCount.projects} projeto(s)</li>
                    )}
                    {deleteItemsCount.interactions > 0 && (
                      <li>{deleteItemsCount.interactions} interação(ões)</li>
                    )}
                    {deleteItemsCount.financialDocuments > 0 && (
                      <li>{deleteItemsCount.financialDocuments} documento(s) financeiro(s)</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClient && deleteClientMutation.mutate(selectedClient.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Excluindo...
                </>
              ) : (
                "Sim, excluir cliente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
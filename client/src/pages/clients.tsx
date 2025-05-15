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
  Calendar as CalendarIcon,
  User,
  UserPlus,
  Settings,
  Briefcase,
  ExternalLink,
  BarChart,
  Trash2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { showSuccessToast } from "@/lib/utils";

// Schema para validação do formulário
const formSchema = insertClientSchema.extend({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  contactEmail: z.string().email("Email inválido").nullable().optional(),
  since: z.date().nullable().optional(),
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
      since: null, // Data de início do relacionamento com o cliente
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
      
      // Salvar as informações do cliente recém-criado
      const newClientData = {
        id: newClient.id,
        name: newClient.name
      };
      
      // Toast com CTA para criar novo projeto - com timeout para garantir que a função seja chamada corretamente
      showSuccessToast({
        title: "Cliente criado com sucesso",
        description: (
          <div className="flex flex-col gap-2">
            <p>{newClient.name} foi adicionado à sua base de clientes.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full justify-center"
              onClick={() => {
                setTimeout(() => {
                  setSelectedClient(newClientData);
                  setIsNewProjectDialogOpen(true);
                  projectForm.reset({
                    name: "",
                    description: "",
                    client_id: newClientData.id,
                    status: "draft",
                    budget: undefined,
                    startDate: undefined,
                    endDate: undefined,
                    progress: 0,
                    thumbnail: "",
                  });
                }, 100);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar novo projeto para este cliente
            </Button>
          </div>
        ),
        duration: 6000,
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
      showSuccessToast({
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
        
        showSuccessToast({
          title: "CNPJ encontrado",
          description: "Dados da empresa preenchidos automaticamente."
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
      // A data já será tratada pelo schema Zod, não precisamos converter aqui
      since: data.since,
      // Adicionar os segmentos aos dados do cliente
      segments: segmentTags.join(', '),
    };
    createClientMutation.mutate(clientData);
  };

  // Fetch clients com cache otimizado
  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients'],
    staleTime: 5 * 60 * 1000, // 5 minutos de stale time
    gcTime: 10 * 60 * 1000, // 10 minutos de cache time (gcTime substitui cacheTime no TanStack Query v5)
    refetchOnWindowFocus: false // Evita refetches constantes ao focar na janela
  });
  
  // Fetch projects com cache otimizado
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000, // 5 minutos de stale time
    gcTime: 10 * 60 * 1000, // 10 minutos de cache time (gcTime substitui cacheTime no TanStack Query v5)
    refetchOnWindowFocus: false // Evita refetches constantes ao focar na janela
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
    
    return true;
  });

  // Sort clients - implementação corrigida
  const sortedClients = filteredClients ? [...filteredClients].sort((a, b) => {
    if (sortBy === "recent") {
      // Usando created_at ao invés de since para garantir que sempre tenha um valor
      const dateA = a.created_at || a.since || new Date(0);
      const dateB = b.created_at || b.since || new Date(0);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "revenue") {
      const revenueA = getClientRevenue(a.id);
      const revenueB = getClientRevenue(b.id);
      return revenueB - revenueA; // Ordem decrescente
    }
    return 0;
  }) : [];

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
      
      showSuccessToast({
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
        console.error('Erro ao verificar itens relacionados:', error);
        // Abrir diálogo mesmo se não conseguir verificar os itens relacionados
        setDeleteItemsCount({
          projects: 0,
          interactions: 0,
          financialDocuments: 0
        });
        setIsDeleteClientDialogOpen(true);
      });
  };

  // Função para confirmar exclusão do cliente
  const confirmDeleteClient = () => {
    if (selectedClient) {
      deleteClientMutation.mutate(selectedClient.id);
    }
  };

  // Função para exportar dados dos clientes
  const exportToCSV = () => {
    // Código para exportar para CSV usando uma biblioteca como xlsx seria feita aqui
    setIsExportDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header com título e botão de ação principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de clientes e relacionamentos comerciais
          </p>
        </div>
        
        <Button onClick={handleNewClientClick} size="sm" className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>
      
      {/* Barra de filtros e pesquisa - design compacto sem espaços em branco */}
      <Card className="border border-border/50">
        <CardContent className="p-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            {/* Campo de busca compacto */}
            <div className="relative sm:col-span-4 w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-8 h-9 bg-background w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap sm:col-span-8 gap-2 items-center justify-between w-full">
              <div className="flex flex-wrap gap-2 items-center">
                {/* Filtro de tipo mais compacto */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[120px] md:w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {CLIENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Ordenação mais compacta */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 w-[120px] md:w-[140px]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="name">Nome (A-Z)</SelectItem>
                    <SelectItem value="revenue">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Toggle de visualização à direita */}
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}
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
                <div className="space-y-2 mt-4">
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
                <div className="flex justify-between mt-6">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {!isLoading && (!filteredClients || filteredClients.length === 0) && (
        <Card className="border border-dashed">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {searchTerm || typeFilter !== "all" 
                ? "Tente ajustar seus filtros de busca ou limpar a pesquisa."
                : "Comece adicionando seu primeiro cliente para gerenciar relacionamentos e projetos."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {(searchTerm || typeFilter !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              )}
              <Button onClick={handleNewClientClick}>
                <UserPlus className="h-4 w-4 mr-2" />
                {filteredClients?.length === 0 ? "Adicionar cliente" : "Novo cliente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Clients grid view - redesenhado para mobile first */}
      {sortedClients && sortedClients.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {sortedClients.map(client => (
            <Card key={client.id} className="group overflow-hidden border border-border/50 hover:border-primary/30 transition-all relative">
              <Link href={`/clients/${client.id}`} className="absolute inset-0 z-10 cursor-pointer" aria-label={`Ver detalhes de ${client.name}`}></Link>
              
              <div className="absolute top-2 right-2 z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNewProjectClick(client)}>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Novo projeto
                    </DropdownMenuItem>
                    {client.website && (
                      <DropdownMenuItem asChild>
                        <a href={client.website} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visitar site
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteClientClick(client)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <CardHeader className="p-4 pb-0 group-hover:bg-muted/10 transition-colors">
                <div className="flex items-start gap-4">
                  <ClientAvatar 
                    name={client.name}
                    logoUrl={client.logo}
                    size="md"
                    className="mt-1 relative z-20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium truncate group-hover:text-primary transition-colors">
                        {client.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Removido badge de tipo para deixar os cards mais limpos */}
                      {isClientActive(client.id) ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs border-green-200 relative z-20">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs relative z-20">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 pt-3">
                <div className="grid grid-rows-3 gap-1.5 text-sm mt-1 h-[5.5rem]">
                  {/* Informação de contato - sempre mostra, mesmo se vazio */}
                  <div className="flex items-center text-muted-foreground overflow-hidden">
                    <User className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    {client.contactName ? (
                      <span className="truncate">
                        {client.contactName}
                        {client.contactPosition && <span className="ml-1 opacity-70">({client.contactPosition})</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 italic text-xs">Nenhum contato definido</span>
                    )}
                  </div>
                  
                  {/* Email - sempre mostra, mesmo se vazio */}
                  {client.contactEmail ? (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center text-muted-foreground overflow-hidden cursor-pointer">
                          <Mail className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                          <span className="truncate hover:text-primary transition-colors">
                            {client.contactEmail}
                          </span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto p-2">
                        <a 
                          href={`mailto:${client.contactEmail}`} 
                          className="text-sm hover:text-primary transition-colors"
                        >
                          {client.contactEmail}
                        </a>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <div className="flex items-center text-muted-foreground/50 overflow-hidden">
                      <Mail className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      <span className="italic text-xs">Sem email cadastrado</span>
                    </div>
                  )}
                  
                  {/* Endereço - sempre mostra, mesmo se vazio */}
                  {client.address ? (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center text-muted-foreground overflow-hidden cursor-pointer">
                          <MapPin className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {client.address}
                            {client.city && <span className="ml-1">- {client.city}</span>}
                          </span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto p-2">
                        <p className="text-sm">
                          {client.address}
                          {client.city && <span>, {client.city}</span>}
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <div className="flex items-center text-muted-foreground/50 overflow-hidden">
                      <MapPin className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      <span className="italic text-xs">Sem endereço cadastrado</span>
                    </div>
                  )}
                  
                  {/* Telefone - escondido mas mantendo o espaço do layout quando necessário */}
                  {client.contactPhone && (
                    <div className="flex items-center text-muted-foreground overflow-hidden absolute opacity-0">
                      <Phone className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      <span className="truncate">{client.contactPhone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <Separator />
              
              <CardFooter className="p-4 bg-muted/20 flex flex-col gap-3">
                <div className="flex justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      {getClientProjectsCount(client.id)} {getClientProjectsCount(client.id) === 1 ? 'projeto' : 'projetos'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <BarChart className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatCurrency(getClientRevenue(client.id))}
                    </span>
                  </div>
                  
                  {client.since && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatDate(client.since)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="w-full">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full bg-white/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all relative z-20"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Ver detalhes completos
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Clients list view - redesenhado para mobile first */}
      {sortedClients && sortedClients.length > 0 && viewMode === 'list' && (
        <Card className="border border-border/50 overflow-hidden">
          <ScrollArea className="w-full max-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Cliente</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell w-[200px]">Contato</TableHead>
                  <TableHead className="hidden md:table-cell">Endereço</TableHead>
                  <TableHead className="text-center w-[90px]">Projetos</TableHead>
                  <TableHead className="text-right w-[120px]">Faturamento</TableHead>
                  <TableHead className="hidden lg:table-cell w-[100px]">Desde</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map(client => (
                  <TableRow key={client.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <ClientAvatar 
                          name={client.name}
                          logoUrl={client.logo}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link 
                              href={`/clients/${client.id}`}
                              className="font-medium hover:text-primary transition-colors truncate block"
                            >
                              {client.name}
                            </Link>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-5 px-1.5 rounded-sm text-xs font-normal text-primary bg-primary/5 hover:bg-primary/10 hidden sm:flex"
                              onClick={() => navigate(`/clients/${client.id}`)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Detalhes
                            </Button>
                          </div>
                          {isClientActive(client.id) ? (
                            <span className="text-xs text-green-600">● Ativo</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">● Inativo</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={client.type === "Corporate" ? "default" : "secondary"} className="whitespace-nowrap">
                        {client.type}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="hidden sm:table-cell">
                      {client.contactName ? (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{client.contactName}</span>
                          {client.contactEmail && (
                            <a 
                              href={`mailto:${client.contactEmail}`} 
                              className="text-xs text-muted-foreground hover:text-primary truncate block"
                            >
                              {client.contactEmail}
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Não informado</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {client.address ? (
                        <span className="truncate block max-w-[200px]">
                          {client.address}
                          {client.city && <span>, {client.city}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">Não informado</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-muted/50">
                        {getClientProjectsCount(client.id)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getClientRevenue(client.id))}
                    </TableCell>
                    
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {client.since ? formatDate(client.since) : "—"}
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleNewProjectClick(client)}>
                            <Briefcase className="h-4 w-4 mr-2" />
                            Novo projeto
                          </DropdownMenuItem>
                          {client.website && (
                            <DropdownMenuItem asChild>
                              <a href={client.website} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visitar site
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClientClick(client)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
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
      
      {/* Dialog para novo cliente */}
      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Adicionar novo cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações abaixo para adicionar um novo cliente à sua base.
            </DialogDescription>
          </DialogHeader>
          
          {/* Formulário multi-etapas para novo cliente */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 p-1 h-auto">
                  <TabsTrigger value="info" className="py-2">
                    <Building className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Informações básicas</span>
                    <span className="sm:hidden">Básico</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="py-2">
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Contato e endereço</span>
                    <span className="sm:hidden">Contato</span>
                  </TabsTrigger>
                  <TabsTrigger value="extra" className="py-2">
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Configurações adicionais</span>
                    <span className="sm:hidden">Adicional</span>
                  </TabsTrigger>
                </TabsList>
                
                <div className="px-6">
                  <TabsContent value="info" className="space-y-4 mt-0">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="md:w-2/3 space-y-4">
                        {/* Nome do cliente */}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do cliente</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o nome completo do cliente" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Nome abreviado (opcional) */}
                        <FormField
                          control={form.control}
                          name="shortName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome abreviado (opcional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Versão curta do nome para exibição" {...field} />
                              </FormControl>
                              <FormDescription>
                                Utilizado em relatórios e visualizações compactas
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="md:w-1/3 space-y-4">
                        {/* Tipo de cliente */}
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CLIENT_TYPE_OPTIONS.map((option) => (
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
                        
                        {/* CNPJ */}
                        <FormField
                          control={form.control}
                          name="cnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CNPJ</FormLabel>
                              <div className="flex space-x-2">
                                <FormControl>
                                  <Input placeholder="00.000.000/0000-00" {...field} />
                                </FormControl>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="icon"
                                  onClick={handleCnpjLookup}
                                  disabled={isLookupCnpj}
                                >
                                  {isLookupCnpj ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                    </div>
                    
                    {/* Site */}
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.exemplo.com.br" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="button" 
                      onClick={() => form.trigger(['name', 'type']).then(valid => {
                        if (valid) document.querySelector('[data-value="contact"]')?.click();
                      })}
                      className="w-full sm:w-auto"
                    >
                      Próxima etapa
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="contact" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nome do contato */}
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do contato</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do contato principal" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Cargo do contato */}
                      <FormField
                        control={form.control}
                        name="contactPosition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo</FormLabel>
                            <FormControl>
                              <Input placeholder="Cargo ou função" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Email do contato */}
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="email@exemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Telefone do contato */}
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Endereço */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número, complemento, bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Cidade */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Cidade/UF" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => document.querySelector('[data-value="info"]')?.click()}
                      >
                        <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                        Voltar
                      </Button>
                      
                      <Button 
                        type="button"
                        onClick={() => document.querySelector('[data-value="extra"]')?.click()}
                      >
                        Próxima etapa
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="extra" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Logo */}
                      <FormField
                        control={form.control}
                        name="logo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo</FormLabel>
                            <div className="flex items-start space-x-4">
                              <div className="bg-muted p-2 rounded-md">
                                {avatarPreview ? (
                                  <div className="w-20 h-20 rounded-md overflow-hidden">
                                    <img
                                      src={avatarPreview}
                                      alt="Logo Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 flex items-center justify-center rounded-md border-2 border-dashed border-gray-300">
                                    <Upload className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 flex-1">
                                <FormControl>
                                  <Input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload}
                                    className="hidden" 
                                    id="logo-upload"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => document.getElementById('logo-upload')?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {avatarPreview ? "Alterar logo" : "Fazer upload"}
                                </Button>
                                {avatarPreview && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full text-destructive"
                                    onClick={() => {
                                      setAvatarPreview(null);
                                      form.setValue('logo', '');
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Remover logo
                                  </Button>
                                )}
                              </div>
                            </div>
                            <FormDescription>
                              Faça upload de uma imagem JPG, PNG ou SVG (máx. 5MB)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Data de início do relacionamento */}
                      <FormField
                        control={form.control}
                        name="since"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Cliente desde</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "P", { locale: ptBR })
                                    ) : (
                                      <span>Selecione uma data</span>
                                    )}
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <DatePickerWithYearNavigation
                                  mode="single"
                                  selected={field.value as Date}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              Data de início do relacionamento com o cliente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Observações */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Informações adicionais, anotações sobre o cliente..."
                              className="resize-none min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => document.querySelector('[data-value="contact"]')?.click()}
                      >
                        <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                        Voltar
                      </Button>
                      
                      <Button 
                        type="submit"
                        disabled={createClientMutation.isPending}
                      >
                        {createClientMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            Adicionar cliente
                            <UserPlus className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para novo projeto */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Criar novo projeto</DialogTitle>
            <DialogDescription>
              {selectedClient && `Adicionar projeto para o cliente ${selectedClient.name}`}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-6">
              <FormField
                control={projectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do projeto</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do projeto" {...field} />
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
                        placeholder="Descreva os objetivos e escopo do projeto"
                        className="resize-none min-h-[100px]"
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="canceled">Cancelado</SelectItem>
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
                      <FormLabel>Orçamento</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Valor em reais (R$)" 
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={projectForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de início</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "P", { locale: ptBR })
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
                      <FormLabel>Data de entrega</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "P", { locale: ptBR })
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
                            initialFocus
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
                  type="button" 
                  variant="outline"
                  onClick={() => setIsNewProjectDialogOpen(false)}
                >
                  Cancelar
                </Button>
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
                  <ul className="list-disc list-inside pl-1 space-y-1">
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
              onClick={confirmDeleteClient}
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
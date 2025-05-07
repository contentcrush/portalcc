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
      // A data já será tratada pelo schema Zod, não precisamos converter aqui
      since: data.since,
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
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search - com largura reduzida e design mais compacto */}
            <div className="relative w-full md:w-auto md:min-w-[280px] md:max-w-[320px] md:flex-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar clientes..."
                className="pl-8 h-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filtros em linha em dispositivos maiores */}
            <div className="flex flex-wrap gap-2 items-center">
              <Select
                defaultValue="all"
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="h-9 w-full xs:w-[150px] bg-background border border-input">
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
              
              <Select
                defaultValue="recent"
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="h-9 w-full xs:w-[150px] bg-background border border-input">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="revenue">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Toggle de visualização sempre à direita */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as 'grid' | 'list');
              }}
              className="border rounded-md p-0.5 ml-auto"
            >
              <ToggleGroupItem value="grid" aria-label="Visualização em grade" className="h-8 w-9 px-0">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Visualização em lista" className="h-8 w-9 px-0">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {/* Contador de resultados */}
          {!isLoading && filteredClients && (
            <div className="text-sm text-muted-foreground mt-3">
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
              <CardFooter className="flex justify-between bg-muted/20 border-t px-6 py-3">
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
                <div className="h-4 bg-muted rounded animate-pulse w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Grid View */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClients?.map(client => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="group cursor-pointer"
            >
              <Card className="overflow-hidden h-full transition-all border border-border/40 hover:border-primary/20 hover:shadow-md">
                <div className="absolute top-2 right-2 z-30">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${client.id}`);
                      }}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleNewProjectClick(client);
                      }}>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Novo projeto
                      </DropdownMenuItem>
                      {client.website && (
                        <DropdownMenuItem asChild>
                          <a 
                            href={client.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visitar site
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClientClick(client);
                        }} 
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir cliente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <CardHeader className="p-4 pb-2 group-hover:bg-muted/5 transition-colors">
                  <div className="flex items-start gap-3">
                    <ClientAvatar 
                      name={client.name}
                      logoUrl={client.logo}
                      size="md"
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-medium truncate group-hover:text-primary transition-colors">
                        {client.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={client.type === "Corporate" ? "default" : "secondary"} className="text-xs">
                          {client.type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${isClientActive(client) 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-gray-50 text-gray-700 border-gray-200"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleClientActiveStatus(client.id, isClientActive(client));
                          }}
                        >
                          {isClientActive(client) ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 pt-2">
                  <div className="space-y-2 mt-2 h-[5.5rem]">
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
                    <div className="flex items-center text-muted-foreground overflow-hidden">
                      <Mail className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      {client.contactEmail ? (
                        <span className="truncate hover:text-primary transition-colors">
                          {client.contactEmail}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 italic text-xs">Sem email cadastrado</span>
                      )}
                    </div>
                    
                    {/* Endereço - sempre mostra, mesmo se vazio */}
                    <div className="flex items-center text-muted-foreground overflow-hidden">
                      <MapPin className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      {client.address ? (
                        <span className="truncate">
                          {client.address}
                          {client.city && <span className="ml-1">- {client.city}</span>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 italic text-xs">Sem endereço cadastrado</span>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <Separator />
                
                <CardFooter className="p-4 bg-muted/10 hover:bg-muted/20 transition-colors flex flex-row justify-between items-center">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">
                        {getClientProjectsCount(client.id)} projeto{getClientProjectsCount(client.id) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <BarChart className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatCurrency(getClientRevenue(client.id))}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <ArrowUpRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      )}
      
      {/* List View */}
      {!isLoading && viewMode === 'list' && (
        <Card className="border border-border/40 shadow-sm">
          <ScrollArea className="h-[calc(100vh-270px)] w-full">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients?.map(client => (
                  <TableRow 
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/20"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell className="font-medium min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <ClientAvatar name={client.name} logoUrl={client.logo} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]">
                            {client.name}
                          </span>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="w-fit text-xs">
                              {client.type}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`w-fit text-xs cursor-pointer hover:opacity-80 transition-opacity ${isClientActive(client) 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-gray-50 text-gray-700 border-gray-200"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleClientActiveStatus(client.id, isClientActive(client));
                              }}
                            >
                              {isClientActive(client) ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] min-w-[200px]">
                      {client.contactName ? (
                        <div className="flex flex-col">
                          <span className="truncate">{client.contactName}</span>
                          {client.contactEmail && (
                            <span className="text-xs text-muted-foreground truncate">
                              {client.contactEmail}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs italic">
                          Sem contato definido
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getClientProjectsCount(client.id)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(getClientRevenue(client.id))}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/clients/${client.id}`);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleNewProjectClick(client);
                          }}>
                            <Briefcase className="h-4 w-4 mr-2" />
                            Novo projeto
                          </DropdownMenuItem>
                          {client.website && (
                            <DropdownMenuItem asChild>
                              <a href={client.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visitar site
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClientClick(client);
                          }} className="text-destructive focus:text-destructive">
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha as informações do novo cliente abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                {formStep > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-0 top-0 flex items-center p-0 h-auto font-normal"
                    onClick={handlePrevStep}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                )}
                
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
                
                {formStep === 1 && (
                  <>
                    <h3 className="font-medium text-center mb-4">Informações de Contato</h3>
                    
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
                  </>
                )}
                
                {formStep === 2 && (
                  <>
                    <h3 className="font-medium text-center mb-4">Endereço e Detalhes Adicionais</h3>
                    
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
                  </>
                )}
              </div>
              
              <DialogFooter>
                {formStep < 2 ? (
                  <Button type="button" onClick={handleNextStep}>
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
                      "Adicionar Cliente"
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
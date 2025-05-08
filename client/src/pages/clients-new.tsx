import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { insertClientSchema, insertProjectSchema, type InsertClient, type InsertProject, type Client, type Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getInitials, cn, formatCurrency } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  LayoutGrid,
  List,
  CircleDollarSign,
  Activity,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Image,
  ArrowRight,
  Calendar as CalendarIcon,
  User,
  Check,
  Upload,
  Briefcase,
  BarChart,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerWithYearNavigation } from "@/components/ui/calendar";
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
  since: z.date().nullable().optional(),
});

// Schema para validação do formulário de projeto
const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(2, "Nome do projeto deve ter pelo menos 2 caracteres"),
});

// Utilitários para campos nulos
const getSafeFieldProps = (field: any) => ({
  value: field.value ?? '',
  onChange: field.onChange,
  onBlur: field.onBlur,
  name: field.name,
  ref: field.ref,
});

const getSafeNumberFieldProps = (field: any) => ({
  value: field.value ?? '',
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    field.onChange(value);
  },
  onBlur: field.onBlur,
  name: field.name,
  ref: field.ref,
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
  const [deleteItemsCount, setDeleteItemsCount] = useState<{
    projects: number;
    interactions: number;
    financialDocuments: number;
  }>({ projects: 0, interactions: 0, financialDocuments: 0 });
  
  // Estados do formulário de novo cliente
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formStep, setFormStep] = useState<number>(0);
  const [isLookupCnpj, setIsLookupCnpj] = useState(false);
  
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Formulário para novo cliente
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
      logo: "",
      since: null,
      active: true,
      segments: [],
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
      startDate: null,
      endDate: null,
    },
  });

  // Query para carregar clientes
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Query para carregar projetos
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const res = await apiRequest('POST', '/api/clients', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsNewClientDialogOpen(false);
      toast({
        title: "Cliente criado com sucesso",
        description: `O cliente ${form.getValues().name} foi adicionado.`,
      });
      form.reset();
      setFormStep(0);
      setAvatarPreview(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest('POST', '/api/projects', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsNewProjectDialogOpen(false);
      toast({
        title: "Projeto criado com sucesso",
        description: `O projeto ${projectForm.getValues().name} foi adicionado.`,
      });
      projectForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleActiveStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest('PATCH', `/api/clients/${id}`, { active });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: data.active ? "Cliente ativado" : "Cliente desativado",
        description: `${data.name} foi ${data.active ? "ativado" : "desativado"} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/clients/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsDeleteClientDialogOpen(false);
      toast({
        title: "Cliente excluído",
        description: `${selectedClient?.name} foi excluído com sucesso.`,
      });
      setSelectedClient(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Manipuladores de eventos
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createClientMutation.mutate(data as InsertClient);
  };

  const onProjectSubmit = (data: z.infer<typeof projectFormSchema>) => {
    if (selectedClient) {
      const projectData: InsertProject = {
        ...data,
        client_id: selectedClient.id,
      };
      createProjectMutation.mutate(projectData);
    }
  };

  const handleCnpjLookup = () => {
    const cnpj = form.getValues('cnpj');
    if (!cnpj) return;
    
    setIsLookupCnpj(true);
    
    // Simulação de busca de CNPJ (implementação real seria com API)
    setTimeout(() => {
      setIsLookupCnpj(false);
      toast({
        title: "CNPJ consultado",
        description: "Dados da empresa preenchidos automaticamente.",
      });
    }, 1500);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Apenas para demonstração - em produção, faria upload para servidor
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
    
    // Validar campos da etapa 2
    if (formStep === 1) {
      if (currentValues.contactEmail) {
        const isValid = form.trigger('contactEmail');
        if (!isValid) return;
      }
    }
    
    setFormStep((prev) => Math.min(prev + 1, 2));
  };

  const handlePrevStep = () => {
    setFormStep((prev) => Math.max(prev - 1, 0));
  };

  // Filtragem e ordenação
  const filteredClients = clients?.filter((client: Client) => {
    // Filtro por termo de busca
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          client.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.cnpj?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por tipo
    const matchesType = typeFilter === 'all' || client.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const sortedClients = filteredClients?.sort((a: Client, b: Client) => {
    if (sortBy === 'recent') {
      return (b.id || 0) - (a.id || 0);
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'revenue') {
      const revenueA = getClientTotalRevenue(a.id);
      const revenueB = getClientTotalRevenue(b.id);
      return revenueB - revenueA;
    } else {
      return 0;
    }
  });

  // Auxiliares
  const isClientActive = (client: Client) => {
    return client.active !== false; // Caso a propriedade não exista, assume true
  };

  const getClientProjectsCount = (clientId: number) => {
    if (!projects) return 0;
    return projects.filter((project: Project) => project.client_id === clientId).length;
  };

  const getClientTotalRevenue = (clientId: number) => {
    if (!projects) return 0;
    return projects
      .filter((project: Project) => project.client_id === clientId)
      .reduce((total: number, project: Project) => total + (project.budget || 0), 0);
  };

  const handleOpenProjectDialog = (client: { id: number; name: string }) => {
    setSelectedClient(client);
    setIsNewProjectDialogOpen(true);
    projectForm.reset({
      name: "",
      description: "",
      client_id: client.id,
      status: "draft",
      budget: undefined,
      startDate: null,
      endDate: null,
    });
  };

  const handleOpenDeleteDialog = (client: { id: number; name: string }) => {
    setSelectedClient(client);
    setIsDeleteClientDialogOpen(true);
    
    // Simulação de contagem de itens a excluir
    setDeleteItemsCount({
      projects: getClientProjectsCount(client.id),
      interactions: Math.floor(Math.random() * 5),
      financialDocuments: Math.floor(Math.random() * 3)
    });
  };

  return (
    <div className="container p-4 mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e projetos associados
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => setIsNewClientDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
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
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="revenue">Maior receita</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted rounded-t-lg" />
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded-md mb-4 w-3/4" />
                <div className="h-4 bg-muted rounded-md mb-2 w-1/2" />
                <div className="h-4 bg-muted rounded-md mb-2 w-2/3" />
                <div className="h-4 bg-muted rounded-md w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedClients?.map((client: Client) => (
            <Card key={client.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <ClientAvatar client={client} size="md" />
                    <div>
                      <CardTitle className="text-lg font-semibold truncate max-w-[200px]">
                        {client.name}
                      </CardTitle>
                      <CardDescription>
                        {CLIENT_TYPE_OPTIONS.find(opt => opt.value === client.type)?.label || 'Cliente'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={isClientActive(client) ? "outline" : "secondary"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      !isClientActive(client) && "hover:bg-primary hover:text-primary-foreground"
                    )}
                    onClick={() => toggleActiveStatusMutation.mutate({ 
                      id: client.id, 
                      active: !isClientActive(client) 
                    })}
                  >
                    {isClientActive(client) ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Briefcase className="h-3 w-3 mr-1" />
                      Projetos
                    </div>
                    <p className="font-medium">
                      {getClientProjectsCount(client.id) || "Nenhum"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <CircleDollarSign className="h-3 w-3 mr-1" />
                      Receita
                    </div>
                    <p className="font-medium">
                      {formatCurrency(getClientTotalRevenue(client.id))}
                    </p>
                  </div>
                  {client.contactEmail && (
                    <div className="space-y-1 col-span-2">
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </div>
                      <p className="font-medium text-sm truncate">
                        {client.contactEmail}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-3 bg-muted/30 flex justify-between gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  Detalhes
                </Button>
                <Button 
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenProjectDialog(client)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Projeto
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 p-3 bg-muted font-medium text-sm">
            <div className="col-span-5">Cliente</div>
            <div className="col-span-2 text-center">Tipo</div>
            <div className="col-span-2 text-center">Projetos</div>
            <div className="col-span-2 text-center">Receita</div>
            <div className="col-span-1 text-right">Ações</div>
          </div>
          <div className="divide-y">
            {sortedClients?.map((client: Client) => (
              <div key={client.id} className="grid grid-cols-12 p-3 items-center hover:bg-muted/30 transition-colors">
                <div className="col-span-5">
                  <div className="flex items-center space-x-3">
                    <ClientAvatar client={client} size="sm" />
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-muted-foreground">{client.shortName || client.cnpj || "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <Badge variant="outline">
                    {CLIENT_TYPE_OPTIONS.find(opt => opt.value === client.type)?.label || 'Cliente'}
                  </Badge>
                </div>
                <div className="col-span-2 text-center">{getClientProjectsCount(client.id) || "—"}</div>
                <div className="col-span-2 text-center">{formatCurrency(getClientTotalRevenue(client.id))}</div>
                <div className="col-span-1 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/clients/${client.id}`)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sheet para novo cliente (melhor experiência mobile) */}
      <Sheet open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[95svh] sm:h-[90svh] rounded-t-xl border-t border-border p-0"
        >
          <div className="flex flex-col h-full">
            <SheetHeader className="sticky top-0 z-20 bg-background pb-2 pt-0 px-6 shadow-sm">
              <div className="flex justify-center items-center -mt-1 mb-1">
                <div className="h-1.5 w-16 bg-muted rounded-full" />
              </div>
              <SheetTitle className="text-xl font-semibold">Novo Cliente</SheetTitle>
              <SheetDescription className="text-sm">
                Fluxo rápido para cadastro de cliente
              </SheetDescription>
              <div className="w-full flex justify-center my-3">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "flex items-center justify-center h-6 w-6 rounded-full border transition-colors text-xs font-medium",
                    formStep === 0 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : formStep > 0 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-muted bg-muted/50 text-muted-foreground"
                  )}>1</div>
                  <div className={cn("h-px w-4 transition-colors", 
                    formStep > 0 ? "bg-primary" : "bg-muted"
                  )} />
                  <div className={cn(
                    "flex items-center justify-center h-6 w-6 rounded-full border transition-colors text-xs font-medium",
                    formStep === 1 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : formStep > 1 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-muted bg-muted/50 text-muted-foreground"
                  )}>2</div>
                  <div className={cn("h-px w-4 transition-colors", 
                    formStep > 1 ? "bg-primary" : "bg-muted"
                  )} />
                  <div className={cn(
                    "flex items-center justify-center h-6 w-6 rounded-full border transition-colors text-xs font-medium",
                    formStep === 2 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : "border-muted bg-muted/50 text-muted-foreground"
                  )}>3</div>
                </div>
              </div>
            </SheetHeader>
            
            <div className="overflow-y-auto flex-1 pb-24">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-2" id="client-form">
                  <div className="relative mt-1">
                    {formStep > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -left-2 -top-1 flex items-center p-1 h-8 rounded-full"
                        onClick={handlePrevStep}
                      >
                        <ChevronLeft className="h-5 w-5" />
                        <span className="ml-1 text-sm">Voltar</span>
                      </Button>
                    )}
                  
                    {formStep === 0 && (
                      <>
                        <div className="mb-6 flex justify-center">
                          <div className="relative">
                            <Avatar className="h-28 w-28">
                              {avatarPreview ? (
                                <AvatarImage src={avatarPreview} alt="Preview" />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                                  {getInitials(form.watch('name') || "NC")}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="absolute bottom-0 right-0">
                              <label htmlFor="avatar-upload" className="cursor-pointer">
                                <div className="bg-primary text-white p-2 rounded-full shadow-sm">
                                  <Upload className="h-5 w-5" />
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
                        
                        <div className="space-y-5">
                          <div>
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Nome do Cliente*</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ex: Empresa XYZ" 
                                      className="h-12 text-base" 
                                      {...getSafeFieldProps(field)} 
                                      autoFocus
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="cnpj"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">CNPJ/CPF</FormLabel>
                                  <div className="flex gap-2">
                                    <FormControl>
                                      <Input 
                                        placeholder="00.000.000/0001-00" 
                                        className="h-12 text-base" 
                                        {...getSafeFieldProps(field)}
                                      />
                                    </FormControl>
                                    <Button 
                                      type="button" 
                                      variant="outline"
                                      size="icon"
                                      disabled={isLookupCnpj}
                                      onClick={handleCnpjLookup}
                                      className="flex-shrink-0 h-12 w-12"
                                    >
                                      {isLookupCnpj ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                      ) : (
                                        <Search className="h-5 w-5" />
                                      )}
                                    </Button>
                                  </div>
                                  <FormDescription className="text-xs">
                                    Digite o CNPJ e pressione Enter ou clique no botão de busca
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="shortName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Nome abreviado</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Nome que aparecerá no dashboard" 
                                      className="h-12 text-base" 
                                      {...getSafeFieldProps(field)} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Tipo de Cliente*</FormLabel>
                                  <Select
                                    value={field.value || ''}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-12 text-base">
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
                          </div>
                        </div>
                      </>
                    )}
                    
                    {formStep === 1 && (
                      <>
                        <h3 className="font-medium text-lg text-center mb-5 mt-1">Contato Principal</h3>
                        
                        <div className="space-y-5">
                          <div>
                            <FormField
                              control={form.control}
                              name="contactEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Email de contato*</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ex: contato@empresa.com" 
                                      className="h-12 text-base"
                                      type="email"
                                      {...getSafeFieldProps(field)} 
                                      autoFocus
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="contactName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Nome do contato</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ex: João Silva" 
                                      className="h-12 text-base" 
                                      {...getSafeFieldProps(field)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="contactPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Telefone</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ex: (11) 98765-4321" 
                                      className="h-12 text-base"
                                      {...getSafeFieldProps(field)} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="website"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Website</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ex: www.empresa.com" 
                                      className="h-12 text-base"
                                      {...getSafeFieldProps(field)} 
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
                    
                    {formStep === 2 && (
                      <>
                        <h3 className="font-medium text-lg text-center mb-5 mt-1">Detalhes Adicionais</h3>
                        
                        <div className="space-y-5">
                          <div>
                            <FormField
                              control={form.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Endereço</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ex: Rua das Flores, 123" 
                                      className="h-12 text-base"
                                      {...getSafeFieldProps(field)} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Cidade</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Ex: São Paulo" 
                                      className="h-12 text-base"
                                      {...getSafeFieldProps(field)} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="since"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="text-base font-medium">Data de início</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "h-12 text-base px-3 text-left font-normal justify-between",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value ? (
                                            format(field.value, "PPP", { locale: ptBR })
                                          ) : (
                                            <span>Selecione uma data</span>
                                          )}
                                          <CalendarIcon className="h-5 w-5 opacity-50" />
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
                          
                          <div>
                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Observações</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Informações adicionais sobre o cliente"
                                      className="h-24 text-base resize-none"
                                      {...getSafeFieldProps(field)}
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
                </form>
              </Form>
            </div>
            
            <div className="px-6 pb-8 pt-3 sticky bottom-0 bg-background z-20 border-t">
              {formStep < 2 ? (
                <Button 
                  type="button" 
                  onClick={handleNextStep}
                  className="w-full h-14 text-base font-medium"
                >
                  Avançar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  form="client-form"
                  disabled={createClientMutation.isPending}
                  className="w-full h-14 text-base font-medium"
                >
                  {createClientMutation.isPending ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Criar Cliente
                    </>
                  )}
                </Button>
              )}
              
              {formStep === 0 && (
                <div className="text-xs text-center text-muted-foreground mt-2">
                  Apenas nome, tipo e e-mail são obrigatórios
                </div>
              )}
              
              {formStep === 2 && (
                <div className="text-xs text-center text-muted-foreground mt-2">
                  Pressione ⌘/Ctrl + Enter para criar rapidamente
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
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
                      <Input placeholder="Ex: Campanha de Marketing" {...getSafeFieldProps(field)} />
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
                        {...getSafeFieldProps(field)} 
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
                          {...getSafeNumberFieldProps(field)}
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
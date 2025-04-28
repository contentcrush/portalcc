import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { insertProjectSchema, type InsertProject } from "@shared/schema";
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
  X,
  Globe,
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
import { formatDate, getInitials, generateAvatarColor } from "@/lib/utils";
import { CLIENT_TYPE_OPTIONS, CLIENT_CATEGORY_OPTIONS } from "@/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Formulário para novo cliente
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      shortName: "",
      type: "",
      category: "",
      cnpj: "",
      website: "",
      contactName: "",
      contactPosition: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      notes: "",
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
      form.reset();
      toast({
        title: "Cliente criado com sucesso",
        description: `${newClient.name} foi adicionado à sua base de clientes.`,
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

  // Função para submeter o formulário
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Convertendo valores para o formato esperado pela API
    const clientData: InsertClient = {
      ...data,
      // Não enviar o campo since para deixar o servidor usar o defaultNow()
      since: undefined,
    };
    createClientMutation.mutate(clientData);
  };

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
    
    // Removido filtro de categoria
    
    return true;
  });

  // Sort clients
  const sortedClients = filteredClients?.sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime();
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const handleNewClientClick = () => {
    setIsNewClientDialogOpen(true);
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
          <Button onClick={handleNewClientClick}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      )}
      
      {/* Clients grid */}
      {sortedClients && sortedClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedClients.map(client => (
            <Card key={client.id} className="overflow-hidden hover:shadow-md transition-shadow">
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
                        <DropdownMenuItem asChild>
                          <Link href={`/projects?client_id=${client.id}&action=new`}>
                            Novo projeto
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}?tab=interactions&new=true`}>
                            Nova interação
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  <Link href={`/projects?client_id=${client.id}&action=new`} className="flex-1">
                    <Button variant="ghost" className="w-full rounded-none py-2">
                      Novo projeto
                    </Button>
                  </Link>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Informações básicas */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-sm font-semibold uppercase text-gray-500">
                    Informações Básicas
                  </h3>
                  
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Cliente</FormLabel>
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CLIENT_CATEGORY_OPTIONS.map(option => (
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
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Informações de Contato */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-sm font-semibold uppercase text-gray-500">
                    Informações de Contato
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
                
                {/* Endereço e Detalhes */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-sm font-semibold uppercase text-gray-500">
                    Endereço e Detalhes
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
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewClientDialogOpen(false)}
                >
                  Cancelar
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
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

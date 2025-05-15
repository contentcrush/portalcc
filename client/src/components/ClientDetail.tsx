import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDate, formatCurrency, getInitials, calculatePercentChange, cn, showSuccessToast, formatDateWithTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ImageUpload } from "@/components/ui/image-upload";
import ClientContacts from "@/components/ClientContacts";
import { 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  CalendarClock, 
  Plus, 
  FileText,
  Download,
  Eye,
  Filter,
  ChevronLeft,
  ArrowLeft,
  Trash2,
  Users,
  ListTodo,
  CalendarCheck,
  CheckSquare
} from "lucide-react";
import type { ClientWithDetails } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";

import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "./UserAvatar";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertClientSchema, insertProjectSchema, type InsertClient, type InsertProject } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CLIENT_TYPE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import RecentDocuments from "@/components/RecentDocuments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, DatePickerWithYearNavigation } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
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

interface ClientDetailProps {
  clientId: number;
}

export default function ClientDetail({ clientId }: ClientDetailProps) {
  const [activeTab, setActiveTab] = useState("contacts");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Otimização de cache para detalhes do cliente
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (gcTime substitui cacheTime no TanStack Query v5)
    refetchOnWindowFocus: false
  });

  // Usando o cache efetivamente para dados relacionados
  const { data: projects } = useQuery({
    queryKey: [`/api/clients/${clientId}/projects`],
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (gcTime substitui cacheTime no TanStack Query v5)
    refetchOnWindowFocus: false
  });

  // Definindo variável para uso em outros lugares (como estatísticas de exclusão)
  const interactions = { length: 0 };
  
  // Tarefas relacionadas aos projetos do cliente
  const { data: clientTasks } = useQuery({
    queryKey: [`/api/clients/${clientId}/tasks`],
    enabled: !!clientId,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false
  });

  // Dados financeiros - carregados sob demanda conforme necessário
  const { data: financialDocuments } = useQuery({
    queryKey: [`/api/clients/${clientId}/financial-documents`],
    enabled: !!clientId && activeTab === "financial", // Só carrega quando a tab estiver ativa
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos (gcTime substitui cacheTime no TanStack Query v5)
  });
  
  // Mutation para completar tarefa
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      // Atualize o cache das tarefas do cliente
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/tasks`] });
      // Atualize também a lista global de tarefas
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      showSuccessToast(toast, "Tarefa concluída com sucesso");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao concluir tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Função para completar tarefa
  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };

  // Usuários são dados globais menos alterados - cache mais longo
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos (gcTime substitui cacheTime no TanStack Query v5)
    refetchOnWindowFocus: false
  });
  
  // Schema para validação do formulário de cliente
  const formSchema = insertClientSchema.extend({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    contactEmail: z.string().email("Email inválido").nullable().optional(),
  });

  // Schema para validação do formulário de projeto
  const projectFormSchema = insertProjectSchema.extend({
    name: z.string().min(2, "Nome do projeto deve ter pelo menos 2 caracteres"),
  });
  
  // Estado para preview de imagem
  const [logoPreview, setLogoPreview] = useState<string | null>(client?.logo || null);
  
  // Formulário para edição de cliente
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: client?.name || "",
      shortName: client?.shortName || "",
      type: client?.type || "",
      cnpj: client?.cnpj || "",
      website: client?.website || "",
      contactName: client?.contactName || "",
      contactPosition: client?.contactPosition || "",
      contactEmail: client?.contactEmail || "",
      contactPhone: client?.contactPhone || "",
      address: client?.address || "",
      city: client?.city || "",
      notes: client?.notes || "",
      logo: client?.logo || "",
    }
  });
  
  // Formulário para novo projeto
  const projectForm = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      client_id: clientId,
      status: "draft",
      budget: undefined,
      startDate: undefined,
      endDate: undefined,
      progress: 0,
      thumbnail: "",
    },
  });
  
  // Mutation para atualizar cliente
  const updateClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const response = await apiRequest("PATCH", `/api/clients/${clientId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsEditDialogOpen(false);
      showSuccessToast({
        title: "Cliente atualizado com sucesso",
        description: "As informações do cliente foram atualizadas."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro ao atualizar o cliente.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation para criar novo projeto
  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return await response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/projects`] });
      setIsNewProjectDialogOpen(false);
      projectForm.reset();
      showSuccessToast({
        title: "Projeto criado com sucesso",
        description: `${newProject.name} foi criado para o cliente ${client?.name}.`,
      });
      // Permanecer na página atual para ver o projeto na lista
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message || "Ocorreu um erro ao criar o projeto. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation para excluir cliente
  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/clients/${clientId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao excluir cliente");
      }
      
      try {
        return await response.json();
      } catch (error) {
        console.log('Resposta não contém JSON válido:', error);
        return { deletedItems: { projects: 0, interactions: 0, financialDocuments: 0 } };
      }
    },
    onSuccess: (data) => {
      const { deletedItems } = data;
      
      // Garantir que deletedItems existe, caso contrário, usar valores padrão
      const projects = deletedItems?.projects || 0;
      const interactions = deletedItems?.interactions || 0;
      const financialDocuments = deletedItems?.financialDocuments || 0;
      
      showSuccessToast({
        title: "Cliente excluído com sucesso",
        description: `Foram excluídos: ${projects} projeto(s), ${interactions} interação(ões) e ${financialDocuments} documento(s) financeiro(s) relacionados a este cliente.`,
        duration: 5000,
      });
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Redirecionar para a lista de clientes
      navigate('/clients');
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Ocorreu um erro ao excluir o cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Função para submeter o formulário de edição de cliente
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Converter valores para o formato esperado pela API
    const clientData: InsertClient = {
      ...data,
      // Incluir o campo since para atualizar a data
      // Incluir o logo
      logo: logoPreview
    };
    updateClientMutation.mutate(clientData);
  };
  
  // Função para submeter o formulário de criação de projeto
  const onProjectSubmit = (data: z.infer<typeof projectFormSchema>) => {
    // Converter valores para o formato esperado pela API
    const projectData: InsertProject = {
      ...data,
      client_id: clientId,
    };
    createProjectMutation.mutate(projectData);
  };
  
  // Função para abrir o dialog de edição preenchendo os valores do formulário
  const handleEditClick = () => {
    if (client) {
      form.reset({
        name: client.name || "",
        shortName: client.shortName || "",
        type: client.type || "",
        cnpj: client.cnpj || "",
        website: client.website || "",
        contactName: client.contactName || "",
        contactPosition: client.contactPosition || "",
        contactEmail: client.contactEmail || "",
        contactPhone: client.contactPhone || "",
        address: client.address || "",
        city: client.city || "",
        notes: client.notes || "",
        logo: client.logo || "",
        since: client.since || null,
      });
      setLogoPreview(client.logo || null);
      setIsEditDialogOpen(true);
    }
  };

  if (isLoadingClient) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium">Cliente não encontrado</h3>
        <p className="text-muted-foreground">O cliente solicitado não existe ou foi removido.</p>
      </div>
    );
  }

  // Calculate financial metrics
  const totalRevenue = financialDocuments?.reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
  const paidRevenue = financialDocuments?.filter(doc => doc.paid)
    .reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
  const pendingRevenue = totalRevenue - paidRevenue;
  
  const percentPaidRevenue = totalRevenue > 0 
    ? Math.round((paidRevenue / totalRevenue) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Cliente</h1>
          <p className="text-sm text-gray-500">Visualizando informações completas do cliente</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/clients')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handleEditClick}>
            <FileText className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button className="bg-primary" onClick={() => setIsNewProjectDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client info section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 md:items-center mb-6">
                <Avatar className="w-16 h-16">
                  {client.logo ? (
                    <AvatarImage 
                      src={client.logo} 
                      alt={client.name}
                      onError={(e) => {
                        console.log("Erro ao carregar logo:", client.logo);
                        e.currentTarget.style.display = 'none';
                      }} 
                    />
                  ) : null}
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-semibold">
                    {getInitials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{client.name}</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>Cliente desde {formatDate(client.since)}</span>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                INFORMAÇÕES DE CONTATO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contato Principal</p>
                    <p className="font-medium">{client.contactName || 'Não informado'}</p>
                    <p className="text-sm text-gray-500">{client.contactPosition || ''}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{client.contactEmail || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium">{client.contactPhone || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Endereço</p>
                    <p className="font-medium">{client.address || 'Não informado'}</p>
                    <p className="text-sm text-gray-500">{client.city || ''}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">
                DADOS ADICIONAIS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo de Cliente</p>
                    <p className="font-medium">{client.type || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cliente desde</p>
                    <p className="font-medium">
                      {client.since 
                        ? formatDate(client.since) 
                        : 'Não informado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CNPJ</p>
                    <p className="font-medium">{client.cnpj || 'Não informado'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="mr-3 mt-1 text-gray-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <p className="font-medium">
                      {client.website ? (
                        <a href={`https://${client.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {client.website}
                        </a>
                      ) : 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>

              {client.notes && (
                <>
                  <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">
                    NOTAS
                  </h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200">
                    {client.notes}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Projects section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Projetos</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => navigate('/projects')}
                  >
                    Ver todos os projetos
                  </Button>
                  <Button 
                    variant="default"
                    size="sm" 
                    className="text-xs flex items-center"
                    onClick={() => setIsNewProjectDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Novo Projeto
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PROJETO</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>PRAZO</TableHead>
                    <TableHead className="text-right">VALOR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects?.length > 0 ? (
                    projects.map(project => (
                      <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/projects/${project.id}`)}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <StatusBadge status={project.status} small={true} />
                        </TableCell>
                        <TableCell>{formatDate(project.endDate)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.budget)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhum projeto encontrado para este cliente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="contacts">
                <Users className="h-4 w-4 mr-2" />
                Contatos
              </TabsTrigger>
              <TabsTrigger value="financial">Documentos Financeiros</TabsTrigger>
            </TabsList>
            
            <TabsContent value="contacts" className="space-y-4">
              <ClientContacts clientId={clientId} clientName={client.name} />
            </TabsContent>
            
            <TabsContent value="financial">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Documentos Financeiros</h3>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DOCUMENTO</TableHead>
                    <TableHead>PROJETO</TableHead>
                    <TableHead>DATA</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">VALOR</TableHead>
                    <TableHead className="text-right">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialDocuments?.length > 0 ? (
                    financialDocuments.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`p-1 rounded mr-2 ${doc.document_type === 'invoice' ? 'bg-red-100 text-red-600' : doc.document_type === 'contract' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{doc.document_number}</div>
                              <div className="text-xs text-muted-foreground">
                                {doc.document_type === 'invoice' ? 'Fatura' : 
                                 doc.document_type === 'contract' ? 'Contrato' : 
                                 doc.document_type === 'proposal' ? 'Proposta' : 'Recibo'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{projects?.find(p => p.id === doc.project_id)?.name || '-'}</TableCell>
                        <TableCell>{formatDate(doc.due_date)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              doc.status === 'pago' ? 'success' : 
                              doc.status === 'pendente' ? 'warning' : 
                              'secondary'
                            }
                            className="capitalize"
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(doc.amount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Nenhum documento financeiro encontrado para este cliente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* KPIs */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Projetos Totais</p>
                  <div className="mt-1 flex items-center">
                    <span className="text-2xl font-bold">{projects?.length || 0}</span>
                    {projects?.length > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">
                        +{projects.filter(p => p.creation_date && new Date(p.creation_date) > new Date(new Date().setMonth(new Date().getMonth() - 3))).length} nos últimos 3 meses
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Valor Faturado</p>
                  <div className="mt-1">
                    <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                    <div className="text-xs text-green-600">
                      + 30% vs anterior
                    </div>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Tempo de Retenção</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold">
                      {client.since ? (
                        `${Math.max(0, Math.floor(
                          (new Date().getTime() - new Date(client.since).getTime()) / (1000 * 60 * 60 * 24 * 30)
                        ) / 12).toFixed(1)} anos`
                      ) : 'N/A'}
                    </span>
                    {client.since && (
                      <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-600">
                        Cliente desde {format(new Date(client.since), 'MMM yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">Status Financeiro</p>
                  <Badge variant="outline">{formatCurrency(pendingRevenue)} a receber</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentPaidRevenue}%` }}></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{formatCurrency(paidRevenue)} pago</span>
                  <span>{percentPaidRevenue}% do total</span>
                </div>
              </div>
            </CardContent>
          </Card>
          

          
          {/* Próximas Reuniões */}
          <Card className="overflow-hidden">
            <CardHeader className="py-5 px-6">
              <CardTitle className="text-lg font-semibold text-gray-700">
                PRÓXIMAS REUNIÕES
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 px-6 pb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-semibold">Amanhã, 14:00</p>
                  <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-medium bg-white">
                    20 min
                  </Badge>
                </div>
                <div className="flex items-start mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-base font-semibold">Apresentação do Storyboard</p>
                </div>
                <div className="flex items-center ml-5">
                  <img 
                    src="https://randomuser.me/api/portraits/men/32.jpg" 
                    alt="Responsável" 
                    className="w-6 h-6 rounded-full mr-2" 
                  />
                  <span className="text-sm text-gray-600">RM: Ricardo Mendes</span>
                  <span className="ml-3 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600">Zoom</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-semibold">26/04, 15:30</p>
                  <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-medium bg-white">
                    1h
                  </Badge>
                </div>
                <div className="flex items-start mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-base font-semibold">Aprovação Final - Cartão Premium</p>
                </div>
                <div className="flex items-center ml-5">
                  <img 
                    src="https://randomuser.me/api/portraits/men/32.jpg" 
                    alt="Responsável" 
                    className="w-6 h-6 rounded-full mr-2" 
                  />
                  <span className="text-sm text-gray-600">BA: Banco Azul</span>
                  <span className="ml-3 px-2 py-0.5 rounded text-xs bg-green-100 text-green-600">Presencial</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarefas Pendentes */}
          <Card className="overflow-hidden">
            <CardHeader className="py-5 px-6">
              <CardTitle className="text-lg font-semibold text-gray-700 flex items-center">
                <ListTodo className="h-5 w-5 mr-2 text-blue-500" />
                TAREFAS PENDENTES
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              {Array.isArray(clientTasks) && clientTasks.filter(task => !task.completed).length > 0 ? (
                clientTasks
                  .filter(task => !task.completed)
                  .slice(0, 3)
                  .map(task => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium mb-1">{task.title}</div>
                          <div className="text-sm text-gray-500">
                            {task.project && <span className="font-medium">{task.project.name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "rounded-full font-normal",
                              new Date(task.due_date) < new Date() 
                                ? "bg-red-50 text-red-600 border-red-200" 
                                : "bg-blue-50 text-blue-600 border-blue-200"
                            )}
                          >
                            {formatDateWithTime(task.due_date, task.due_time)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center">
                          {task.assignedUser && (
                            <div className="flex items-center">
                              <UserAvatar user={task.assignedUser} size="xs" />
                              <span className="text-xs text-gray-500 ml-2">{task.assignedUser.name}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleCompleteTask(task.id)}
                          >
                            <CheckSquare className="h-4 w-4 text-green-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma tarefa pendente para este cliente.
                </div>
              )}
              
              {Array.isArray(clientTasks) && clientTasks.filter(task => !task.completed).length > 3 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/tasks?clientId=${clientId}`)}
                >
                  Ver todas as tarefas ({clientTasks.filter(task => !task.completed).length})
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Documentos Recentes */}
          <RecentDocuments 
            documents={financialDocuments?.map(doc => ({
              id: doc.id.toString(),
              name: doc.document_type === 'invoice' 
                ? `Fatura_${doc.document_number || doc.id}.pdf`
                : doc.document_type === 'contract'
                ? `Contrato_${client?.shortName || client?.name}_${doc.document_number || doc.id}.pdf`
                : doc.document_type === 'proposal'
                ? `Proposta_${doc.document_number || doc.id}.pdf`
                : `Documento_${doc.document_number || doc.id}.pdf`,
              size: `${Math.floor(200 + Math.random() * 500)} KB`,
              type: doc.document_type === 'invoice' 
                ? 'pdf' 
                : doc.document_type === 'contract' 
                ? 'pdf'
                : doc.document_type === 'spreadsheet'
                ? 'xlsx'
                : 'pdf',
              downloadUrl: `#documento-${doc.id}` // Placeholder para demonstração
            })).slice(0, 4) || []}
            viewAllHref="#documentos"
          />
        </div>
      </div>

      {/* Modal de Edição de Cliente */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente {client.name}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <Tabs defaultValue="info" className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="contact">Contato</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-5 pt-4">
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo</FormLabel>
                        <FormControl>
                          <ImageUpload 
                            value={logoPreview}
                            onChange={(value) => {
                              field.onChange(value);
                              setLogoPreview(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
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
                      <FormLabel>Nome curto</FormLabel>
                      <FormControl>
                        <Input placeholder="Abreviação ou sigla" {...field} />
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
                      <FormLabel>Tipo de Cliente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do contato" {...field} />
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

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email do Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="email@exemplo.com" {...field} />
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
                      <FormLabel>Telefone do Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Endereço completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              formatDate(field.value)
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerWithYearNavigation
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1980-01-01")
                          }
                          fromYear={1980}
                          toYear={new Date().getFullYear()}
                          captionLayout="dropdown-buttons"
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

                </TabsContent>
                
                <TabsContent value="contact" className="space-y-5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contato Principal</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do contato" {...field} />
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
                    
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email do Contato</FormLabel>
                          <FormControl>
                            <Input placeholder="email@exemplo.com" {...field} />
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
                          <FormLabel>Telefone do Contato</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Endereço completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                    
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Notas</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Informações adicionais sobre o cliente" 
                              className="resize-none h-20" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Projeto */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
            <DialogDescription>
              Crie um novo projeto para o cliente {client.name}
            </DialogDescription>
          </DialogHeader>

          <Form {...projectForm}>
            <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={projectForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nome do Projeto</FormLabel>
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
                    <FormItem className="col-span-2">
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva o projeto brevemente" 
                          className="resize-none h-20" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="planning">Planejamento</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="review">Revisão</SelectItem>
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
                      <FormLabel>Orçamento (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          value={field.value !== undefined ? field.value : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                              className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(new Date(field.value), "dd/MM/yyyy")
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
                            onSelect={(date) => field.onChange(date?.toISOString())}
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
                      <FormLabel>Prazo de Entrega</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(new Date(field.value), "dd/MM/yyyy")
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
                            onSelect={(date) => field.onChange(date?.toISOString())}
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
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsNewProjectDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : "Criar Projeto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação para exclusão do cliente */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente <strong>{client?.name}</strong> 
              e todos os dados relacionados a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm my-4">
            <p className="font-medium mb-2">Os seguintes itens serão excluídos:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>1 cliente</li>
              <li>{projects?.length || 0} projeto(s)</li>
              <li>{interactions?.length || 0} interação(ões) com o cliente</li>
              <li>{financialDocuments?.length || 0} documento(s) financeiro(s)</li>
            </ul>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClientMutation.mutate()}
              disabled={deleteClientMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClientMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
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

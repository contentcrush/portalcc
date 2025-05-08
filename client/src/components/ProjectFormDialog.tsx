import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProjectSchema } from "@shared/schema";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { ImageUpload } from "@/components/ui/image-upload";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";

// Estender o schema para adicionar validações específicas do formulário
const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(1, "Nome do projeto é obrigatório"),
  client_id: z.coerce.number({
    required_error: "Selecione um cliente",
    invalid_type_error: "Cliente inválido"
  }),
  // Transforme as datas para o formato ISO string ao validar
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  payment_term: z.number().default(30).refine(val => [30, 60, 75].includes(val), {
    message: "Prazo de pagamento deve ser 30, 60 ou 75 dias"
  }),
  priority: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
  complexity: z.enum(["simples", "moderada", "complexa", "muito_complexa"]).default("moderada"),
  team_members: z.array(z.number()).optional(),
  team_members_roles: z.record(z.string(), z.string()).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function ProjectFormDialog() {
  const { isFormOpen, closeProjectForm, projectToEdit } = useProjectForm();
  const [activeTab, setActiveTab] = useState("info");
  const { toast } = useToast();

  // Fetch clients para o dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['/api/clients']
  });

  // Fetch users para seleção de membros da equipe
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ['/api/users']
  });

  // Configurar react-hook-form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: projectToEdit?.name || "",
      description: projectToEdit?.description || "",
      client_id: projectToEdit?.client_id || undefined,
      status: projectToEdit?.status || "draft",
      budget: projectToEdit?.budget || undefined,
      startDate: projectToEdit?.startDate ? new Date(projectToEdit.startDate) : null,
      endDate: projectToEdit?.endDate ? new Date(projectToEdit.endDate) : null,
      payment_term: projectToEdit?.payment_term || 30,
      priority: projectToEdit?.priority || "media",
      complexity: projectToEdit?.complexity || "moderada",
      team_members: projectToEdit?.team_members || [],
      thumbnail: projectToEdit?.thumbnail || ""
    }
  });
  
  // Atualizar o formulário quando projectToEdit mudar
  useEffect(() => {
    if (projectToEdit) {
      form.reset({
        name: projectToEdit.name || "",
        description: projectToEdit.description || "",
        client_id: projectToEdit.client_id || undefined,
        status: projectToEdit.status || "draft",
        budget: projectToEdit.budget || undefined,
        startDate: projectToEdit.startDate ? new Date(projectToEdit.startDate) : null,
        endDate: projectToEdit.endDate ? new Date(projectToEdit.endDate) : null,
        payment_term: projectToEdit.payment_term || 30,
        priority: projectToEdit.priority || "media",
        complexity: projectToEdit.complexity || "moderada",
        team_members: projectToEdit.team_members || [],
        thumbnail: projectToEdit.thumbnail || ""
      });
    }
  }, [projectToEdit, form]);

  // Mutation para criar projeto
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      // Formatação de alguns campos se necessário
      const formatted = {
        ...data,
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null,
        budget: data.budget || null
      };
      
      const res = await apiRequest("POST", "/api/projects", formatted);
      return await res.json();
    },
    onSuccess: (newProject) => {
      // Atualizar a cache após criação bem-sucedida
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Importante: Invalidar cache de documentos financeiros também
      // já que a criação do projeto gera automaticamente uma fatura
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      
      // Mostrar uma mensagem de sucesso
      toast({
        title: "Projeto criado com sucesso",
        description: `${newProject.name} foi adicionado aos seus projetos.`,
        variant: "default",
      });
      
      // Fechar o diálogo
      closeProjectForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message || "Não foi possível criar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar projeto existente
  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      if (!projectToEdit?.id) {
        throw new Error("ID do projeto não encontrado");
      }
      
      // Formatação de alguns campos se necessário
      const formatted = {
        ...data,
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null,
        budget: data.budget || null
      };
      
      const res = await apiRequest("PUT", `/api/projects/${projectToEdit.id}`, formatted);
      return await res.json();
    },
    onSuccess: (updatedProject) => {
      // Invalidar cache de projetos
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (projectToEdit?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectToEdit.id}`] });
      }
      
      // Importante: Invalidar cache de documentos financeiros também
      // já que a alteração do projeto pode ter criado ou atualizado uma fatura
      queryClient.invalidateQueries({ queryKey: ['/api/financial-documents'] });
      
      toast({
        title: "Projeto atualizado",
        description: `As alterações em ${updatedProject.name} foram salvas.`,
        variant: "default",
      });
      
      closeProjectForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar projeto",
        description: error.message || "Não foi possível atualizar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Função para processar upload de imagem
  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Neste momento estamos apenas convertendo para base64
          // Em uma implementação real, você enviaria para o servidor
          resolve(event.target.result as string);
        } else {
          reject(new Error("Falha ao processar a imagem"));
        }
      };
      reader.onerror = () => {
        reject(new Error("Falha ao ler o arquivo"));
      };
      reader.readAsDataURL(file);
    });
  };

  // Lidar com a submissão do formulário
  function onSubmit(data: ProjectFormValues) {
    if (projectToEdit) {
      updateProjectMutation.mutate(data);
    } else {
      createProjectMutation.mutate(data);
    }
  }

  // Estado de carregamento
  const isSubmitting = createProjectMutation.isPending || updateProjectMutation.isPending;
  const isLoading = isLoadingClients || isLoadingUsers;

  return (
    <Dialog open={isFormOpen} onOpenChange={(open) => {
      if (!open) closeProjectForm();
    }}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {projectToEdit ? "Editar Projeto" : "Novo Projeto"}
          </DialogTitle>
          <DialogDescription>
            {projectToEdit 
              ? "Edite as informações do projeto existente."
              : "Adicione um novo projeto ao sistema."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="info">Informações Básicas</TabsTrigger>
                <TabsTrigger value="dates">Datas e Orçamento</TabsTrigger>
                <TabsTrigger value="priority">Prioridade</TabsTrigger>
                <TabsTrigger value="team">Equipe</TabsTrigger>
              </TabsList>
              
              <div className="h-[50vh] overflow-y-auto pr-2 pb-2">
                {/* Tab: Informações Básicas */}
                <TabsContent value="info" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Projeto*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do projeto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva o projeto" 
                            className="min-h-[120px]" 
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente*</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoading ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span>Carregando clientes...</span>
                              </div>
                            ) : (
                              clients?.map((client: any) => (
                                <SelectItem 
                                  key={client.id} 
                                  value={client.id.toString()}
                                >
                                  {client.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROJECT_STATUS_OPTIONS.map(option => (
                              <SelectItem 
                                key={option.value} 
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  

                </TabsContent>
                
                {/* Tab: Prioridade e Complexidade */}
                <TabsContent value="priority" className="space-y-4 mt-0">
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Sistema de Prioridade Inteligente</h3>
                    <p className="text-xs text-blue-700">
                      Defina a prioridade e complexidade do projeto para ajudar a equipe a planejar e executar o trabalho de forma mais eficiente.
                    </p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="baixa">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                <span>Baixa</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="media">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                <span>Média</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="alta">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                                <span>Alta</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="urgente">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                                <span>Urgente</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Define a ordem de execução e alocação de recursos
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="complexity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complexidade</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a complexidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="simples">Simples (1-2 dias)</SelectItem>
                            <SelectItem value="moderada">Moderada (3-7 dias)</SelectItem>
                            <SelectItem value="complexa">Complexa (1-3 semanas)</SelectItem>
                            <SelectItem value="muito_complexa">Muito Complexa (1+ mês)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Ajuda a estimar tempo e recursos necessários
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-6 p-4 border rounded-md bg-gray-50">
                    <h3 className="font-medium text-sm mb-2">Recomendações Baseadas na Prioridade</h3>
                    <div className="space-y-2 text-sm">
                      {form.watch("priority") === "urgente" && (
                        <p className="text-red-600">
                          <span className="font-medium">Urgente:</span> Aloque pelo menos 2 membros sênior à equipe e considere postergar outros projetos.
                        </p>
                      )}
                      {form.watch("priority") === "alta" && (
                        <p className="text-amber-600">
                          <span className="font-medium">Alta:</span> Considere dar preferência a este projeto sobre outros de menor prioridade.
                        </p>
                      )}
                      {form.watch("priority") === "media" && (
                        <p className="text-blue-600">
                          <span className="font-medium">Média:</span> Equilibre com outros projetos de mesma prioridade.
                        </p>
                      )}
                      {form.watch("priority") === "baixa" && (
                        <p className="text-green-600">
                          <span className="font-medium">Baixa:</span> Pode ser executado quando houver disponibilidade de recursos.
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                {/* Tab: Datas e Orçamento */}
                <TabsContent value="dates" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                                    format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione a data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Conclusão</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione a data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                                locale={ptBR}
                                disabled={(date) => {
                                  const startDate = form.getValues("startDate");
                                  return startDate ? date < startDate : false;
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orçamento (R$)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0,00" 
                              value={field.value || ""}
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            O valor total do orçamento para este projeto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="payment_term"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo de Pagamento</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                            defaultValue="30"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o prazo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="30">30 dias</SelectItem>
                              <SelectItem value="60">60 dias</SelectItem>
                              <SelectItem value="75">75 dias</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Prazo para pagamento a partir da data de faturamento
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="thumbnail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Imagem de Capa</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value || null}
                            onChange={field.onChange}
                            onUpload={handleImageUpload}
                          />
                        </FormControl>
                        <FormDescription>
                          Selecione uma imagem para representar o projeto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Tab: Equipe */}
                <TabsContent value="team" className="mt-0">
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-3">Membros da Equipe</h3>
                      
                      <FormField
                        control={form.control}
                        name="team_members"
                        render={({ field }) => (
                          <FormItem>
                            <div className="space-y-4">
                              <div className="flex flex-wrap gap-2 mb-4">
                                {field.value?.map((userId: number) => {
                                  const user = users.find((u: any) => u.id === userId);
                                  if (!user) return null;
                                  
                                  return (
                                    <div 
                                      key={userId}
                                      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5"
                                    >
                                      <div className="flex-grow flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                          {user.name?.charAt(0) || "U"}
                                        </div>
                                        <span className="text-sm font-medium">{user.name}</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 rounded-full"
                                        onClick={() => {
                                          const newValue = field.value?.filter((id: number) => id !== userId) || [];
                                          field.onChange(newValue);
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <Select
                                onValueChange={(value) => {
                                  const userId = parseInt(value);
                                  
                                  // Verificar se o usuário já está na equipe
                                  if (field.value?.includes(userId)) {
                                    return;
                                  }
                                  
                                  // Adicionar o usuário à equipe
                                  const newValue = [...(field.value || []), userId];
                                  field.onChange(newValue);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Adicionar membro à equipe" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users.map((user: any) => (
                                    <SelectItem 
                                      key={user.id} 
                                      value={user.id.toString()}
                                      disabled={field.value?.includes(user.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                          {user.name?.charAt(0) || "U"}
                                        </div>
                                        <span>{user.name}</span>
                                        <span className="text-xs text-muted-foreground">({user.role})</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormDescription>
                              Selecione os membros que farão parte da equipe do projeto
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            
            <DialogFooter className="pt-4 mt-auto border-t">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab(activeTab === "info" ? "dates" : activeTab === "dates" ? "priority" : activeTab === "priority" ? "team" : "info")}
                    disabled={isSubmitting}
                    className="flex-none"
                  >
                    {activeTab === "team" ? "Voltar" : "Próximo"}
                  </Button>
                  <div className="text-sm text-muted-foreground">Etapa {activeTab === "info" ? "1" : activeTab === "dates" ? "2" : activeTab === "priority" ? "3" : "4"} de 4</div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeProjectForm}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {projectToEdit ? "Salvar Alterações" : "Criar Projeto"}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
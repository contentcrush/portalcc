import { 
  AlertCircle, 
  ChevronDown,
  ChevronUp,
  Edit, 
  Loader2,
  Mail, 
  Plus, 
  Search, 
  ShieldCheck, 
  Trash2, 
  User, 
  UserCog, 
  UserPlus 
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { showSuccessToast } from "@/lib/utils";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Avatar,
  AvatarFallback,
  AvatarImage 
} from "@/components/ui/avatar";

import { UserAvatar } from "@/components/UserAvatar";

// Esquema de validação para formulário de usuário
export const userFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  username: z.string().optional(),
  role: z.enum(["admin", "manager", "editor", "viewer"]).default("viewer"),
  user_type: z.enum(["pf", "pj"]).default("pf").optional(),
  document: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  area: z.string().optional(),
  contact_name: z.string().optional(),
  contact_position: z.string().optional(),
  contact_email: z.string().optional(),
  bank: z.string().optional(),
  bank_agency: z.string().optional(),
  bank_account: z.string().optional(),
  account_type: z.enum(["corrente", "poupanca", "pagamento", "investimento"]).default("corrente").optional(),
  pix_key: z.string().optional(),
  is_active: z.boolean().default(true),
  bio: z.string().optional(),
  notes: z.string().optional(),
});

// Tipo inferido do esquema
export type UserFormValues = z.infer<typeof userFormSchema>;

// Componente de diálogo para adicionar/editar usuário
export function UserEditDialog({ 
  isOpen, 
  onClose, 
  user = null
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user?: any;
}) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { toast } = useToast();
  
  // Setup react-hook-form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      role: "viewer",
      department: "",
      position: "",
      phone: "",
      mobile_phone: "",
      user_type: "pf",
      document: "",
      website: "",
      address: "",
      area: "",
      contact_name: "",
      contact_position: "",
      contact_email: "",
      bank: "",
      bank_agency: "",
      bank_account: "",
      account_type: "corrente",
      pix_key: "",
      is_active: true,
      bio: "",
      notes: "",
    },
  });
  
  // Atualizar valores do formulário quando o usuário mudar
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        username: user.username || "",
        role: user.role || "viewer",
        department: user.department || "",
        position: user.position || "",
        phone: user.phone || "",
        mobile_phone: user.mobile_phone || "",
        user_type: user.user_type || "pf",
        document: user.document || "",
        website: user.website || "",
        address: user.address || "",
        area: user.area || "",
        contact_name: user.contact_name || "",
        contact_position: user.contact_position || "",
        contact_email: user.contact_email || "",
        bank: user.bank || "",
        bank_agency: user.bank_agency || "",
        bank_account: user.bank_account || "",
        account_type: user.account_type || "corrente",
        pix_key: user.pix_key || "",
        is_active: user.is_active ?? true,
        bio: user.bio || "",
        notes: user.notes || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        username: "",
        role: "viewer",
        department: "",
        position: "",
        phone: "",
        mobile_phone: "",
        user_type: "pf",
        document: "",
        website: "",
        address: "",
        area: "",
        contact_name: "",
        contact_position: "",
        contact_email: "",
        bank: "",
        bank_agency: "",
        bank_account: "",
        account_type: "corrente",
        pix_key: "",
        is_active: true,
        bio: "",
        notes: "",
      });
    }
  }, [user, form]);
  
  // Criar usuário mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("POST", "/api/users", {
        ...data,
        username: data.email.split('@')[0], // Usa parte do email como nome de usuário
        password: "senha123", // Senha temporária - usuário deve alterá-la depois
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      showSuccessToast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso."
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    }
  });
  
  // Atualizar usuário mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      showSuccessToast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso."
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: UserFormValues) {
    if (user) {
      // Atualizar usuário existente
      updateUserMutation.mutate(data);
    } else {
      // Criar novo usuário
      createUserMutation.mutate(data);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <UserCog className="mr-2 h-5 w-5" />
            {user ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? "Edite as informações do usuário abaixo." 
              : "Adicione um novo usuário ao sistema."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs defaultValue="info_basica" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="info_basica">Informações Básicas</TabsTrigger>
                  <TabsTrigger value="info_adicional">Dados Adicionais</TabsTrigger>
                  <TabsTrigger value="dados_bancarios">Dados Bancários</TabsTrigger>
                </TabsList>
                
                <div className="h-[55vh] overflow-y-auto pr-2 pb-2">
                  {/* Tab: Informações Básicas */}
                  <TabsContent value="info_basica" className="space-y-4 mt-0">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome/Razão Social*</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome completo ou razão social" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email*</FormLabel>
                          <FormControl>
                            <Input placeholder="exemplo@contentcrush.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {isAdmin && (
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Função/Nível de Acesso</FormLabel>
                            {!user && (
                              // Novo usuário - Admin pode escolher o nível de acesso
                              <>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma função" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Gestor</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Visualizador</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Define as permissões do usuário no sistema.
                                </FormDescription>
                              </>
                            )}
                            {user && isAdmin && (
                              // Admin editando usuário existente - pode alterar a função
                              <>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma função" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="manager">Gestor</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="viewer">Visualizador</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Define as permissões do usuário no sistema.
                                </FormDescription>
                              </>
                            )}
                            {user && !isAdmin && (
                              // Usuário não-admin editando - não pode mudar papéis
                              <Input 
                                value={field.value === "admin" ? "Admin" : 
                                      field.value === "manager" ? "Gestor" :
                                      field.value === "editor" ? "Editor" : "Visualizador"} 
                                disabled 
                                className="bg-gray-50"
                              />
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="user_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pf">Pessoa Física</SelectItem>
                              <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="document"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ/CPF</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="CNPJ ou CPF" 
                              {...field} 
                              value={field.value || ""} 
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 98765-4321" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="mobile_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Celular</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 98765-4321" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Usuário ativo
                            </FormLabel>
                            <FormDescription>
                              Usuários inativos não podem fazer login no sistema.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* Tab: Informações Adicionais */}
                  <TabsContent value="info_adicional" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Marketing" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Gerente de Marketing" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Área</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Criação" {...field} value={field.value || ""} />
                          </FormControl>
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
                            <Input placeholder="https://..." {...field} value={field.value || ""} />
                          </FormControl>
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
                            <Textarea placeholder="Endereço completo" {...field} value={field.value || ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Biografia</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Breve descrição profissional" {...field} value={field.value || ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Notas adicionais" {...field} value={field.value || ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  {/* Tab: Dados Bancários */}
                  <TabsContent value="dados_bancarios" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bank"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banco</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Banco do Brasil" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bank_agency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agência</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 1234" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bank_account"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conta</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 12345-6" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="account_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Conta</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="corrente">Corrente</SelectItem>
                                <SelectItem value="poupanca">Poupança</SelectItem>
                                <SelectItem value="pagamento">Pagamento</SelectItem>
                                <SelectItem value="investimento">Investimento</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="pix_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chave PIX</FormLabel>
                          <FormControl>
                            <Input placeholder="CPF, CNPJ, email, telefone ou chave aleatória" {...field} value={field.value || ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="p-4 bg-muted rounded-md">
                      <h4 className="font-medium mb-2">Contato Financeiro</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Caso seja diferente do titular da conta, especifique o contato para assuntos financeiros.
                      </p>
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="contact_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Contato</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome completo" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="contact_position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cargo do Contato</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Contador" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="contact_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email do Contato</FormLabel>
                              <FormControl>
                                <Input placeholder="financeiro@exemplo.com" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {user ? "Salvar Alterações" : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente de diálogo de confirmação para exclusão de usuário
function DeleteUserDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName, 
  isDeleting 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  userName: string;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-red-600">
            <AlertCircle className="mr-2 h-5 w-5" />
            Excluir usuário
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o usuário <span className="font-semibold">{userName}</span>? Esta ação não pode ser desfeita e removerá o usuário permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Team() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [showTeamStats, setShowTeamStats] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  const { toast } = useToast();
  
  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users']
  });
  
  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks']
  });
  
  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects']
  });
  
  // Filter users based on search term
  const filteredUsers = users.length > 0 
    ? users.filter((user: any) => {
        if (searchTerm === "") return true;
        
        return (
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
    : [];

  // Get tasks for a user
  const getTasksForUser = (userId: number) => {
    return tasks.length > 0 
      ? tasks.filter((task: any) => task.assignee_id === userId || task.assigned_to === userId) 
      : [];
  };
  
  // Navigation
  const [, setLocation] = useLocation();
  
  // Handler for viewing user profile
  const handleViewProfile = (user: any) => {
    setLocation(`/team/user/${user.id}`);
  };

  // Handler for editing user
  const handleEditUser = (user: any) => {
    // Certifica-se de que temos todos os dados do usuário antes de abrir o formulário
    if (user && user.id) {
      // Salva uma cópia dos dados para evitar referências diretas
      setEditingUser({...user});
      setIsUserDialogOpen(true);
    }
  };
  
  // Handler for deleting user
  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      showSuccessToast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso."
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o usuário",
        variant: "destructive",
      });
    }
  });
  
  // Confirm deletion
  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Busca */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-sm text-gray-500">Gerencie membros da equipe e suas atividades</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Buscar membros..." 
              className="pl-9 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button variant="default" onClick={() => {
            setEditingUser(null);
            setIsUserDialogOpen(true);
          }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Membro
          </Button>
        </div>
      </div>
      
      {/* Admin Panel */}
      {isAdmin && isAdminPanelOpen && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                Painel de Administração de Usuários
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Lista de usuários */}
              {users.length > 0 ? (
                <>
                  {users.map((user: any) => (
                    <div 
                      key={`admin-${user.id}`} 
                      className="p-3 rounded-md border flex justify-between items-center hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center">
                        <UserAvatar user={user} className="h-8 w-8 mr-3" />
                        <div>
                          <h3 className="font-medium text-base">{user.name}</h3>
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          user.role === "admin" ? "default" : 
                          user.role === "manager" ? "outline" : 
                          user.role === "editor" ? "secondary" : "outline"
                        }>
                          {user.role === "admin" ? "Admin" : 
                           user.role === "manager" ? "Gestor" : 
                           user.role === "editor" ? "Editor" : "Visualizador"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Acionáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tarefas atrasadas por membro */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                Tarefas atrasadas por membro
              </h3>
              <Badge variant="destructive" className="text-xs">
                {tasks.filter((t: any) => new Date(t.due_date) < new Date() && t.status !== "done").length} total
              </Badge>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {users.map((user: any) => {
                const overdueTasks = tasks.filter((t: any) => 
                  (t.assignee_id === user.id || t.assigned_to === user.id) && 
                  new Date(t.due_date) < new Date() && 
                  t.status !== "done"
                );
                
                if (overdueTasks.length === 0) return null;
                
                return (
                  <div key={`overdue-${user.id}`} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <UserAvatar user={user} className="h-8 w-8 mr-2" />
                      <span className="font-medium text-sm">{user.name}</span>
                    </div>
                    <Badge variant="destructive" className="ml-2">{overdueTasks.length}</Badge>
                  </div>
                );
              })}
              
              {tasks.filter((t: any) => new Date(t.due_date) < new Date() && t.status !== "done").length === 0 && (
                <div className="text-center py-3 text-sm text-gray-500">
                  Sem tarefas atrasadas. Bom trabalho!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Capacidade livre */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <ChevronUp className="h-4 w-4 text-green-500 mr-2" />
                Capacidade livre
              </h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Horas disponíveis</Badge>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {users.slice(0, 10).map((user: any) => {
                const activeTasks = tasks.filter((t: any) => 
                  (t.assignee_id === user.id || t.assigned_to === user.id) && 
                  t.status !== "done"
                ).length;
                
                // Cálculo teórico - assumindo que cada pessoa tem 40h semanais
                // e cada tarefa consome em média 8h
                const capacity = 40;
                const estimatedUsage = activeTasks * 8;
                const availableHours = Math.max(0, capacity - estimatedUsage);
                
                return (
                  <div key={`capacity-${user.id}`} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-50">
                    <div className="flex items-center">
                      <UserAvatar user={user} className="h-8 w-8 mr-2" />
                      <span className="font-medium text-sm">{user.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">
                        {availableHours}h
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (availableHours/capacity)*100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {users.length === 0 && (
                <div className="text-center py-3 text-sm text-gray-500">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabela Compacta de Membros */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <User className="mr-2 h-5 w-5 text-primary" />
            Lista de Membros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <div className="grid grid-cols-12 gap-4 bg-muted py-3 px-4 border-b text-sm font-medium text-gray-500">
              <div className="col-span-5 md:col-span-3">Nome</div>
              <div className="col-span-4 md:col-span-3 hidden md:block">Função</div>
              <div className="col-span-3 md:col-span-2 hidden md:block">Departamento</div>
              <div className="col-span-3 md:col-span-2 text-center">Tarefas</div>
              <div className="col-span-4 md:col-span-2 text-right">Ações</div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum membro encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Não encontramos nenhum membro da equipe com os critérios de busca.
                </p>
                <Button 
                  onClick={() => {
                    setEditingUser(null);
                    setIsUserDialogOpen(true);
                  }}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar membro
                </Button>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {filteredUsers.map((user: any) => {
                  const userTasks = getTasksForUser(user.id);
                  const pendingTasks = userTasks.filter((t: any) => t.status !== "done");
                  
                  return (
                    <div 
                      key={user.id} 
                      className="grid grid-cols-12 gap-4 py-3 px-4 border-b hover:bg-gray-50 items-center text-sm"
                    >
                      {/* Nome + Avatar */}
                      <div className="col-span-5 md:col-span-3 flex items-center">
                        <UserAvatar user={user} className="h-8 w-8 mr-2" />
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-gray-500 md:hidden">{user.position || "-"}</div>
                        </div>
                      </div>
                      
                      {/* Função */}
                      <div className="col-span-4 md:col-span-3 hidden md:flex items-center">
                        <Badge variant={
                          user.role === "admin" ? "default" : 
                          user.role === "manager" ? "outline" : 
                          user.role === "editor" ? "secondary" : "outline"
                        } className="text-xs py-0 px-2">
                          {user.role === "admin" ? "Admin" : 
                           user.role === "manager" ? "Gestor" : 
                           user.role === "editor" ? "Editor" : "Visualizador"}
                        </Badge>
                      </div>
                      
                      {/* Departamento */}
                      <div className="col-span-3 md:col-span-2 text-gray-600 hidden md:block">
                        {user.department || "-"}
                      </div>
                      
                      {/* Tarefas */}
                      <div className="col-span-3 md:col-span-2 text-center">
                        <div className="flex items-center justify-center">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {pendingTasks.length}
                          </span>
                          <span className="ml-1 text-xs text-gray-500 hidden sm:inline">
                            / {userTasks.length}
                          </span>
                        </div>
                      </div>
                      
                      {/* Ações */}
                      <div className="col-span-4 md:col-span-2 flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewProfile(user)}
                        >
                          <UserCog className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? "Você não pode remover seu próprio usuário" : ""}
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Botão para adicionar novo usuário (versão em tabela) */}
          <Button 
            variant="outline" 
            className="mt-4 w-full border-dashed"
            onClick={() => {
              setEditingUser(null);
              setIsUserDialogOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Novo Membro
          </Button>
        </CardContent>
      </Card>
      
      {/* Botão para adicionar novo usuário flutuante (apenas mobile) */}
      <div className="fixed bottom-6 right-6 z-10 md:hidden">
        <Button className="h-12 w-12 rounded-full shadow-lg p-0" onClick={() => {
          setEditingUser(null);
          setIsUserDialogOpen(true);
        }}>
          <UserPlus className="h-6 w-6" />
        </Button>
      </div>
      
      {/* User edit dialog */}
      {isUserDialogOpen && (
        <UserEditDialog 
          isOpen={isUserDialogOpen} 
          onClose={() => setIsUserDialogOpen(false)} 
          user={editingUser}
        />
      )}
      
      {/* Delete confirmation dialog */}
      {deleteDialogOpen && (
        <DeleteUserDialog 
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={confirmDeleteUser}
          userName={userToDelete?.name || ""}
          isDeleting={deleteUserMutation.isPending}
        />
      )}
    </div>
  );
}
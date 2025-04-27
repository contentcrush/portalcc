import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Mail,
  Phone,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  ShieldCheck,
  UserCog,
  AlertCircle,
  X,
  Briefcase,
  UserPlus,
  Globe,
  LockKeyhole
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/use-auth";

// Validação para formulário de edição de usuário
const userFormSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  role: z.enum(["admin", "manager", "editor", "viewer"], {
    message: "Função deve ser admin, manager, editor ou viewer"
  }),
  
  // Campos básicos
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  
  // Campos avançados
  user_type: z.enum(["pf", "pj"]).optional().nullable(),
  document: z.string().optional().nullable(),
  mobile_phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),

  // Contato principal (para PJ)
  contact_name: z.string().optional().nullable(),
  contact_position: z.string().optional().nullable(),
  contact_email: z.string().email({ message: "Email de contato inválido" }).optional().nullable(),
  
  // Dados bancários
  bank: z.string().optional().nullable(),
  bank_agency: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  account_type: z.enum(["corrente", "poupanca", "investimento", "pagamento"]).optional().nullable(),
  pix_key: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  
  is_active: z.boolean().optional().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// Componente de diálogo para edição de usuário
function UserEditDialog({ 
  isOpen, 
  onClose, 
  user, 
  isAdmin 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user?: any; 
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      // Novo usuário - sempre começa como "viewer" (Visualizador)
      name: "",
      email: "",
      role: "viewer", // Papel padrão - não editável para novos usuários
      department: "",
      position: "",
      phone: "",
      bio: "",
      // Campos adicionais
      user_type: null,
      document: "",
      mobile_phone: "",
      website: "",
      address: "",
      area: "",
      // Contato principal (para PJ)
      contact_name: "",
      contact_position: "",
      contact_email: "",
      // Dados bancários
      bank: "",
      bank_agency: "",
      bank_account: "",
      account_type: null,
      pix_key: "",
      notes: "",
      is_active: true
    }
  });

  // Atualiza os dados do formulário quando o usuário muda
  useEffect(() => {
    if (user) {
      // Se temos um usuário, carregamos os dados dele no formulário
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        phone: user.phone,
        bio: user.bio,
        // Campos adicionais
        user_type: user.user_type,
        document: user.document,
        mobile_phone: user.mobile_phone,
        website: user.website,
        address: user.address,
        area: user.area,
        // Contato principal (para PJ)
        contact_name: user.contact_name,
        contact_position: user.contact_position,
        contact_email: user.contact_email,
        // Dados bancários
        bank: user.bank,
        bank_agency: user.bank_agency,
        bank_account: user.bank_account,
        account_type: user.account_type,
        pix_key: user.pix_key,
        notes: user.notes,
        is_active: user.is_active !== false
      });
    } else {
      // Se não temos usuário, resetamos o formulário para os valores padrão
      form.reset({
        name: "",
        email: "",
        role: "viewer",
        department: "",
        position: "",
        phone: "",
        bio: "",
        user_type: null,
        document: "",
        mobile_phone: "",
        website: "",
        address: "",
        area: "",
        contact_name: "",
        contact_position: "",
        contact_email: "",
        bank: "",
        bank_agency: "",
        bank_account: "",
        account_type: null,
        pix_key: "",
        notes: "",
        is_active: true
      });
    }
  }, [user, form]);

  // Mutation para atualizar usuários existentes
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
        variant: "default",
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
  
  // Mutation para criar novos usuários
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => { // Usando "any" temporariamente para incluir os campos adicionais
      const res = await apiRequest("POST", `/api/users`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário criado",
        description: "O novo usuário foi criado com sucesso como Visualizador. Um administrador precisará alterar o nível de acesso.",
        variant: "default",
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

  function onSubmit(data: UserFormValues) {
    if (user) {
      // Atualizar usuário existente
      updateUserMutation.mutate(data);
    } else {
      // Criar novo usuário
      createUserMutation.mutate({
        ...data,
        role: "viewer", // Garante que novos usuários sejam sempre Visualizadores
        username: data.email.split('@')[0], // Usa parte do email como nome de usuário
        password: "senha123", // Senha temporária - usuário deve alterá-la depois
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
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
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Tabs defaultValue="info_basica" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="info_basica">Informações Básicas</TabsTrigger>
                <TabsTrigger value="info_adicional">Dados Adicionais</TabsTrigger>
                <TabsTrigger value="dados_bancarios">Dados Bancários</TabsTrigger>
              </TabsList>
              
              {/* Tab: Informações Básicas */}
              <TabsContent value="info_basica" className="space-y-4">
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
                          // Novo usuário - sempre Visualizador sem opção de mudar
                          <div>
                            <Input 
                              value="Visualizador" 
                              disabled 
                              className="bg-gray-50"
                            />
                            <FormDescription className="flex items-center mt-1.5">
                              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                              Novos usuários são criados como Visualizadores por segurança
                            </FormDescription>
                          </div>
                        )}
                        {user && isAdmin && (
                          // Admin editando usuário existente - pode alterar a função
                          <>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
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
                        defaultValue={field.value || undefined}
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
                        <Input placeholder="CNPJ ou CPF" {...field} value={field.value || ""} />
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
              </TabsContent>
              
              {/* Tab: Dados Adicionais */}
              <TabsContent value="info_adicional" className="space-y-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="www.exemplo.com.br" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Endereço, número, complemento, bairro, cidade, estado, CEP" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área de Atuação</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Marketing Digital" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-3 mt-4">
                  <h3 className="text-sm font-semibold mb-2">Contato Principal</h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Contato Principal</FormLabel>
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
                            <Input placeholder="Ex: Diretor Comercial" {...field} value={field.value || ""} />
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
                            <Input placeholder="contato@exemplo.com" {...field} value={field.value || ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <textarea 
                          placeholder="Informações adicionais relevantes"
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Tab: Dados Bancários */}
              <TabsContent value="dados_bancarios" className="space-y-4">
                <FormField
                  control={form.control}
                  name="bank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do banco" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bank_agency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agência</FormLabel>
                        <FormControl>
                          <Input placeholder="Número da agência" {...field} value={field.value || ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="bank_account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta</FormLabel>
                        <FormControl>
                          <Input placeholder="Número da conta" {...field} value={field.value || ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="account_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Conta</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de conta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupança</SelectItem>
                          <SelectItem value="investimento">Investimento</SelectItem>
                          <SelectItem value="pagamento">Pagamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pix_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chave PIX</FormLabel>
                      <FormControl>
                        <Input placeholder="CPF, email, celular ou chave aleatória" {...field} value={field.value || ""} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Status Ativo</FormLabel>
                        <FormDescription>
                          Desmarque para definir como inativo
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="pt-2 border-t">
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                disabled={updateUserMutation.isPending || createUserMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={updateUserMutation.isPending || createUserMutation.isPending}
              >
                {(updateUserMutation.isPending || createUserMutation.isPending) && (
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full" />
                )}
                {user ? "Salvar alterações" : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Componente de diálogo de confirmação para exclusão
function DeleteUserConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isDeleting,
  userName
}: { 
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  userName: string;
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
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full" />
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
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  
  const { toast } = useToast();
  
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users']
  });
  
  // Fetch tasks
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks']
  });
  
  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['/api/projects']
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
        variant: "default",
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

  // Filter users based on search term
  const filteredUsers = users?.filter(user => {
    if (searchTerm === "") return true;
    
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Get tasks for a user
  const getTasksForUser = (userId: number) => {
    return tasks?.filter(task => task.assigned_to === userId) || [];
  };
  
  // Handler for editing user
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setIsUserDialogOpen(true);
  };
  
  // Handler for deleting user
  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };
  
  // Confirm deletion
  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };
  
  // Handler for viewing complete profile
  const handleViewProfile = (user: any) => {
    setSelectedUserProfile(user);
    setProfileDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-sm text-gray-500">Gerencie membros da equipe e suas atividades</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <Button 
              variant="outline" 
              onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
              className={isAdminPanelOpen ? "bg-primary/10" : ""}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Painel Admin
            </Button>
          )}
          <Button onClick={() => {
            setEditingUser(null);
            setIsUserDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
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
              <Input 
                placeholder="Buscar usuário..." 
                className="w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Lista de usuários */}
              {users?.map(user => (
                <div 
                  key={user.id} 
                  className="p-4 border rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <UserAvatar user={user} className="h-12 w-12" />
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{user.name}</span>
                        <Badge variant={
                          user.role === "admin" ? "destructive" : 
                          user.role === "manager" ? "default" : 
                          user.role === "editor" ? "secondary" : 
                          "outline"
                        } className="ml-2">
                          {user.role === "admin" ? "Admin" : 
                          user.role === "manager" ? "Gestor" : 
                          user.role === "editor" ? "Editor" : 
                          "Visualizador"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Mail className="h-3.5 w-3.5 mr-1 inline" />
                        <span>{user.email}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span>@{user.username}</span>
                        {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
                          <Button variant="link" size="sm" onClick={() => handleViewProfile(user)} className="h-5 p-0 text-muted-foreground hover:text-primary ml-2">
                            Ver Perfil Completo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
                      <Button 
                        variant="ghost"
                        size="sm" 
                        onClick={() => handleViewProfile(user)}
                        className="h-9"
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Ver Perfil
                      </Button>
                    )}
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="h-9"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm" 
                      onClick={() => handleDeleteUser(user)}
                      className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={user.id === currentUser?.id}
                      title={user.id === currentUser?.id ? "Você não pode remover seu próprio usuário" : ""}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Card para adicionar novo usuário */}
              <div className="p-4 border border-dashed rounded-md flex justify-center items-center hover:border-primary/40 transition-colors">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="bg-primary/10 rounded-full p-3 mb-3">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">Adicionar Usuário</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">Adicione um novo usuário ao sistema</p>
                  <Button onClick={() => {
                    setEditingUser(null);
                    setIsUserDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Search and filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar membros da equipe..."
          className="pl-10 w-full md:w-80"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Team grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredUsers?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <h3 className="text-lg font-medium mb-2">Nenhum membro encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar sua busca ou adicione um novo membro à equipe.
            </p>
            <Button onClick={() => setIsUserDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Membro
            </Button>
          </div>
        ) : (
          <>
            {filteredUsers?.map(user => (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <UserAvatar user={user} className="h-14 w-14 mr-4" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{user.name}</h3>
                        <div className="flex items-center flex-wrap gap-2">
                          <Badge variant="outline" className="capitalize">
                            {user.role}
                          </Badge>
                          {user.department && (
                            <Badge variant="secondary" className="capitalize">
                              {user.department}
                            </Badge>
                          )}
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
                          {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
                            <DropdownMenuItem onSelect={() => handleViewProfile(user)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Ver Perfil Completo
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver projetos
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onSelect={() => handleDeleteUser(user)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
                        <div className="flex items-center text-sm mt-2">
                          <Button variant="link" size="sm" onClick={() => handleViewProfile(user)} className="p-0 h-auto text-primary hover:text-primary/80">
                            <UserCog className="h-3.5 w-3.5 mr-1" />
                            Ver Perfil Completo
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <Tabs defaultValue="tasks">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="tasks">Tarefas</TabsTrigger>
                        <TabsTrigger value="projects">Projetos</TabsTrigger>
                      </TabsList>
                      <TabsContent value="tasks" className="mt-2">
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {getTasksForUser(user.id).length > 0 ? (
                            getTasksForUser(user.id).map(task => (
                              <div key={task.id} className="flex items-start py-1">
                                {task.completed ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                                )}
                                <div className="text-sm">
                                  <p className={`${task.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                                    {task.title}
                                  </p>
                                  {task.due_date && (
                                    <p className="text-xs text-muted-foreground">
                                      Prazo: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-sm text-muted-foreground py-2">
                              Nenhuma tarefa atribuída
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="projects" className="mt-2">
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {projects?.filter(p => {
                            // Check if user is a member of this project
                            const projectMembers = projects.find(pm => pm.id === p.id);
                            return projectMembers;
                          }).length > 0 ? (
                            projects?.map(project => (
                              <div key={project.id} className="flex items-center py-1">
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  project.status === 'em_andamento' ? 'bg-green-500' : 
                                  project.status === 'pre_producao' ? 'bg-blue-500' : 
                                  project.status === 'em_producao' ? 'bg-yellow-500' : 
                                  'bg-gray-500'
                                }`}></div>
                                <div className="text-sm">
                                  <p className="font-medium">{project.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {project.status.replace(/_/g, ' ')}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-sm text-muted-foreground py-2">
                              Nenhum projeto atribuído
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="flex border-t border-gray-200 divide-x divide-gray-200">
                    <Button variant="ghost" className="flex-1 rounded-none py-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Ver Agenda
                    </Button>
                    <Button variant="ghost" className="flex-1 rounded-none py-2">
                      <FileText className="h-4 w-4 mr-2" />
                      Atribuir Tarefa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Add new member card */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-primary/40 transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6 h-full min-h-[280px]">
                <div className="bg-primary/10 rounded-full p-3 mb-3">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Novo Membro</h3>
                <p className="text-sm text-gray-500 text-center mb-4">Adicione um novo membro à sua equipe</p>
                <Button onClick={() => setIsUserDialogOpen(true)}>Adicionar Membro</Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* Team Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtividade da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Tarefas Pendentes</TableHead>
                  <TableHead>Tarefas Concluídas</TableHead>
                  <TableHead className="text-right">Taxa de Conclusão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map(user => {
                  const userTasks = getTasksForUser(user.id);
                  const pendingTasks = userTasks.filter(t => !t.completed).length;
                  const completedTasks = userTasks.filter(t => t.completed).length;
                  const completionRate = userTasks.length > 0 
                    ? Math.round((completedTasks / userTasks.length) * 100) 
                    : 0;
                    
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <UserAvatar user={user} className="h-6 w-6 mr-2" />
                          <span>{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{pendingTasks}</TableCell>
                      <TableCell>{completedTasks}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                completionRate > 75 ? 'bg-green-500' : 
                                completionRate > 50 ? 'bg-blue-500' : 
                                completionRate > 25 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <span>{completionRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Carga de Trabalho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredUsers?.map(user => {
                const userTasks = getTasksForUser(user.id);
                const taskCount = userTasks.length;
                const taskHours = userTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
                
                return (
                  <div key={user.id} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <UserAvatar user={user} className="h-6 w-6 mr-2" />
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {taskCount} tarefas | {taskHours} horas
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          taskHours > 40 ? 'bg-red-500' : 
                          taskHours > 30 ? 'bg-yellow-500' : 
                          taskHours > 10 ? 'bg-green-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, (taskHours / 40) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <UserEditDialog 
        isOpen={isUserDialogOpen} 
        onClose={() => {
          setIsUserDialogOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        isAdmin={isAdmin}
      />
      
      {/* Delete Confirmation Dialog */}
      <DeleteUserConfirmDialog 
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteUser}
        isDeleting={deleteUserMutation.isPending}
        userName={userToDelete?.name || ""}
      />
      
      {/* Profile view dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={() => setProfileDialogOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserCog className="mr-2 h-5 w-5" />
              Perfil Completo - {selectedUserProfile?.name}
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas do perfil
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserProfile && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <UserAvatar user={selectedUserProfile} className="h-28 w-28" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUserProfile.name}</h3>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge variant={
                        selectedUserProfile.role === "admin" ? "destructive" : 
                        selectedUserProfile.role === "manager" ? "default" : 
                        selectedUserProfile.role === "editor" ? "secondary" : 
                        "outline"
                      }>
                        {selectedUserProfile.role === "admin" ? "Admin" : 
                        selectedUserProfile.role === "manager" ? "Gestor" : 
                        selectedUserProfile.role === "editor" ? "Editor" : 
                        "Visualizador"}
                      </Badge>
                      {selectedUserProfile.department && (
                        <Badge variant="outline">{selectedUserProfile.department}</Badge>
                      )}
                      {selectedUserProfile.position && (
                        <Badge variant="secondary">{selectedUserProfile.position}</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{selectedUserProfile.email}</span>
                    </div>
                    {selectedUserProfile.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedUserProfile.phone}</span>
                      </div>
                    )}
                    {selectedUserProfile.mobile_phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedUserProfile.mobile_phone} (Celular)</span>
                      </div>
                    )}
                    {selectedUserProfile.website && (
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedUserProfile.website}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedUserProfile.bio && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Bio</h4>
                      <p className="text-sm text-muted-foreground">{selectedUserProfile.bio}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <Tabs defaultValue="info">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="info">Informações Básicas</TabsTrigger>
                  <TabsTrigger value="contacts">Contatos & Documentos</TabsTrigger>
                  <TabsTrigger value="financial">Dados Financeiros</TabsTrigger>
                </TabsList>
                
                {/* Informações Básicas */}
                <TabsContent value="info" className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Tipo</h4>
                      <p className="text-sm">
                        {selectedUserProfile.user_type === "pf" ? "Pessoa Física" : 
                         selectedUserProfile.user_type === "pj" ? "Pessoa Jurídica" : 
                         "Não especificado"}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Username</h4>
                      <p className="text-sm">@{selectedUserProfile.username}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Área de Atuação</h4>
                      <p className="text-sm">{selectedUserProfile.area || "Não especificado"}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Status</h4>
                      <div className="flex items-center">
                        {selectedUserProfile.is_active !== false ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                            <p className="text-sm">Ativo</p>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 rounded-full bg-red-500 mr-2"></div>
                            <p className="text-sm">Inativo</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedUserProfile.address && (
                    <div className="space-y-1 border-t pt-3">
                      <h4 className="text-sm font-medium">Endereço Completo</h4>
                      <p className="text-sm">{selectedUserProfile.address}</p>
                    </div>
                  )}
                  
                  {selectedUserProfile.notes && (
                    <div className="space-y-1 border-t pt-3">
                      <h4 className="text-sm font-medium">Observações Gerais</h4>
                      <p className="text-sm whitespace-pre-line">{selectedUserProfile.notes}</p>
                    </div>
                  )}
                </TabsContent>
                
                {/* Contatos e Documentos */}
                <TabsContent value="contacts" className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUserProfile.document && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">
                          {selectedUserProfile.user_type === "pj" ? "CNPJ" : "CPF"}
                        </h4>
                        <p className="text-sm">{selectedUserProfile.document}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Contato Principal (apenas para PJ) */}
                  {selectedUserProfile.user_type === "pj" && (
                    <div className="border-t pt-3 space-y-3">
                      <h4 className="text-sm font-medium">Contato Principal</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUserProfile.contact_name && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-muted-foreground">Nome</h4>
                            <p className="text-sm">{selectedUserProfile.contact_name}</p>
                          </div>
                        )}
                        
                        {selectedUserProfile.contact_position && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-muted-foreground">Cargo</h4>
                            <p className="text-sm">{selectedUserProfile.contact_position}</p>
                          </div>
                        )}
                        
                        {selectedUserProfile.contact_email && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-muted-foreground">Email</h4>
                            <p className="text-sm">{selectedUserProfile.contact_email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                {/* Dados Financeiros */}
                <TabsContent value="financial" className="space-y-4 py-4">
                  {isAdmin ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedUserProfile.bank && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Banco</h4>
                            <p className="text-sm">{selectedUserProfile.bank}</p>
                          </div>
                        )}
                        
                        {selectedUserProfile.bank_agency && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Agência</h4>
                            <p className="text-sm">{selectedUserProfile.bank_agency}</p>
                          </div>
                        )}
                        
                        {selectedUserProfile.bank_account && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Conta</h4>
                            <p className="text-sm">{selectedUserProfile.bank_account}</p>
                          </div>
                        )}
                        
                        {selectedUserProfile.account_type && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Tipo de Conta</h4>
                            <p className="text-sm capitalize">
                              {selectedUserProfile.account_type.replace("_", " ")}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {selectedUserProfile.pix_key && (
                        <div className="space-y-1 border-t pt-3">
                          <h4 className="text-sm font-medium">Chave PIX</h4>
                          <p className="text-sm font-mono bg-gray-50 p-2 rounded">
                            {selectedUserProfile.pix_key}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <LockKeyhole className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">Acesso Restrito</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-1">
                        Os dados financeiros só podem ser visualizados por usuários com nível de acesso Admin.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setProfileDialogOpen(false)}
                >
                  Fechar
                </Button>
                <Button 
                  onClick={() => {
                    setProfileDialogOpen(false);
                    handleEditUser(selectedUserProfile);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Perfil
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

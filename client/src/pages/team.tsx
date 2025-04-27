import { 
  AlertCircle, 
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
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      role: user?.role || "viewer",
      department: user?.department || "",
      position: user?.position || "",
      phone: user?.phone || "",
      mobile_phone: user?.mobile_phone || "",
      user_type: user?.user_type || "pf",
      document: user?.document || "",
      website: user?.website || "",
      address: user?.address || "",
      area: user?.area || "",
      contact_name: user?.contact_name || "",
      contact_position: user?.contact_position || "",
      contact_email: user?.contact_email || "",
      bank: user?.bank || "",
      bank_agency: user?.bank_agency || "",
      bank_account: user?.bank_account || "",
      account_type: user?.account_type || "corrente",
      pix_key: user?.pix_key || "",
      is_active: user?.is_active ?? true,
      bio: user?.bio || "",
      notes: user?.notes || "",
    },
  });
  
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
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
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
  
  // Atualizar usuário mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário atualizado",
        description: "O usuário foi atualizado com sucesso.",
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
                <TabsContent value="info_adicional" className="space-y-4 mt-0">
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
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">Ativo</FormLabel>
                        <FormDescription className="text-xs">
                          Usuários inativos não poderão acessar o sistema.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Tab: Dados Bancários */}
                <TabsContent value="dados_bancarios" className="space-y-4 mt-0">
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
                  
                  <div className="grid grid-cols-2 gap-4">
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
                            <Input placeholder="Número da conta com dígito" {...field} value={field.value || ""} />
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
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                            <SelectItem value="poupanca">Conta Poupança</SelectItem>
                            <SelectItem value="pagamento">Conta Pagamento</SelectItem>
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
                          <Input placeholder="CPF, CNPJ, celular, email ou chave aleatória" {...field} value={field.value || ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações Gerais</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Informações adicionais relevantes"
                              className="resize-none"
                              rows={3}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                disabled={updateUserMutation.isPending || createUserMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateUserMutation.isPending || createUserMutation.isPending}
              >
                {(updateUserMutation.isPending || createUserMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {user ? "Salvar alterações" : "Criar usuário"}
              </Button>
            </div>
          </Form>
        </div>
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Componente principal da página de equipe
export default function Team() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  const { toast } = useToast();
  
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users']
  });
  
  // Fetch tasks
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks']
  });
  
  // Filter users based on search term
  const filteredUsers = users?.filter((user: any) => {
    if (searchTerm === "") return true;
    
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Get tasks for a user
  const getTasksForUser = (userId: number) => {
    return tasks?.filter((task: any) => task.assigned_to === userId) || [];
  };
  
  // Navigation
  const [, setLocation] = useLocation();
  
  // Handler for viewing user profile
  const handleViewProfile = (user: any) => {
    setLocation(`/team/user/${user.id}`);
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
  
  // Confirm deletion
  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
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
              {users?.map((user: any) => (
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
          filteredUsers?.map((user: any) => (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 h-16 relative">
                  <UserAvatar user={user} className="h-16 w-16 absolute -bottom-8 left-4 border-4 border-white" />
                  <div className="absolute top-3 right-3">
                    <Badge variant={
                      user.role === "admin" ? "destructive" : 
                      user.role === "manager" ? "default" : 
                      user.role === "editor" ? "secondary" : 
                      "outline"
                    }>
                      {user.role === "admin" ? "Admin" : 
                      user.role === "manager" ? "Gestor" : 
                      user.role === "editor" ? "Editor" : 
                      "Visualizador"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-10 pb-4">
                <div className="space-y-1 mb-3">
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{user.email}</span>
                  </div>
                </div>
                
                {/* Status e departamento */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {user.department && (
                    <Badge variant="outline" className="bg-gray-50">
                      {user.department}
                    </Badge>
                  )}
                  {user.position && (
                    <Badge variant="outline" className="bg-gray-50">
                      {user.position}
                    </Badge>
                  )}
                  {user.is_active !== undefined && (
                    <Badge 
                      variant={user.is_active ? "secondary" : "outline"}
                      className={user.is_active ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
                    >
                      {user.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  )}
                </div>
                
                {/* Contagem de tarefas */}
                <div className="text-sm text-muted-foreground">
                  <p>Tarefas: {getTasksForUser(user.id).length}</p>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleViewProfile(user)}
                    className="h-8 text-xs"
                  >
                    Ver Perfil
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEditUser(user)}
                    className="h-8 text-xs"
                  >
                    Editar
                  </Button>
                  {(currentUser?.role === "admin" || currentUser?.id === user.id) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteUser(user)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={user.id === currentUser?.id}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Modals */}
      <UserEditDialog 
        isOpen={isUserDialogOpen} 
        onClose={() => setIsUserDialogOpen(false)} 
        user={editingUser}
      />
      
      <DeleteUserConfirmDialog 
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteUser}
        isDeleting={deleteUserMutation.isPending}
        userName={userToDelete?.name || ""}
      />
    </div>
  );
}
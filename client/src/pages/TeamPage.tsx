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
import { useState } from "react";
import { z } from "zod";
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
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { UserAvatar } from "@/components/UserAvatar";
import { UserEditDialog } from "@/components/UserEditDialog";

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

// Componente de diálogo para confirmar exclusão de usuário
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
          <AlertDialogTitle>Remover usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover o usuário <span className="font-semibold">{userName}</span>? Esta ação não pode ser desfeita.
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
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Componente para estatísticas da equipe
function TeamStatistics({ users, tasks, projects }: { users: any[]; tasks: any[]; projects: any[] }) {
  // Contagem de usuários por função
  const admins = users.filter(u => u.role === "admin").length;
  const managers = users.filter(u => u.role === "manager").length;
  const editors = users.filter(u => u.role === "editor").length;
  const viewers = users.filter(u => u.role === "viewer").length;
  
  // Contagem de projetos ativos
  const activeProjects = projects.filter(p => p.status === "active").length;
  const completedProjects = projects.filter(p => p.status === "completed").length;
  
  // Contagem de tarefas pendentes
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-muted-foreground text-sm">Membros da Equipe</span>
            <span className="text-3xl font-bold">{users.length}</span>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="destructive" className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {admins} Admin{admins !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="default" className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {managers} Gestor{managers !== 1 ? "es" : ""}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {editors} Editor{editors !== 1 ? "es" : ""}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {viewers} Visualizador{viewers !== 1 ? "es" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-muted-foreground text-sm">Projetos</span>
            <span className="text-3xl font-bold">{projects.length}</span>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="default" className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {activeProjects} Ativo{activeProjects !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="success" className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {completedProjects} Finalizado{completedProjects !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-muted-foreground text-sm">Tarefas</span>
            <span className="text-3xl font-bold">{tasks.length}</span>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="warning" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {pendingTasks} Pendente{pendingTasks !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="success" className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {completedTasks} Finalizada{completedTasks !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-muted-foreground text-sm">Departamentos</span>
            <span className="text-3xl font-bold">
              {Array.from(new Set(users.map(u => u.department).filter(Boolean))).length}
            </span>
            <div className="space-y-1 mt-2 text-sm text-muted-foreground">
              {Array.from(new Set(users.map(u => u.department).filter(Boolean)))
                .sort()
                .slice(0, 3)
                .map((department, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{department}</span>
                  </div>
              ))}
              {Array.from(new Set(users.map(u => u.department).filter(Boolean))).length > 3 && (
                <div className="text-xs text-muted-foreground italic">
                  + {Array.from(new Set(users.map(u => u.department).filter(Boolean))).length - 3} mais
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para atividades recentes da equipe
function TeamActivities({ users, tasks }: { users: any[]; tasks: any[] }) {
  // Ordenar tarefas por data de atualização, mais recentes primeiro
  const recentTasks = tasks
    .filter(t => t.assigned_to)
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {recentTasks.length > 0 ? (
          <div className="space-y-4">
            {recentTasks.map((task, index) => {
              const assignedUser = users.find(u => u.id === task.assigned_to);
              return (
                <div key={index} className="flex items-start gap-3">
                  <UserAvatar user={assignedUser} className="h-8 w-8" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{assignedUser?.name || "Usuário"}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.completed ? "Finalizou" : "Está trabalhando em"} a tarefa: {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(task.updated_at || task.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p>Nenhuma atividade recente registrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para alocação de projetos
function TeamProjectAllocation({ users, projects }: { users: any[]; projects: any[] }) {
  // Contar projetos por usuário
  const projectsByUser = users.map(user => {
    const userProjects = projects.filter(p => 
      p.members && p.members.some((member: any) => member.user_id === user.id)
    );
    
    return {
      ...user,
      projectCount: userProjects.length,
      activeProjectCount: userProjects.filter(p => p.status === "active").length
    };
  }).sort((a, b) => b.projectCount - a.projectCount).slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Alocação em Projetos</CardTitle>
      </CardHeader>
      <CardContent>
        {projectsByUser.length > 0 ? (
          <div className="space-y-4">
            {projectsByUser.map((user, index) => {
              const projectPercent = user.projectCount > 0 
                ? Math.round((user.activeProjectCount / user.projectCount) * 100) 
                : 0;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={user} className="h-7 w-7" />
                      <span className="text-sm font-medium">{user.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {user.projectCount} projeto{user.projectCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${projectPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{user.activeProjectCount} ativos</span>
                    <span>{projectPercent}% capacidade</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p>Sem dados de alocação disponíveis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Team() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  // Estados
  const [searchTerm, setSearchTerm] = useState("");
  const [showTeamStats, setShowTeamStats] = useState(true);
  const [showCardView, setShowCardView] = useState(true);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  // Queries
  const { 
    data: users,
    isLoading,
    error 
  } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    }
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tasks");
      return res.json();
    }
  });
  
  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/projects");
      return res.json();
    }
  });
  
  // Filtrar usuários
  const filteredUsers = users?.filter((user: any) => {
    // Filtro de busca
    const searchMatch = 
      !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.position?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de usuários inativos
    const activeMatch = showInactiveUsers || user.is_active !== false;
    
    return searchMatch && activeMatch;
  });
  
  // Obter tarefas para um usuário
  const getTasksForUser = (userId: number) => {
    return tasks?.filter((task: any) => task.assigned_to === userId) || [];
  };
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuário removido",
        description: "O usuário foi removido com sucesso.",
        variant: "default",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    }
  });
  
  // Handlers
  function handleEditUser(user: any) {
    setEditingUser(user);
    setIsUserDialogOpen(true);
  }
  
  function handleDeleteUser(user: any) {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  }
  
  function confirmDeleteUser() {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  }
  
  function handleViewProfile(user: any) {
    setLocation(`/team/${user.id}`);
  }
  
  // Renderização
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)]">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Erro ao carregar dados</h1>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "Ocorreu um erro ao buscar os dados da equipe."}
        </p>
        <Button onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Equipe</h1>
        <Button onClick={() => {
          setEditingUser(null);
          setIsUserDialogOpen(true);
        }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>
      
      {/* Card de visão geral */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-xl font-semibold mb-2">Visão Geral da Equipe</div>
            <div className="text-muted-foreground mb-4">
              Gerencie membros da equipe, defina permissões e visualize informações de contato.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        {/* Debug info (remover após depuração) */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="text-[8px] text-black/50 bg-gray-100 px-1 rounded">Role: {user.role}</span>
                        )}
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
      {/* Estatísticas da equipe */}
      {showTeamStats && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Visão Geral da Equipe</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowTeamStats(!showTeamStats)}
              className="h-8 text-xs"
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Esconder Estatísticas
            </Button>
          </div>
          
          {/* Estatísticas principais */}
          <TeamStatistics users={users || []} tasks={tasks || []} projects={projects || []} />
          
          {/* Grid para módulos adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Atividades recentes */}
            <TeamActivities users={users || []} tasks={tasks || []} />
            
            {/* Distribuição de projetos */}
            <TeamProjectAllocation users={users || []} projects={projects || []} />
          </div>
        </>
      )}
      
      {!showTeamStats && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Membros da Equipe</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowTeamStats(!showTeamStats)}
            className="h-8 text-xs"
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Mostrar Estatísticas
          </Button>
        </div>
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
                    {/* Debug info (remover após depuração) */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-1 text-[8px] text-black/50">Role: {user.role}</div>
                    )}
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
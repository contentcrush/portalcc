import { useState } from "react";
import { 
  AlertCircle, 
  Edit, 
  Loader2, 
  Mail, 
  Plus, 
  Trash2, 
  User, 
  UserCog, 
  UserPlus 
} from "lucide-react";
import { useLocation } from "wouter";
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

export default function Team() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  // Estados
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  // Buscar usuários
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
    setLocation(`/team/user/${user.id}`);
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
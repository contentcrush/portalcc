import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Mail,
  Phone,
  Building,
  User,
  MapPin,
  Globe,
  FileText,
  Briefcase,
  Calendar,
  CreditCard,
  PiggyBank,
  ChevronLeft,
  Edit,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Banknote
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UserEditDialog } from "../pages/team";

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const userId = parseInt(id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Verifica permissões - apenas admin e manager podem ver perfis detalhados
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin" && currentUser.role !== "manager") {
      toast({
        title: "Acesso restrito",
        description: "Você não tem permissão para acessar esta página",
        variant: "destructive",
      });
      setLocation("/team");
    }
  }, [currentUser, setLocation, toast]);

  // Buscar dados do usuário
  const { data: user, isLoading, error } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId && (currentUser?.role === "admin" || currentUser?.role === "manager"),
  });

  // Buscar projetos associados ao usuário
  const { data: projects } = useQuery({
    queryKey: [`/api/users/${userId}/projects`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId && (currentUser?.role === "admin" || currentUser?.role === "manager"),
  });

  // Buscar tarefas associadas ao usuário
  const { data: tasks } = useQuery({
    queryKey: [`/api/users/${userId}/tasks`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId && (currentUser?.role === "admin" || currentUser?.role === "manager"),
  });

  // Buscar transações financeiras associadas ao usuário (apenas para Admin)
  const { data: transactions } = useQuery({
    queryKey: [`/api/users/${userId}/transactions`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!userId && currentUser?.role === "admin",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-160px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)]">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Erro ao carregar dados do usuário</h1>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "Usuário não encontrado ou acesso negado"}
        </p>
        <Button onClick={() => setLocation("/team")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Voltar para Equipe
        </Button>
      </div>
    );
  }

  // Calcular status de projetos ativos
  const activeProjects = projects?.filter(p => 
    p.status !== "completed" && p.status !== "canceled"
  ) || [];
  
  // Calcular tarefas pendentes
  const pendingTasks = tasks?.filter(t => !t.completed) || [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão de voltar e ações */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/team")}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Voltar para Equipe
        </Button>
        
        {(currentUser?.role === "admin" || (currentUser?.role === "manager" && user.role !== "admin")) && (
          <Button onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Perfil
          </Button>
        )}
        
        {/* Modal de Edição de Usuário */}
        {user && (
          <UserEditDialog
            isOpen={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            user={user}
            isAdmin={currentUser?.role === "admin"}
          />
        )}
      </div>
      
      {/* Cartão de perfil principal */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <UserAvatar user={user} className="h-24 w-24" />
            
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <Badge 
                  variant={
                    user.role === "admin" ? "destructive" : 
                    user.role === "manager" ? "default" : 
                    user.role === "editor" ? "secondary" : 
                    "outline"
                  }
                >
                  {user.role === "admin" ? "Admin" : 
                   user.role === "manager" ? "Gestor" : 
                   user.role === "editor" ? "Editor" : "Visualizador"}
                </Badge>
                {user.user_type && (
                  <Badge variant="success">
                    {user.user_type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}
                  </Badge>
                )}
                {user.is_active === false && (
                  <Badge variant="outline" className="text-gray-500 bg-gray-100">
                    Inativo
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-muted-foreground">
                {user.department && (
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-1" />
                    <span>{user.department}</span>
                    {user.position && (
                      <span className="ml-1">• {user.position}</span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    Desde {user.created_at ? format(new Date(user.created_at), "MMM yyyy", { locale: ptBR }) : "N/A"}
                  </span>
                </div>
              </div>
              
              {user.bio && (
                <p className="text-sm mt-2 text-muted-foreground">{user.bio}</p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">Projetos Ativos</span>
                <span className="text-2xl font-bold">{activeProjects.length}</span>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">Tarefas Pendentes</span>
                <span className="text-2xl font-bold">{pendingTasks.length}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Informações de Contato</h3>
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                
                {user.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                
                {user.mobile_phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{user.mobile_phone} (Celular)</span>
                  </div>
                )}
                
                {user.username && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>@{user.username}</span>
                  </div>
                )}
                
                {user.website && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                    <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-600 hover:underline"
                    >
                      {user.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Detalhes Comerciais</h3>
              <Separator />
              
              <div className="space-y-2">
                {user.document && (
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {user.user_type === "pj" ? "CNPJ: " : "CPF: "}
                      {user.document}
                    </span>
                  </div>
                )}
                
                {user.area && (
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Área de atuação: {user.area}</span>
                  </div>
                )}
                
                {user.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                    <span>{user.address}</span>
                  </div>
                )}
                
                {user.user_type === "pj" && user.contact_name && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      Contato: {user.contact_name}
                      {user.contact_position && ` (${user.contact_position})`}
                    </span>
                  </div>
                )}
                
                {user.user_type === "pj" && user.contact_email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Email de contato: {user.contact_email}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mostrar dados bancários apenas para Admin */}
            {currentUser?.role === "admin" && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Dados Bancários</h3>
                <Separator />
                
                <div className="space-y-2">
                  {user.bank && (
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Banco: {user.bank}</span>
                    </div>
                  )}
                  
                  {user.bank_agency && (
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        Agência: {user.bank_agency}
                        {user.bank_account && ` | Conta: ${user.bank_account}`}
                        {user.account_type && ` (${user.account_type})`}
                      </span>
                    </div>
                  )}
                  
                  {user.pix_key && (
                    <div className="flex items-center">
                      <PiggyBank className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Chave PIX: {user.pix_key}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {user.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Observações</h3>
              <Separator className="mb-2" />
              <p className="text-sm whitespace-pre-line">{user.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs para informações relacionadas */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="projects">Projetos</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          {currentUser?.role === "admin" && (
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          )}
        </TabsList>
        
        {/* Tab: Projetos */}
        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Projetos</CardTitle>
              <CardDescription>Projetos associados a este usuário</CardDescription>
            </CardHeader>
            <CardContent>
              {projects && projects.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/projects/${project.id}`)}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            project.status === "active" ? "default" :
                            project.status === "completed" ? "success" :
                            project.status === "paused" ? "warning" :
                            "outline"
                          }>
                            {project.status === "active" ? "Ativo" :
                             project.status === "completed" ? "Concluído" :
                             project.status === "paused" ? "Pausado" :
                             project.status === "canceled" ? "Cancelado" : 
                             project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{project.role || "Membro"}</TableCell>
                        <TableCell>{project.progress || 0}%</TableCell>
                        <TableCell>
                          {project.endDate ? format(new Date(project.endDate), "dd/MM/yyyy") : "Sem prazo"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Nenhum projeto associado a este usuário</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Tarefas */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tarefas</CardTitle>
              <CardDescription>Tarefas atribuídas a este usuário</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarefa</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/tasks?id=${task.id}`)}>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell>
                          {task.project_name || "Sem projeto"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {task.completed ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                <span>Concluída</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-amber-500 mr-2" />
                                <span>Pendente</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.due_date ? (
                            <div className={`flex items-center ${new Date(task.due_date) < new Date() && !task.completed ? 'text-red-500' : ''}`}>
                              <Calendar className="h-4 w-4 mr-2" />
                              {format(new Date(task.due_date), "dd/MM/yyyy")}
                            </div>
                          ) : (
                            "Sem prazo"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Nenhuma tarefa atribuída a este usuário</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Financeiro (apenas para Admin) */}
        {currentUser?.role === "admin" && (
          <TabsContent value="financial" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Financeiro</CardTitle>
                <CardDescription>Informações financeiras relacionadas a este usuário</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions && transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/financial?id=${transaction.id}`)}>
                          <TableCell className="font-medium">
                            {transaction.description || transaction.document_type || "Transação"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === "income" ? "success" : "destructive"}>
                              {transaction.type === "income" ? "Receita" : "Despesa"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            {transaction.date ? format(new Date(transaction.date), "dd/MM/yyyy") : 
                             transaction.payment_date ? format(new Date(transaction.payment_date), "dd/MM/yyyy") : 
                             transaction.due_date ? format(new Date(transaction.due_date), "dd/MM/yyyy") : 
                             "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              transaction.status === "paid" || transaction.paid ? "success" :
                              transaction.status === "pending" ? "warning" :
                              transaction.status === "overdue" ? "destructive" :
                              "outline"
                            }>
                              {transaction.status === "paid" || transaction.paid ? "Pago" :
                               transaction.status === "pending" ? "Pendente" :
                               transaction.status === "overdue" ? "Atrasado" :
                               transaction.status || "N/A"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Banknote className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>Nenhuma transação financeira associada a este usuário</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
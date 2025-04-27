import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  LockIcon, 
  UserIcon, 
  ShieldIcon, 
  BellIcon, 
  Languages, 
  GlobeIcon, 
  EyeIcon, 
  ZoomInIcon, 
  MonitorSmartphoneIcon, 
  MousePointerSquareDashedIcon, 
  RotateCcw 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAccessibility } from "@/hooks/use-accessibility";

// Definição dos tipos de usuário e suas permissões
interface Permission {
  id: string;
  name: string;
  admin: boolean;
  manager: boolean;
  creator: boolean;
  description?: string;
  category: 'dashboard' | 'projects' | 'tasks' | 'users';
}

// Lista de permissões organizadas por categoria
const permissions: Permission[] = [
  // Dashboard
  { 
    id: "access_dashboard", 
    name: "Acessar Dashboard", 
    admin: true, 
    manager: true, 
    creator: true,
    description: "Permite visualizar o painel principal com métricas e resumos",
    category: "dashboard"
  },
  { 
    id: "view_financial_reports", 
    name: "Visualizar relatórios financeiros", 
    admin: true, 
    manager: false, 
    creator: false,
    description: "Permite acessar e visualizar relatórios financeiros e orçamentos",
    category: "dashboard"
  },
  { 
    id: "view_financial_details", 
    name: "Acessar detalhes financeiros", 
    admin: true, 
    manager: false, 
    creator: false,
    description: "Permite ver custos, orçamentos e detalhes de faturamento",
    category: "dashboard"
  },
  { 
    id: "view_team_performance", 
    name: "Ver performance da equipe", 
    admin: true, 
    manager: true, 
    creator: false,
    description: "Permite visualizar métricas e relatórios de desempenho da equipe",
    category: "dashboard"
  },
  
  // Projetos
  { 
    id: "view_all_jobs", 
    name: "Visualizar todos os Jobs", 
    admin: true, 
    manager: true, 
    creator: true,
    description: "Permite ver todos os projetos cadastrados no sistema",
    category: "projects"
  },
  { 
    id: "view_job_financials", 
    name: "Ver informações financeiras dos Jobs", 
    admin: true, 
    manager: false, 
    creator: false,
    description: "Permite visualizar custos e orçamentos dos projetos",
    category: "projects"
  },
  { 
    id: "create_edit_jobs", 
    name: "Criar/Editar Jobs", 
    admin: true, 
    manager: true, 
    creator: true,
    description: "Permite criar novos projetos e editar projetos existentes",
    category: "projects"
  },
  { 
    id: "approve_jobs", 
    name: "Aprovar Jobs / Mudar status", 
    admin: true, 
    manager: true, 
    creator: false,
    description: "Permite aprovar projetos e alterar seus status",
    category: "projects"
  },
  { 
    id: "duplicate_jobs", 
    name: "Duplicar Jobs", 
    admin: true, 
    manager: true, 
    creator: true,
    description: "Permite duplicar projetos existentes para criar novos",
    category: "projects"
  },
  { 
    id: "delete_jobs", 
    name: "Excluir Jobs", 
    admin: true, 
    manager: false, 
    creator: false,
    description: "Permite excluir projetos do sistema",
    category: "projects"
  },
  
  // Tarefas
  { 
    id: "view_all_tasks", 
    name: "Visualizar todas as tarefas", 
    admin: true, 
    manager: true, 
    creator: false,
    description: "Permite visualizar todas as tarefas do sistema",
    category: "tasks"
  },
  { 
    id: "view_assigned_tasks", 
    name: "Visualizar tarefas atribuídas", 
    admin: true, 
    manager: true, 
    creator: true,
    description: "Permite visualizar apenas as tarefas atribuídas ao usuário",
    category: "tasks"
  },
  { 
    id: "create_edit_tasks", 
    name: "Criar/Editar tarefas", 
    admin: true, 
    manager: true, 
    creator: true,
    description: "Permite criar e editar tarefas",
    category: "tasks"
  },
  { 
    id: "assign_tasks", 
    name: "Atribuir tarefas a usuários", 
    admin: true, 
    manager: true, 
    creator: false,
    description: "Permite atribuir tarefas a outros usuários",
    category: "tasks"
  },
  { 
    id: "upload_files", 
    name: "Upload de arquivos", 
    admin: true, 
    manager: true, 
    creator: true,
    description: "Permite fazer upload de arquivos para os projetos e tarefas",
    category: "tasks"
  },
  
  // Usuários
  { 
    id: "view_users", 
    name: "Visualizar usuários", 
    admin: true, 
    manager: true, 
    creator: false,
    description: "Permite visualizar a lista de usuários do sistema",
    category: "users"
  },
  { 
    id: "manage_users", 
    name: "Gerenciar usuários (CRUD)", 
    admin: true, 
    manager: false, 
    creator: false,
    description: "Permite adicionar, editar, visualizar e remover usuários do sistema",
    category: "users"
  },
  { 
    id: "assign_roles", 
    name: "Atribuir funções a usuários", 
    admin: true, 
    manager: false, 
    creator: false,
    description: "Permite alterar a função (papel) de um usuário no sistema",
    category: "users"
  }
];

// Componente para a aba de RBAC (Role-Based Access Control)
function RBACSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [localPermissions, setLocalPermissions] = useState<Permission[]>(permissions);
  const [showEditorNote, setShowEditorNote] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'dashboard' | 'projects' | 'tasks' | 'users'>('dashboard');

  // Nota: Comentamos temporariamente a verificação de permissão para que todos possam ver a aba de RBAC
  /*
  if (user?.role !== "admin") {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar as configurações de RBAC. 
            Esta seção está disponível apenas para administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  */

  // Função para atualizar uma permissão específica e mostrar notificação
  const handlePermissionChange = (permissionId: string, role: 'admin' | 'manager' | 'creator', value: boolean) => {
    // Atualiza o estado imediatamente
    setLocalPermissions(prevPermissions => 
      prevPermissions.map(perm => 
        perm.id === permissionId ? { ...perm, [role]: value } : perm
      )
    );
    
    // Mostra notificação de alteração feita
    const permission = permissions.find(p => p.id === permissionId);
    const roleMap: Record<string, string> = {
      'admin': 'Administrador',
      'manager': 'Gestor',
      'creator': 'Creator'
    };
    
    toast({
      title: `Permissão ${value ? 'ativada' : 'desativada'}`,
      description: `${permission?.name} para ${roleMap[role]} foi ${value ? 'ativada' : 'desativada'}.`,
      duration: 3000,
    });
    
    // Aqui seria feita uma requisição ao backend para persistir as alterações
    // No caso real, enviaria os dados para a API
  };

  // Filtra as permissões pela categoria ativa
  const filteredPermissions = localPermissions.filter(
    permission => permission.category === activeCategory
  );

  // Renderiza a tabela de permissões para uma categoria específica
  const renderPermissionsTable = () => {
    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[300px]">Permissão</TableHead>
            <TableHead className="text-center">Admin</TableHead>
            <TableHead className="text-center">Gestor</TableHead>
            <TableHead className="text-center">Creator</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPermissions.map((permission) => (
            <TableRow key={permission.id}>
              <TableCell className="font-medium">
                <div>
                  {permission.name}
                  {permission.description && (
                    <p className="text-xs text-muted-foreground mt-1">{permission.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Switch 
                  checked={permission.admin} 
                  onCheckedChange={(value) => handlePermissionChange(permission.id, 'admin', value)}
                  disabled={permission.id === "manage_users"} // Admins sempre precisam poder gerenciar usuários
                  className="data-[state=checked]:bg-green-500"
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch 
                  checked={permission.manager} 
                  onCheckedChange={(value) => handlePermissionChange(permission.id, 'manager', value)}
                  className="data-[state=checked]:bg-green-500"
                />
              </TableCell>
              <TableCell className="text-center">
                <Switch 
                  checked={permission.creator} 
                  onCheckedChange={(value) => handlePermissionChange(permission.id, 'creator', value)}
                  className="data-[state=checked]:bg-green-500"
                />
                {permission.id === "create_edit_jobs" && permission.creator && (
                  <div className="text-xs text-muted-foreground mt-1">(apenas jobs atribuídos)</div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {showEditorNote && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Permissões do Sistema</AlertTitle>
          <AlertDescription className="text-blue-600">
            Configure quais funções têm acesso a quais recursos. Clique nos seletores para ativar ou desativar permissões.
            As alterações são aplicadas automaticamente.
          </AlertDescription>
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-2 right-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            onClick={() => setShowEditorNote(false)}
          >
            Fechar
          </Button>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <LockIcon className="h-5 w-5 text-amber-500" />
            <CardTitle>Permissões por Tipo de Usuário</CardTitle>
          </div>
          <CardDescription>
            Configure quais recursos cada tipo de usuário pode acessar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Navegação entre categorias de permissões */}
          <div className="mb-6">
            <div className="border rounded-lg flex overflow-hidden">
              <button 
                className={`flex-1 py-2 px-4 text-center font-medium ${activeCategory === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                onClick={() => setActiveCategory('dashboard')}
              >
                Dashboard
              </button>
              <button 
                className={`flex-1 py-2 px-4 text-center font-medium ${activeCategory === 'projects' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                onClick={() => setActiveCategory('projects')}
              >
                Projetos
              </button>
              <button 
                className={`flex-1 py-2 px-4 text-center font-medium ${activeCategory === 'tasks' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                onClick={() => setActiveCategory('tasks')}
              >
                Tarefas
              </button>
              <button 
                className={`flex-1 py-2 px-4 text-center font-medium ${activeCategory === 'users' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                onClick={() => setActiveCategory('users')}
              >
                Usuários
              </button>
            </div>
          </div>
          
          {/* Tabela de permissões da categoria selecionada */}
          {renderPermissionsTable()}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para a aba de Perfil
function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações de perfil foram atualizadas com sucesso.",
      });
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5 text-blue-500" />
          <CardTitle>Perfil do Usuário</CardTitle>
        </div>
        <CardDescription>
          Atualize suas informações pessoais e preferências.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" defaultValue={user?.department || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input id="position" defaultValue={user?.position || ''} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Biografia</Label>
              <textarea 
                id="bio" 
                className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                defaultValue={user?.bio || ''} 
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Alteração de Senha</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div></div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input id="confirmPassword" type="password" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Componente para a aba de Notificações
function NotificationSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState({
    projectUpdates: true,
    taskAssignments: true,
    mentions: true,
    reminders: false,
    newsletter: false
  });

  const handleSaveNotifications = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Preferências de notificação atualizadas",
        description: "Suas preferências de notificação foram salvas com sucesso.",
      });
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <BellIcon className="h-5 w-5 text-indigo-500" />
          <CardTitle>Preferências de Notificação</CardTitle>
        </div>
        <CardDescription>
          Gerencie como e quando deseja receber notificações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Notificações por Email</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="project-updates">Atualizações de Projetos</Label>
                  <p className="text-sm text-muted-foreground">Receba emails quando projetos forem atualizados</p>
                </div>
                <Switch 
                  id="project-updates" 
                  checked={emailNotifications.projectUpdates}
                  onCheckedChange={(value) => setEmailNotifications(prev => ({...prev, projectUpdates: value}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="task-assignments">Atribuições de Tarefas</Label>
                  <p className="text-sm text-muted-foreground">Receba emails quando novas tarefas forem atribuídas a você</p>
                </div>
                <Switch 
                  id="task-assignments" 
                  checked={emailNotifications.taskAssignments}
                  onCheckedChange={(value) => setEmailNotifications(prev => ({...prev, taskAssignments: value}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mentions">Menções e Comentários</Label>
                  <p className="text-sm text-muted-foreground">Receba emails quando for mencionado em comentários</p>
                </div>
                <Switch 
                  id="mentions" 
                  checked={emailNotifications.mentions}
                  onCheckedChange={(value) => setEmailNotifications(prev => ({...prev, mentions: value}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reminders">Lembretes de Prazos</Label>
                  <p className="text-sm text-muted-foreground">Receba lembretes de prazos próximos</p>
                </div>
                <Switch 
                  id="reminders" 
                  checked={emailNotifications.reminders}
                  onCheckedChange={(value) => setEmailNotifications(prev => ({...prev, reminders: value}))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="newsletter">Newsletter e Atualizações do Sistema</Label>
                  <p className="text-sm text-muted-foreground">Receba emails sobre novidades e dicas de uso</p>
                </div>
                <Switch 
                  id="newsletter" 
                  checked={emailNotifications.newsletter}
                  onCheckedChange={(value) => setEmailNotifications(prev => ({...prev, newsletter: value}))}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-4">Notificações no Sistema</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Essas notificações sempre serão exibidas no sistema, independentemente das configurações acima.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Novas mensagens diretas</li>
              <li>Solicitações de aprovação</li>
              <li>Alertas de segurança</li>
              <li>Avisos de manutenção do sistema</li>
            </ul>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para a aba de Acessibilidade
function AccessibilitySettings() {
  const { toast } = useToast();
  const [previewMode, setPreviewMode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    highContrast,
    largeText,
    reducedMotion,
    screenReaderMode,
    toggleHighContrast,
    toggleLargeText,
    toggleReducedMotion,
    toggleScreenReaderMode,
    resetAccessibility
  } = useAccessibility();

  // Simulação de salvamento (estas configurações já estão sendo aplicadas automaticamente)
  const handleSaveAccessibility = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Configurações de acessibilidade atualizadas",
        description: "Suas preferências de acessibilidade foram salvas com sucesso.",
      });
      setPreviewMode(null);
    }, 1500);
  };

  // Função para mostrar temporariamente uma prévia do modo selecionado
  const showPreview = (mode: string) => {
    setPreviewMode(mode);
    // Volta para as configurações do usuário após 3 segundos
    setTimeout(() => {
      setPreviewMode(null);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-indigo-50 border-indigo-200">
        <EyeIcon className="h-4 w-4 text-indigo-600" />
        <AlertTitle className="text-indigo-800">Modo de Acessibilidade</AlertTitle>
        <AlertDescription className="text-indigo-600">
          Estas configurações ajudam a melhorar a experiência de uso da aplicação para pessoas com diferentes necessidades.
          As alterações são aplicadas imediatamente e ficam salvas entre sessões.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <EyeIcon className="h-5 w-5 text-purple-500" />
            <CardTitle>Configurações de Acessibilidade</CardTitle>
          </div>
          <CardDescription>
            Personalize a interface para atender às suas necessidades de acessibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Alto Contraste */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="bg-gray-900 rounded-md p-2">
                    <MousePointerSquareDashedIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">Alto Contraste</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aumenta o contraste de cores para melhorar a visibilidade e legibilidade.
                      Útil para pessoas com baixa visão ou daltonismo.
                    </p>
                    <Button 
                      variant="link" 
                      className="text-sm p-0 h-auto text-blue-600 mt-1"
                      onClick={() => showPreview('high-contrast')}
                    >
                      Ver prévia (3s)
                    </Button>
                  </div>
                </div>
                <div>
                  <Switch 
                    checked={previewMode === 'high-contrast' ? true : highContrast}
                    onCheckedChange={toggleHighContrast}
                    aria-label="Ativar modo de alto contraste"
                  />
                </div>
              </div>
              
              {/* Texto Grande */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 rounded-md p-2">
                    <ZoomInIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Texto Grande</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aumenta o tamanho dos textos e elementos da interface para facilitar a leitura.
                      Recomendado para pessoas com dificuldades visuais.
                    </p>
                    <Button 
                      variant="link" 
                      className="text-sm p-0 h-auto text-blue-600 mt-1"
                      onClick={() => showPreview('large-text')}
                    >
                      Ver prévia (3s)
                    </Button>
                  </div>
                </div>
                <div>
                  <Switch 
                    checked={previewMode === 'large-text' ? true : largeText}
                    onCheckedChange={toggleLargeText}
                    aria-label="Ativar modo de texto grande"
                  />
                </div>
              </div>
              
              {/* Movimento Reduzido */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 rounded-md p-2">
                    <MonitorSmartphoneIcon className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Movimento Reduzido</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reduz ou remove animações e efeitos de transição.
                      Útil para pessoas com transtornos vestibulares ou sensibilidade a movimento.
                    </p>
                  </div>
                </div>
                <div>
                  <Switch 
                    checked={reducedMotion}
                    onCheckedChange={toggleReducedMotion}
                    aria-label="Ativar modo de movimento reduzido"
                  />
                </div>
              </div>
              
              {/* Otimização para Leitor de Tela */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 rounded-md p-2">
                    <MonitorSmartphoneIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Otimização para Leitor de Tela</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Melhora a compatibilidade com leitores de tela, adicionando descrições 
                      mais detalhadas e melhorando a navegação por teclado.
                    </p>
                  </div>
                </div>
                <div>
                  <Switch 
                    checked={screenReaderMode}
                    onCheckedChange={toggleScreenReaderMode}
                    aria-label="Ativar otimização para leitor de tela"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Recursos Adicionais</h3>
              <p className="text-sm text-muted-foreground">
                Além das configurações acima, nossa aplicação também inclui:
              </p>
              
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li><span className="font-medium">Teclas de atalho</span> para as principais funções (pressione <kbd className="bg-gray-100 p-1 rounded border">?</kbd> para ver a lista completa)</li>
                <li><span className="font-medium">Navegação por teclado</span> em todos os elementos interativos</li>
                <li><span className="font-medium">Etiquetas ARIA</span> em todos os componentes para melhor compatibilidade com leitores de tela</li>
                <li><span className="font-medium">Texto alternativo</span> em todas as imagens e ícones informativos</li>
              </ul>
            </div>
            
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                className="flex items-center gap-2" 
                onClick={resetAccessibility}
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar Padrões
              </Button>
              
              <Button 
                onClick={handleSaveAccessibility} 
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para a aba de Idioma e Região
function LocalizationSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState("pt-BR");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  
  const handleSaveLocalization = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Configurações de idioma atualizadas",
        description: "Suas preferências de idioma e região foram salvas com sucesso.",
      });
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <GlobeIcon className="h-5 w-5 text-green-500" />
          <CardTitle>Idioma e Região</CardTitle>
        </div>
        <CardDescription>
          Configure o idioma, fuso horário e formatos regionais.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="language">Idioma da Interface</Label>
              <select 
                id="language" 
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (United States)</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <select 
                id="timezone" 
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="Europe/London">London (GMT+0)</option>
                <option value="Europe/Paris">Paris (GMT+1)</option>
                <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
              </select>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Formatos de Data e Hora</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-format">Formato de Data</Label>
                <select 
                  id="date-format" 
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue="dd/MM/yyyy"
                >
                  <option value="dd/MM/yyyy">31/12/2023</option>
                  <option value="MM/dd/yyyy">12/31/2023</option>
                  <option value="yyyy-MM-dd">2023-12-31</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time-format">Formato de Hora</Label>
                <select 
                  id="time-format" 
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue="HH:mm"
                >
                  <option value="HH:mm">14:30 (24h)</option>
                  <option value="hh:mm a">02:30 PM (12h)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="first-day">Primeiro Dia da Semana</Label>
                <select 
                  id="first-day" 
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  defaultValue="1"
                >
                  <option value="0">Domingo</option>
                  <option value="1">Segunda-feira</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleSaveLocalization} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("rbac");
  
  // Definimos "rbac" como aba padrão para demonstração
  useEffect(() => {
    // Comentamos esta lógica temporariamente para manter a aba de permissões como padrão
    /*
    if (user?.role === "admin") {
      setActiveTab("rbac");
    } else {
      setActiveTab("profile");
    }
    */
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Gerenciar configurações da aplicação</p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full border-b grid grid-cols-1 md:grid-cols-5 mb-8">
          <TabsTrigger value="profile" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <UserIcon className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <BellIcon className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <EyeIcon className="h-4 w-4 mr-2" />
            Acessibilidade
          </TabsTrigger>
          <TabsTrigger value="localization" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <Languages className="h-4 w-4 mr-2" />
            Idioma e Região
          </TabsTrigger>
          {/* Mostrar para todos temporariamente - normalmente seria apenas para administradores */}
          <TabsTrigger value="rbac" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
            <ShieldIcon className="h-4 w-4 mr-2" />
            <span>Permissões</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
        
        <TabsContent value="accessibility">
          <AccessibilitySettings />
        </TabsContent>
        
        <TabsContent value="localization">
          <LocalizationSettings />
        </TabsContent>
        
        <TabsContent value="rbac">
          <RBACSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
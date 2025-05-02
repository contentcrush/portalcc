import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, calculatePercentChange, formatDate, cn } from "@/lib/utils";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  BarChart, 
  Bar, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Link, useLocation } from "wouter";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRight, 
  CircleDollarSign, 
  Calendar, 
  CheckCircle2,
  AlertCircle,
  Clock, 
  Building,
  Calendar as CalendarIcon,
  User,
  PlusCircle,
  FolderOpen,
  ListTodo,
  Users,
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectProgress } from "@/components/ProjectProgress";
import { MONTHS } from "@/lib/constants";
import FinancialChart from "@/components/FinancialChart";

// Custom components for dashboard
const StatCard = ({ 
  title, 
  value, 
  change, 
  changeText, 
  icon: Icon, 
  iconColor, 
  iconBg 
}: {
  title: string;
  value: string;
  change: number;
  changeText?: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h2 className="text-3xl font-bold">{value}</h2>
        </div>
        <div className={`p-2 rounded-full ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
      
      {typeof change !== 'undefined' && (
        <div className="flex items-center mt-4 text-sm">
          {change > 0 ? (
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>+{change}%</span>
            </div>
          ) : change < 0 ? (
            <div className="flex items-center text-red-600">
              <ArrowDownRight className="h-4 w-4 mr-1" />
              <span>{change}%</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-500">
              <ArrowRight className="h-4 w-4 mr-1" />
              <span>0%</span>
            </div>
          )}
          <span className="text-muted-foreground ml-1.5">{changeText || 'vs período anterior'}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [period, setPeriod] = useState("Abril 2025");
  const [currentMonth, setCurrentMonth] = useState(() => {
    return format(new Date(), "MMMM yyyy", { locale: ptBR });
  });
  
  // Formatação do título do mês com primeira letra maiúscula
  const formattedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
  
  const { openProjectForm } = useProjectForm();
  
  // Queries para obter dados
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects']
  });
  
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks']
  });
  
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients']
  });
  
  const { data: financialDocuments = [] } = useQuery({
    queryKey: ['/api/financial-documents']
  });
  
  const { data: expenses = [] } = useQuery({
    queryKey: ['/api/expenses']
  });

  // Cálculos das métricas do dashboard
  const activeProjects = projects.filter(p => 
    p.status !== 'concluido' && p.status !== 'cancelado'
  ).length || 0;
  
  const totalProjects = projects.length || 0;
  
  // Tarefas pendentes e atrasadas
  const pendingTasks = tasks.filter(t => !t.completed).length || 0;
  const overdueTasks = tasks.filter(t => {
    if (!t.completed && t.due_date) {
      const dueDate = new Date(t.due_date);
      return dueDate < new Date();
    }
    return false;
  }).length || 0;
  
  // Clientes ativos (com projetos ativos)
  const activeClients = clients.length || 0;
  const newClientsThisMonth = clients.filter(c => {
    if (c.since) {
      const sinceDate = new Date(c.since);
      const today = new Date();
      return sinceDate.getMonth() === today.getMonth() && 
             sinceDate.getFullYear() === today.getFullYear();
    }
    return false;
  }).length || 0;
  
  // Cálculos financeiros
  const currentMonthIncome = financialDocuments.reduce((sum, doc) => {
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    const today = new Date();
    if (docDate && docDate.getMonth() === today.getMonth() && 
        docDate.getFullYear() === today.getFullYear()) {
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0);
  
  const lastMonthIncome = financialDocuments.reduce((sum, doc) => {
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    const today = new Date();
    const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    if (docDate && docDate.getMonth() === lastMonth && 
        docDate.getFullYear() === lastMonthYear) {
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0);
  
  // Calcular percentuais de mudança
  const projectsGrowth = 12; // Percentual de exemplo
  const tasksChange = -5; // Percentual de exemplo
  const clientsGrowth = 8; // Percentual de exemplo
  const incomeGrowth = lastMonthIncome ? Math.round((currentMonthIncome - lastMonthIncome) / lastMonthIncome * 100) : 15;
  
  // Valores absolutos para o faturamento (valores a receber)
  const totalMonthlyIncome = currentMonthIncome || 48500; // Valor de exemplo se não houver dados
  const positiveIncome = 6300; // Valor de exemplo para o incremento
  
  // Chart data
  const monthlyData = [
    { month: 'Jan', revenue: 42000, expenses: 21000 },
    { month: 'Fev', revenue: 48500, expenses: 22500 },
    { month: 'Mar', revenue: 51000, expenses: 24000 },
    { month: 'Abr', revenue: 61500, expenses: 26800 },
    { month: 'Mai', revenue: 68500, expenses: 28000 },
    { month: 'Jun', revenue: 80750, expenses: 29500 },
  ];
  
  const projectData = [
    { name: 'Banco Azul', value: 34000 },
    { name: 'Tech Courses', value: 12500 },
    { name: 'Eco Preserve', value: 28750 },
    { name: 'Marca X', value: 15000 },
  ];
  
  const expenseCategories = [
    { name: 'Equipamentos', value: 32034, percent: 38 },
    { name: 'Pessoal', value: 25390, percent: 30 },
    { name: 'Locação', value: 16880, percent: 20 },
    { name: 'Software', value: 10116, percent: 12 },
  ];
  
  const COLORS = ['#5046E5', '#10B981', '#6366F1', '#EF4444', '#F59E0B'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do desempenho financeiro e progresso de projetos</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-md border p-1">
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border-none bg-transparent focus:ring-0"
            >
              <option value="Q1 2025">Q1 2025</option>
              <option value="Q2 2025">Q2 2025</option>
            </select>
          </div>
          
          <Button onClick={openProjectForm}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>
      </div>
      
      {/* Cards de estatísticas - seguindo o layout de referência */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Projetos Ativos */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Projetos Ativos</h3>
                <div className="mt-1 flex items-baseline">
                  <span className="text-3xl font-bold">{activeProjects}</span>
                  <span className="text-sm text-muted-foreground ml-2">de {totalProjects} total</span>
                </div>
              </div>
              <div className="bg-indigo-100 rounded-md p-2">
                <FolderOpen className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.round((activeProjects / Math.max(totalProjects, 1)) * 100)}%` }}></div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+{projectsGrowth}%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">desde o mês passado</span>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas Pendentes */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tarefas Pendentes</h3>
                <div className="mt-1 flex items-baseline">
                  <span className="text-3xl font-bold">{pendingTasks}</span>
                  <span className="text-sm text-red-500 ml-2">{overdueTasks ? `${overdueTasks} atrasadas` : ''}</span>
                </div>
              </div>
              <div className="bg-amber-100 rounded-md p-2">
                <ListTodo className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${pendingTasks ? Math.min(pendingTasks * 10, 100) : 0}%` }}></div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-red-600">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                <span>{tasksChange}%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">desde a semana passada</span>
            </div>
          </CardContent>
        </Card>

        {/* Clientes Ativos */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Clientes Ativos</h3>
                <div className="mt-1 flex items-baseline">
                  <span className="text-3xl font-bold">{activeClients}</span>
                  <span className="text-sm text-green-500 ml-2">{newClientsThisMonth ? `${newClientsThisMonth} novos este mês` : ''}</span>
                </div>
              </div>
              <div className="bg-blue-100 rounded-md p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(activeClients * 8, 100)}%` }}></div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+{clientsGrowth}%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">desde o trimestre passado</span>
            </div>
          </CardContent>
        </Card>

        {/* Faturamento Mensal */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Faturamento Mensal</h3>
                <div className="mt-1">
                  <span className="text-3xl font-bold">R$ {formatCurrency(totalMonthlyIncome, false)}</span>
                </div>
              </div>
              <div className="bg-purple-100 rounded-md p-2">
                <CircleDollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+{incomeGrowth}%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">comparado ao mês anterior</span>
            </div>
            <div className="mt-2 text-sm text-green-600">
              <span>R$ {formatCurrency(positiveIncome, false)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <FinancialChart 
          type="area"
          title="Tendência Mensal"
          data={monthlyData}
          dataKeys={['revenue', 'expenses']}
          xAxisDataKey="month"
          colors={['#5046E5', '#EF4444']}
        />
        
        <FinancialChart 
          type="bar"
          title="Receita por Projeto"
          data={projectData}
          dataKeys={['value']}
          xAxisDataKey="name"
          colors={['#5046E5']}
        />
      </div>
      
      {/* Projetos em Andamento e Despesas */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Lista de Projetos Ativos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Projetos em Andamento</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {Array.isArray(projects) && projects.length > 0 ? (
              <div className="divide-y">
                {projects
                  .filter(p => p.status !== 'concluido' && p.status !== 'cancelado')
                  .slice(0, 4)
                  .map((project) => {
                    // Calcular progresso do projeto
                    const progress = project.progress || 0;
                    const daysRemaining = project.endDate ? calculateDaysRemaining(new Date(project.endDate)) : 0;
                    
                    return (
                      <div key={project.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <StatusBadge status={project.status} small={true} minimal={true} />
                              <Link href={`/projects/${project.id}`}>
                                <p className="font-medium hover:text-primary cursor-pointer">{project.name}</p>
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {daysRemaining > 0 
                                  ? `${daysRemaining} dias restantes` 
                                  : daysRemaining === 0 
                                    ? "Vence hoje" 
                                    : `Atrasado em ${Math.abs(daysRemaining)} dias`
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(project.budget || 0)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-4 flex-shrink-0">
                            <div className="flex flex-col items-end">
                              <div className="mb-1">
                                <ProjectProgress project={project} compact={true} showPercent={true} />
                              </div>
                              <div className="flex items-center mt-1">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">Nenhum projeto ativo no momento</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={openProjectForm}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Criar Novo Projeto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Lista de Tarefas Próximas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Tarefas Próximas</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-600">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {Array.isArray(tasks) && tasks.length > 0 ? (
              <div className="divide-y">
                {tasks
                  .filter(t => !t.completed)
                  .sort((a, b) => {
                    // Primeiro ordenar por tarefas atrasadas
                    const aIsOverdue = a.due_date && new Date(a.due_date) < new Date();
                    const bIsOverdue = b.due_date && new Date(b.due_date) < new Date();
                    
                    if (aIsOverdue && !bIsOverdue) return -1;
                    if (!aIsOverdue && bIsOverdue) return 1;
                    
                    // Depois ordenar por data de vencimento
                    if (a.due_date && b.due_date) {
                      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                    }
                    
                    return 0;
                  })
                  .slice(0, 4)
                  .map((task) => {
                    // Verificar se está atrasada
                    const dueDate = task.due_date ? new Date(task.due_date) : null;
                    const isOverdue = dueDate && dueDate < new Date();
                    const daysRemaining = dueDate ? calculateDaysRemaining(dueDate) : null;
                    
                    // Determinar cor da prioridade
                    const priorityColor = {
                      baixa: "bg-emerald-50 text-emerald-800 border-emerald-200",
                      media: "bg-amber-50 text-amber-800 border-amber-200",
                      alta: "bg-orange-50 text-orange-800 border-orange-200",
                      critica: "bg-red-50 text-red-800 border-red-200"
                    };
                    
                    return (
                      <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center",
                              isOverdue ? "bg-red-100" : "bg-amber-100"
                            )}>
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                isOverdue ? "bg-red-500" : "bg-amber-500"
                              )}></div>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <Link href={`/tasks/${task.id}`}>
                              <p className="font-medium hover:text-primary cursor-pointer">{task.title}</p>
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">
                              {isOverdue 
                                ? `Atrasada em ${Math.abs(daysRemaining || 0)} dias` 
                                : daysRemaining === 0 
                                  ? "Vence hoje" 
                                  : daysRemaining === 1 
                                    ? "Vence amanhã" 
                                    : `Vence em ${daysRemaining} dias`
                              }
                            </p>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <Badge 
                              variant="outline" 
                              className={priorityColor[task.priority || 'media']}
                            >
                              {task.priority === 'baixa' ? 'Baixa' : 
                               task.priority === 'media' ? 'Média' : 
                               task.priority === 'alta' ? 'Alta' : 
                               task.priority === 'critica' ? 'Crítica' : 'Média'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">Nenhuma tarefa pendente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Tarefas Próximas */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-1">
        <Card className="dashboard-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Tarefas Próximas</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div>
              <div className="border-b p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Finalizar edição do teaser - Banco Azul</p>
                    <p className="text-xs text-muted-foreground mt-1">Vence em 2 dias</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Média</Badge>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <img 
                    src="https://randomuser.me/api/portraits/men/32.jpg" 
                    alt="Bruno Silva" 
                    className="h-6 w-6 rounded-full border-2 border-white"
                  />
                </div>
              </div>

              <div className="border-b p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Aprovar storyboard - Documentário Natureza</p>
                    <p className="text-xs text-red-600 mt-1">Vence hoje</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Alta</Badge>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <img 
                    src="https://randomuser.me/api/portraits/women/44.jpg" 
                    alt="Ana Oliveira" 
                    className="h-6 w-6 rounded-full border-2 border-white"
                  />
                </div>
              </div>

              <div className="border-b p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Reunião de pré-produção - Curso Online Tech</p>
                    <p className="text-xs text-muted-foreground mt-1">Vence em 3 dias</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Baixa</Badge>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <img 
                    src="https://randomuser.me/api/portraits/men/67.jpg" 
                    alt="Carlos Mendes" 
                    className="h-6 w-6 rounded-full border-2 border-white"
                  />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Revisar orçamento - Projeto Marca X</p>
                    <p className="text-xs text-muted-foreground mt-1">Vence em 3 dias</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Média</Badge>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <img 
                    src="https://randomuser.me/api/portraits/men/32.jpg" 
                    alt="Bruno Silva" 
                    className="h-6 w-6 rounded-full border-2 border-white"
                  />
                </div>
              </div>

              <div className="p-4 flex justify-center">
                <Button variant="ghost" size="sm" className="text-indigo-600">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar nova tarefa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">Próximos Pagamentos</h4>
                  <span className="text-xs text-muted-foreground">Abril 2025</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex">
                      <div className="p-1.5 bg-green-100 text-green-600 rounded mr-2">
                        <Building className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Banco Azul</p>
                        <p className="text-xs text-muted-foreground">Fatura 23</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(18000)}</p>
                      <p className="text-xs text-muted-foreground">05/04/2025</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex">
                      <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-2">
                        <Building className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Tech Courses Inc.</p>
                        <p className="text-xs text-muted-foreground">Pagamento Julho</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(12500)}</p>
                      <p className="text-xs text-muted-foreground">15/04/2025</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">Próximas Despesas</h4>
                  <span className="text-xs text-muted-foreground">Abril 2025</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex">
                      <div className="p-1.5 bg-red-100 text-red-600 rounded mr-2">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Aluguel de Equipamentos</p>
                        <p className="text-xs text-muted-foreground">20/04/2025</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(3500)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="w-full">
                <CircleDollarSign className="mr-2 h-4 w-4" />
                Gerenciar Finanças
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Próximas Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">Hoje, 10:30</h4>
                  <Badge variant="outline" className="text-xs">1h</Badge>
                </div>
                <div className="flex">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded mr-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Daily Standup</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User className="h-3 w-3 mr-1" />
                      <span>Equipe de Produção</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">Amanhã, 14:00</h4>
                  <Badge variant="outline" className="text-xs">1h 30m</Badge>
                </div>
                <div className="flex">
                  <div className="p-1.5 bg-yellow-100 text-yellow-600 rounded mr-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Revisão do Projeto</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Building className="h-3 w-3 mr-1" />
                      <span>Marca X</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="w-full">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Ver Calendário
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

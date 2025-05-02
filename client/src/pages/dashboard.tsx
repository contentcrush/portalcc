import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, calculatePercentChange, cn } from "@/lib/utils";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronRight, 
  MoreHorizontal,
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  CircleDollarSign, 
  Calendar, 
  User,
  Folder,
  ListChecks,
  Users,
  CircleDot
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientAvatar } from "@/components/ClientAvatar";
import { ProjectProgress } from "@/components/ProjectProgress";

export default function Dashboard() {
  const [period, setPeriod] = useState("Abril 2025");
  const { openProjectForm } = useProjectForm();
  
  const { data: projects } = useQuery({
    queryKey: ['/api/projects']
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks']
  });
  
  const { data: financialDocuments } = useQuery({
    queryKey: ['/api/financial-documents']
  });
  
  const { data: expenses } = useQuery({
    queryKey: ['/api/expenses']
  });
  
  const { data: clients } = useQuery({
    queryKey: ['/api/clients']
  });
  
  // Calculate dashboard metrics
  const activeProjects = projects?.filter(p => 
    p.status !== 'concluido' && p.status !== 'cancelado'
  ).length || 0;
  
  const totalProjects = projects?.length || 0;
  
  const pendingTasks = tasks?.filter(t => 
    !t.completed
  ).length || 0;
  
  const totalTasks = tasks?.length || 0;
  
  // Calculate overdue tasks
  const overdueTasksCount = tasks?.filter(task => {
    if (task.completed) return false;
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return dueDate < new Date();
  }).length || 0;
  
  // Financial calculations
  const currentMonthRevenue = financialDocuments?.reduce((sum, doc) => {
    // Check if document is from current month
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    const now = new Date();
    if (docDate && docDate.getMonth() === now.getMonth() && 
        docDate.getFullYear() === now.getFullYear()) {
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  const previousMonthRevenue = financialDocuments?.reduce((sum, doc) => {
    // Check if document is from previous month
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    const now = new Date();
    let prevMonth = now.getMonth() - 1;
    let prevYear = now.getFullYear();
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }
    if (docDate && docDate.getMonth() === prevMonth && docDate.getFullYear() === prevYear) {
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  // Calculate percent changes
  const revenueChange = calculatePercentChange(currentMonthRevenue, previousMonthRevenue);
  
  // Count active clients and new clients this month
  const activeClients = clients?.length || 0;
  const newClientsThisMonth = clients?.filter(client => {
    if (!client.created_at) return false;
    const createdDate = new Date(client.created_at);
    const now = new Date();
    return createdDate.getMonth() === now.getMonth() && 
           createdDate.getFullYear() === now.getFullYear();
  }).length || 0;
  
  // Get upcoming tasks sorted by due date (closest first)
  const upcomingTasks = tasks
    ?.filter(task => !task.completed)
    ?.sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date) : new Date(9999, 11, 31);
      const dateB = b.due_date ? new Date(b.due_date) : new Date(9999, 11, 31);
      return dateA.getTime() - dateB.getTime();
    })
    ?.slice(0, 5) || [];
  
  // Get active projects sorted by progress
  const ongoingProjects = projects
    ?.filter(p => p.status !== 'concluido' && p.status !== 'cancelado')
    ?.sort((a, b) => b.progress - a.progress)
    ?.slice(0, 3) || [];
  
  // Get recent clients
  const recentClients = clients
    ?.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    ?.slice(0, 5) || [];
  
  // Financial data by client for the current month
  const financialByClient = {};
  if (financialDocuments && projects && clients) {
    financialDocuments.forEach(doc => {
      if (doc.client_id && doc.amount) {
        if (!financialByClient[doc.client_id]) {
          financialByClient[doc.client_id] = 0;
        }
        financialByClient[doc.client_id] += doc.amount;
      }
    });
  }
  
  // Calculate profit
  const currentMonthExpenses = expenses?.reduce((sum, exp) => {
    // Check if expense is from current month
    const expDate = exp.date ? new Date(exp.date) : null;
    const now = new Date();
    if (expDate && expDate.getMonth() === now.getMonth() && 
        expDate.getFullYear() === now.getFullYear()) {
      return sum + (exp.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  const previousMonthExpenses = expenses?.reduce((sum, exp) => {
    // Check if expense is from previous month
    const expDate = exp.date ? new Date(exp.date) : null;
    const now = new Date();
    let prevMonth = now.getMonth() - 1;
    let prevYear = now.getFullYear();
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }
    if (expDate && expDate.getMonth() === prevMonth && expDate.getFullYear() === prevYear) {
      return sum + (exp.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  const expensesChange = calculatePercentChange(currentMonthExpenses, previousMonthExpenses);
  
  const profit = currentMonthRevenue - currentMonthExpenses;
  const previousProfit = previousMonthRevenue - previousMonthExpenses;
  const profitChange = calculatePercentChange(profit, previousProfit);
  
  // Priority badges
  const getPriorityBadge = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'baixa':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Baixa</Badge>;
      case 'media':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Média</Badge>;
      case 'alta':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Alta</Badge>;
      case 'critica':
        return <Badge className="bg-red-600 hover:bg-red-700">Crítica</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da produtora Content Crush</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <div className="bg-background border rounded-md px-3 py-1.5 text-sm font-medium">
            {period}
          </div>
          <Button onClick={openProjectForm} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Projetos Ativos */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Projetos Ativos</p>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">+12%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{activeProjects}</h3>
              <p className="text-xs text-muted-foreground">de {totalProjects} total</p>
            </div>
            <Progress className="h-1.5 mt-3 bg-emerald-100" value={(activeProjects / (totalProjects || 1)) * 100} indicatorClassName="bg-emerald-500" />
          </CardContent>
        </Card>
        
        {/* Tarefas Pendentes */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Tarefas Pendentes</p>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">+5%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{pendingTasks}</h3>
              <p className="text-xs text-muted-foreground">{overdueTasksCount} atrasadas</p>
            </div>
            <Progress className="h-1.5 mt-3 bg-amber-100" value={(pendingTasks / (totalTasks || 1)) * 100} indicatorClassName="bg-amber-500" />
          </CardContent>
        </Card>
        
        {/* Clientes Ativos */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">+8%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{activeClients}</h3>
              <p className="text-xs text-muted-foreground">{newClientsThisMonth} novos este mês</p>
            </div>
            <Progress className="h-1.5 mt-3 bg-blue-100" value={100} indicatorClassName="bg-blue-600" />
          </CardContent>
        </Card>
        
        {/* Faturamento Mensal */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Faturamento Mensal</p>
              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">+15%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{formatCurrency(currentMonthRevenue)}</h3>
              <div className="flex items-center text-sm text-green-600">
                <span className="text-xs">R$ 6.300</span>
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </div>
            </div>
            <Progress className="h-1.5 mt-3 bg-purple-100" value={80} indicatorClassName="bg-purple-600" />
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Projetos em Andamento */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Projetos em Andamento</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {ongoingProjects.map(project => {
                const client = clients?.find(c => c.id === project.client_id);
                return (
                  <div key={project.id} className="space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {client?.name ? client.name : `Cliente #${project.client_id}`}
                        </p>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">Progresso</span>
                        <span className="text-muted-foreground ml-1">({project.progress}%)</span>
                      </div>
                      <span className="font-medium">Prazo: {project.deadline ? format(new Date(project.deadline), 'dd/MM/yyyy') : 'Não definido'}</span>
                    </div>
                    
                    <ProjectProgress progress={project.progress} />
                  </div>
                );
              })}
              
              <Link href="/projects">
                <Button variant="outline" className="w-full mt-2 text-sm">
                  Ver todos os projetos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          {/* Visão Financeira */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Visão Financeira</CardTitle>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" className="h-8 text-xs">Semana</Button>
                <Button variant="secondary" size="sm" className="h-8 text-xs">Mês</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">Ano</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Receita</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(currentMonthRevenue)}</p>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>{revenueChange}% vs. último mês</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(currentMonthExpenses)}</p>
                  <div className={cn(
                    "flex items-center text-xs mt-1",
                    expensesChange > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {expensesChange > 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    )}
                    <span>{Math.abs(expensesChange)}% vs. último mês</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lucro</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(profit)}</p>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>{profitChange}% vs. último mês</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Faturamento por Projeto (Abril 2025)</h3>
                <div className="space-y-3">
                  {Object.entries(financialByClient).slice(0, 4).map(([clientId, amount], index) => {
                    const client = clients?.find(c => c.id === parseInt(clientId));
                    return (
                      <div key={clientId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ClientAvatar client={client} size="sm" className="mr-2" />
                          <div>
                            <p className="text-sm font-medium">{client?.name || `Cliente #${clientId}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {projects?.filter(p => p.client_id === parseInt(clientId)).length || 0} projetos ativos
                            </p>
                          </div>
                        </div>
                        <p className="font-medium">{formatCurrency(amount)}</p>
                      </div>
                    );
                  })}
                </div>
                
                <Link href="/financial">
                  <Button variant="outline" className="w-full mt-4 text-sm">
                    Ver relatório financeiro completo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column */}
        <div className="space-y-5">
          {/* Tarefas Próximas */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Tarefas Próximas</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingTasks.map(task => {
                const project = projects?.find(p => p.id === task.project_id);
                const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                const isToday = task.due_date && 
                  new Date(task.due_date).toDateString() === new Date().toDateString();
                
                return (
                  <div key={task.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <CircleDot className={cn(
                        "h-5 w-5",
                        isOverdue ? "text-red-500" : 
                        isToday ? "text-amber-500" : 
                        "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{task.title}</h3>
                        {getPriorityBadge(task.priority)}
                      </div>
                      {task.due_date && (
                        <p className={cn(
                          "text-xs mt-1",
                          isOverdue ? "text-red-500 font-medium" : 
                          isToday ? "text-amber-500 font-medium" : 
                          "text-muted-foreground"
                        )}>
                          {isOverdue 
                            ? `Atrasada: ${format(new Date(task.due_date), "dd/MM/yyyy")}` 
                            : isToday 
                              ? `Hoje, ${format(new Date(task.due_date), "HH:mm", { locale: ptBR })}`
                              : format(new Date(task.due_date), "dd/MM/yyyy")}
                        </p>
                      )}
                      {project && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Projeto: {project.name}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <Link href="/tasks">
                <Button variant="outline" className="w-full mt-2 text-sm">
                  Ver todas as tarefas
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          {/* Clientes Recentes */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium">Clientes Recentes</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-0">
              {recentClients.map((client, index) => {
                const clientProjects = projects?.filter(p => p.client_id === client.id) || [];
                const activeClientProjects = clientProjects.filter(p => 
                  p.status !== 'concluido' && p.status !== 'cancelado'
                );
                
                return (
                  <div key={client.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <ClientAvatar client={client} size="sm" className="mr-3" />
                        <div>
                          <h3 className="font-medium">{client.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {activeClientProjects.length} {activeClientProjects.length === 1 ? 'projeto ativo' : 'projetos ativos'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {index < recentClients.length - 1 && <Separator className="mt-3" />}
                  </div>
                );
              })}
              
              <Link href="/clients">
                <Button variant="outline" className="w-full mt-4 text-sm">
                  Ver todos os clientes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
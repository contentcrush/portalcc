import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpRight, 
  MoreHorizontal,
  PlusCircle,
  Calendar,
  Circle
} from "lucide-react";
import { Link } from "wouter";
import { ProjectProgress } from "@/components/ProjectProgress";
import { useProjectForm } from "@/contexts/ProjectFormContext";

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    'em_producao': 'bg-green-500 text-white',
    'em_edicao': 'bg-blue-500 text-white',
    'pre-producao': 'bg-amber-500 text-white',
    'urgente': 'bg-red-500 text-white',
    'media': 'bg-amber-500 text-white',
    'normal': 'bg-blue-500 text-white'
  };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colorMap[status] || 'bg-gray-200 text-gray-800'}`}>
      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
    </span>
  );
};

const KPICard = ({ 
  title, 
  value, 
  subtext, 
  change, 
  color 
}: { 
  title: string; 
  value: string | number; 
  subtext?: string; 
  change: number;
  color: string;
}) => {
  const colorClasses = {
    'green': 'from-emerald-400 to-emerald-600',
    'amber': 'from-amber-400 to-amber-600',
    'blue': 'from-blue-400 to-blue-600',
    'purple': 'from-purple-400 to-purple-600'
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="mt-2 flex flex-col">
            <span className="text-2xl font-bold">{value}</span>
            {subtext && <span className="text-xs text-muted-foreground mt-1">{subtext}</span>}
          </div>
          
          {change !== undefined && (
            <div className="mt-4 flex items-center text-sm">
              <span className={`text-${change > 0 ? 'green' : 'red'}-600 flex items-center`}>
                {change > 0 && '+'}{change}%
                {change > 0 && <ArrowUpRight className="h-3 w-3 ml-1" />}
              </span>
            </div>
          )}
        </div>
        
        <div className={`h-1.5 w-full bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]}`}></div>
      </CardContent>
    </Card>
  );
};

// Componente principal do Dashboard
export default function DashboardNovo() {
  const [currentPeriod, setCurrentPeriod] = useState<'week' | 'month' | 'year'>('month');
  const { openProjectForm } = useProjectForm();
  
  // Data atual e nome do mês
  const currentDate = new Date();
  const currentMonthDisplay = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);
  
  // Buscar dados da API
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects']
  });
  
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['/api/tasks']
  });
  
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients']
  });
  
  const { data: financialDocuments = [] } = useQuery<any[]>({
    queryKey: ['/api/financial-documents']
  });
  
  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ['/api/expenses']
  });
  
  // Filtrar projetos ativos (não concluídos ou cancelados)
  const activeProjects = projects.filter((p: any) => 
    p.status !== 'concluido' && p.status !== 'cancelado'
  );
  
  // Filtrar tarefas pendentes
  const pendingTasks = tasks.filter((t: any) => !t.completed);
  const overdueTasks = pendingTasks.filter((t: any) => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate < new Date();
  });
  
  // Clientes ativos (com projetos ativos)
  const projectClientIds = new Set(activeProjects.map((p: any) => p.client_id).filter(Boolean));
  const activeClients = clients.filter((c: any) => projectClientIds.has(c.id));
  
  // Cálculo dados financeiros atuais e anteriores
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  // Receitas (financialDocuments)
  const currentMonthIncome = financialDocuments
    .filter((doc: any) => {
      const date = new Date(doc.due_date || doc.issue_date);
      return date.getMonth() === currentMonth && 
             date.getFullYear() === currentYear && 
             doc.type === 'invoice' &&
             (doc.status === 'pago' || doc.status === 'pendente');
    })
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
  
  const previousMonthIncome = financialDocuments
    .filter((doc: any) => {
      const date = new Date(doc.due_date || doc.issue_date);
      return date.getMonth() === previousMonth && 
             date.getFullYear() === previousYear && 
             doc.type === 'invoice' &&
             (doc.status === 'pago' || doc.status === 'pendente');
    })
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
  
  // Despesas
  const currentMonthExpenses = expenses
    .filter((exp: any) => {
      const date = new Date(exp.date);
      return date.getMonth() === currentMonth && 
             date.getFullYear() === currentYear;
    })
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  const previousMonthExpenses = expenses
    .filter((exp: any) => {
      const date = new Date(exp.date);
      return date.getMonth() === previousMonth && 
             date.getFullYear() === previousYear;
    })
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  // Lucro
  const currentMonthProfit = currentMonthIncome - currentMonthExpenses;
  const previousMonthProfit = previousMonthIncome - previousMonthExpenses;
  
  // Cálculo das variações percentuais
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  const incomePercentChange = calculatePercentChange(currentMonthIncome, previousMonthIncome);
  const expensesPercentChange = calculatePercentChange(currentMonthExpenses, previousMonthExpenses);
  const profitPercentChange = calculatePercentChange(currentMonthProfit, previousMonthProfit);
  
  // Calcular faturamento por projeto
  const projectIncome = projects.map((project: any) => {
    const projectDocs = financialDocuments.filter((doc: any) => 
      doc.project_id === project.id && 
      doc.type === 'invoice' &&
      (doc.status === 'pago' || doc.status === 'pendente')
    );
    
    const income = projectDocs.reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
    
    return {
      id: project.id,
      name: project.name,
      client_id: project.client_id,
      color: ['pink', 'blue', 'purple', 'green', 'amber'][Math.floor(Math.random() * 5)],
      income
    };
  })
  .filter((p: any) => p.income > 0)
  .sort((a: any, b: any) => b.income - a.income)
  .slice(0, 4);
  
  // Dados para tarefas próximas
  const upcomingTasks = [...(pendingTasks || [])]
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 5);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da produtora Content Crush</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Button variant="outline" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            {currentMonthDisplay}
          </Button>
          
          <Button onClick={openProjectForm}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Adicionar
          </Button>
        </div>
      </div>
      
      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Projetos Ativos" 
          value={activeProjects.length}
          subtext={`de ${projects?.length || 0} total`}
          change={12}
          color="green"
        />
        
        <KPICard 
          title="Tarefas Pendentes" 
          value={pendingTasks.length}
          subtext={`${overdueTasks.length} atrasadas`}
          change={-5}
          color="amber"
        />
        
        <KPICard 
          title="Clientes Ativos" 
          value={activeClients.length}
          subtext={`${3} novos este mês`}
          change={8}
          color="blue"
        />
        
        <KPICard 
          title="Faturamento Mensal" 
          value={formatCurrency(monthlyRevenue)}
          subtext={`R$ 6.300 acima da meta`}
          change={15}
          color="purple"
        />
      </div>
      
      {/* Seção de Projetos em Andamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Projetos em Andamento</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-6 space-y-4">
            {activeProjects.slice(0, 3).map((project: any) => (
              <div key={project.id} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/projects/${project.id}`}>
                      <h3 className="font-medium text-sm hover:text-primary cursor-pointer">
                        {project.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {project.description?.substring(0, 40) || "Sem descrição"}
                    </p>
                  </div>
                  <StatusBadge status={project.status === "em_andamento" ? "em_producao" : project.status === "edicao" ? "em_edicao" : project.status} />
                </div>
                
                <div>
                  <ProjectProgress project={project} size="sm" />
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-muted-foreground">
                      Prazo: {project.deadline ? formatDate(new Date(project.deadline)) : "Não definido"}
                    </div>
                    <div className="text-xs font-medium">
                      {project.progress || 0}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <Link href="/projects">
                <Button variant="outline" className="w-full">
                  Ver todos os projetos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Tarefas Próximas */}
        <Card>
          <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Tarefas Próximas</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-6 space-y-3">
            {upcomingTasks.map((task: any) => (
              <div key={task.id} className="flex items-start gap-3 py-1">
                <Circle className="h-5 w-5 mt-0.5 stroke-1 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <Link href={`/tasks/${task.id}`}>
                      <h4 className="text-sm font-medium hover:text-primary cursor-pointer">
                        {task.title}
                      </h4>
                    </Link>
                    
                    {task.priority === 'alta' && <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-0">Urgente</Badge>}
                    {task.priority === 'media' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0">Média</Badge>}
                    {task.priority === 'baixa' && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">Normal</Badge>}
                  </div>
                  
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(task.due_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <Link href="/tasks">
                <Button variant="outline" className="w-full">
                  Ver todas as tarefas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Seção Financeira e Clientes Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3 pt-5 px-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-medium">Visão Financeira</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs">Semana</Button>
                <Button variant="default" size="sm" className="h-8 text-xs">Mês</Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">Ano</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm text-muted-foreground">Receita</h4>
                  <p className="text-xl font-bold mt-1">R$ 48.500</p>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>15% vs. último mês</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm text-muted-foreground">Despesas</h4>
                  <p className="text-xl font-bold mt-1">R$ 23.120</p>
                  <div className="flex items-center text-xs text-red-600 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>8% vs. último mês</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm text-muted-foreground">Lucro</h4>
                  <p className="text-xl font-bold mt-1">R$ 25.380</p>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>22% vs. último mês</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Faturamento por Projeto (Abril 2025)</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-4 w-4 rounded-sm bg-pink-400"></div>
                      <span className="text-sm">TechBrand</span>
                    </div>
                    <div className="flex-1 relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-pink-400" style={{ width: '80%' }}></div>
                    </div>
                    <span className="text-sm font-medium">R$ 22.500</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-4 w-4 rounded-sm bg-blue-400"></div>
                      <span className="text-sm">EcoVida</span>
                    </div>
                    <div className="flex-1 relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-blue-400" style={{ width: '60%' }}></div>
                    </div>
                    <span className="text-sm font-medium">R$ 15.000</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-4 w-4 rounded-sm bg-purple-400"></div>
                      <span className="text-sm">FashionNow</span>
                    </div>
                    <div className="flex-1 relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-purple-400" style={{ width: '25%' }}></div>
                    </div>
                    <span className="text-sm font-medium">R$ 7.500</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-4 w-4 rounded-sm bg-gray-400"></div>
                      <span className="text-sm">Outros</span>
                    </div>
                    <div className="flex-1 relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-gray-400" style={{ width: '15%' }}></div>
                    </div>
                    <span className="text-sm font-medium">R$ 3.500</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <Link href="/financial">
                  <Button variant="outline" className="w-full">
                    Ver relatório financeiro completo
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Clientes Recentes */}
        <Card>
          <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Clientes Recentes</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-6 space-y-4">
            {clients.slice(0, 5).map((client: any) => (
              <div key={client.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {client.logo ? (
                      <img 
                        src={client.logo} 
                        alt={client.name} 
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-medium">
                        {client.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <Link href={`/clients/${client.id}`}>
                      <h4 className="text-sm font-medium hover:text-primary cursor-pointer">
                        {client.name}
                      </h4>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {client.active_projects ? 
                        `${client.active_projects} projetos ativos` : 
                        client.is_new ? "Novo cliente" : "1 projeto ativo"}
                    </p>
                  </div>
                </div>
                
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <div className="pt-2">
              <Link href="/clients">
                <Button variant="outline" className="w-full">
                  Ver todos os clientes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
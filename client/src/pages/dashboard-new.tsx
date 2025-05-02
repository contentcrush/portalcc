import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, calculatePercentChange, formatDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRight, 
  CircleDollarSign, 
  CheckCircle2,
  AlertCircle,
  Clock, 
  Building,
  Calendar as CalendarIcon,
  User,
  PlusCircle,
  FolderOpen,
  ListTodo,
  Users
} from "lucide-react";
import { format, subMonths, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";
import CalendarHeatmap from "@/components/charts/CalendarHeatmap";
import { useProjectForm } from "@/contexts/ProjectFormContext";

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
  value: string | number;
  change?: number;
  changeText?: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}) => (
  <Card className="dashboard-card">
    <CardContent className="pt-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="flex items-end space-x-2 mt-1">
            <span className="text-3xl font-bold">{value}</span>
          </div>
        </div>
        <div className={`rounded-md p-2 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      
      {typeof change !== 'undefined' && (
        <div className="flex items-center mt-3 text-sm">
          {change > 0 ? (
            <div className="flex items-center text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+{change}%</span>
            </div>
          ) : change < 0 ? (
            <div className="flex items-center text-red-600">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              <span>{change}%</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-500">
              <ArrowRight className="h-3 w-3 mr-1" />
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
  const [period, setPeriod] = useState("Q2 2025");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [prevMonth, setPrevMonth] = useState(subMonths(new Date(), 1));
  const { openProjectForm } = useProjectForm();

  // Fetch data
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

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users']
  });

  // Calculate dashboard metrics
  const activeProjects = projects.filter(p => 
    p.status !== 'concluido' && p.status !== 'cancelado'
  ).length;
  
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  
  const activeClients = clients.length;
  
  // Financial calculations
  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);
  const prevMonthStart = startOfMonth(prevMonth);
  const prevMonthEnd = endOfMonth(prevMonth);

  const currentMonthRevenue = financialDocuments.reduce((sum, doc) => {
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    if (docDate && isWithinInterval(docDate, { start: currentMonthStart, end: currentMonthEnd })) {
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0);
  
  const previousMonthRevenue = financialDocuments.reduce((sum, doc) => {
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    if (docDate && isWithinInterval(docDate, { start: prevMonthStart, end: prevMonthEnd })) {
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0);
  
  const revenueChange = calculatePercentChange(currentMonthRevenue, previousMonthRevenue);

  // Create real chart data from actual financials
  const monthlyRevenueData = Array.from({ length: 6 }, (_, index) => {
    const month = subMonths(new Date(), 5 - index);
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthRevenue = financialDocuments.reduce((sum, doc) => {
      const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
      if (docDate && isWithinInterval(docDate, { start: monthStart, end: monthEnd })) {
        return sum + (doc.amount || 0);
      }
      return sum;
    }, 0);
    
    const monthExpenses = expenses.reduce((sum, exp) => {
      const expDate = exp.date ? new Date(exp.date) : null;
      if (expDate && isWithinInterval(expDate, { start: monthStart, end: monthEnd })) {
        return sum + (exp.amount || 0);
      }
      return sum;
    }, 0);
    
    return {
      month: format(month, 'MMM', { locale: ptBR }),
      revenue: monthRevenue,
      expenses: monthExpenses,
      profit: monthRevenue - monthExpenses
    };
  });

  // Revenue by project data
  const projectRevenueData = projects
    .filter(project => {
      const projectDocs = financialDocuments.filter(doc => doc.project_id === project.id);
      return projectDocs.length > 0;
    })
    .map(project => {
      const projectRevenue = financialDocuments
        .filter(doc => doc.project_id === project.id)
        .reduce((sum, doc) => sum + (doc.amount || 0), 0);
      
      return {
        name: project.name.length > 12 ? project.name.substring(0, 12) + '...' : project.name,
        value: projectRevenue
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);  // Get top 5 projects by revenue

  // Expense categories data
  const expenseCategoriesMap = new Map();
  expenses.forEach(expense => {
    const category = expense.category || 'Outros';
    const currentAmount = expenseCategoriesMap.get(category) || 0;
    expenseCategoriesMap.set(category, currentAmount + (expense.amount || 0));
  });

  const totalExpenses = Array.from(expenseCategoriesMap.values()).reduce((sum, amount) => sum + amount, 0);

  const expenseCategoriesData = Array.from(expenseCategoriesMap.entries())
    .map(([category, amount]) => ({
      id: category,
      label: category,
      value: amount,
      percent: totalExpenses ? Math.round((amount / totalExpenses) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Activity calendar data
  const calendarData = tasks.map(task => {
    const taskDate = task.completion_date || task.due_date || task.creation_date;
    if (!taskDate) return null;
    
    return {
      day: format(new Date(taskDate), 'yyyy-MM-dd'),
      value: 1
    };
  }).filter(Boolean);

  // Prepare line chart data
  const lineChartData = [
    {
      id: 'Receita',
      data: monthlyRevenueData.map(item => ({
        x: item.month,
        y: item.revenue
      }))
    },
    {
      id: 'Despesas',
      data: monthlyRevenueData.map(item => ({
        x: item.month,
        y: item.expenses
      }))
    }
  ];

  // Monthly growth rate
  const currentTasksCount = tasks.filter(task => {
    const taskDate = task.creation_date ? new Date(task.creation_date) : null;
    return taskDate && isWithinInterval(taskDate, { start: currentMonthStart, end: currentMonthEnd });
  }).length;

  const prevTasksCount = tasks.filter(task => {
    const taskDate = task.creation_date ? new Date(task.creation_date) : null;
    return taskDate && isWithinInterval(taskDate, { start: prevMonthStart, end: prevMonthEnd });
  }).length;

  const taskGrowthRate = calculatePercentChange(currentTasksCount, prevTasksCount);

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
      
      {/* Stats Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projetos Ativos"
          value={activeProjects}
          change={12}
          changeText="desde o mês passado"
          icon={FolderOpen}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
        />

        <StatCard
          title="Tarefas Pendentes"
          value={pendingTasks}
          change={-8}
          changeText="desde a semana passada"
          icon={ListTodo}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
        />

        <StatCard
          title="Clientes Ativos"
          value={activeClients}
          change={20}
          changeText="desde o trimestre passado"
          icon={Users}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />

        <StatCard
          title="Receita Mensal"
          value={formatCurrency(currentMonthRevenue)}
          change={revenueChange}
          changeText="comparado ao mês anterior"
          icon={CircleDollarSign}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
      </div>
      
      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <LineChart 
          title="Tendência Mensal"
          data={lineChartData}
          height={300}
          colors={['#5046E5', '#EF4444']}
        />
        
        <BarChart 
          title="Receita por Projeto"
          data={projectRevenueData}
          indexBy="name"
          keys={["value"]}
          height={300}
          colors={['#5046E5']}
        />
      </div>
      
      {/* Project Performance & Expense Breakdown */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Desempenho de Projetos</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Ver todos os projetos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.slice(0, 4).map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <StatusBadge status={project.status} small={true} minimal={true} />
                    <div>
                      <Link href={`/projects/${project.id}`}>
                        <p className="font-medium hover:text-primary cursor-pointer">{project.name}</p>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {clients.find(c => c.id === project.client_id)?.name || `Cliente #${project.client_id}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(project.budget || 0)}</p>
                    <div className="flex items-center justify-end text-sm">
                      <Badge variant={project.progress > 80 ? "success" : project.progress > 40 ? "warning" : "outline"}>
                        {project.progress}% concluído
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Detalhamento de Despesas</CardTitle>
            <CardDescription>
              {formatCurrency(expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategoriesData.length > 0 ? (
              <PieChart
                title=""
                data={expenseCategoriesData}
                height={300}
                innerRadius={0.6}
                colors={['#5046E5', '#10B981', '#6366F1', '#EF4444', '#F59E0B']}
                legendPosition="right"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <p>Nenhuma despesa registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Tasks & Activity */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
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
          <CardContent>
            <div className="space-y-4">
              {tasks
                .filter(task => !task.completed)
                .sort((a, b) => {
                  if (!a.due_date) return 1;
                  if (!b.due_date) return -1;
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                })
                .slice(0, 4)
                .map(task => (
                  <div key={task.id} className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className={`mt-0.5 w-2 h-2 rounded-full mr-3 ${
                        task.priority === 'alta' ? 'bg-orange-500' : 
                        task.priority === 'critica' ? 'bg-red-600' :
                        task.priority === 'media' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {task.due_date ? formatDate(task.due_date) : 'Sem data definida'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant={
                        task.priority === 'alta' ? "destructive" : 
                        task.priority === 'critica' ? "destructive" :
                        task.priority === 'media' ? "warning" : "outline"
                      }>
                        {task.priority === 'baixa' ? 'Baixa' : 
                         task.priority === 'media' ? 'Média' : 
                         task.priority === 'alta' ? 'Alta' : 'Crítica'}
                      </Badge>
                      {task.assigned_to && (
                        <div className="flex justify-end mt-1">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <User className="h-3 w-3 mr-1" />
                            {users.find(u => u.id === task.assigned_to)?.name || `Usuário #${task.assigned_to}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Atividade da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarHeatmap
              title=""
              data={calendarData}
              height={200}
              legend="Tarefas"
            />
            <div className="flex justify-between items-center mt-4">
              <div>
                <p className="text-sm font-medium">Taxa de Crescimento</p>
                <div className="flex items-center mt-1">
                  {taskGrowthRate > 0 ? (
                    <div className="flex items-center text-green-600">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      <span className="font-medium">+{taskGrowthRate}%</span>
                    </div>
                  ) : taskGrowthRate < 0 ? (
                    <div className="flex items-center text-red-600">
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                      <span className="font-medium">{taskGrowthRate}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500">
                      <ArrowRight className="h-4 w-4 mr-1" />
                      <span className="font-medium">0%</span>
                    </div>
                  )}
                  <span className="text-muted-foreground text-sm ml-2">vs mês anterior</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <div className="bg-green-100 rounded-full p-1.5">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{completedTasks}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, calculatePercentChange } from "@/lib/utils";
import { useProjectForm } from "@/contexts/ProjectFormContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users
} from "lucide-react";
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
  const [period, setPeriod] = useState("Q2 2025");
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
  
  // Removemos o listener de evento desnecessário que pode causar aberturas inadvertidas do formulário

  // Calculate dashboard metrics
  const activeProjects = projects?.filter(p => 
    p.status !== 'concluido' && p.status !== 'cancelado'
  ).length || 0;
  
  const completedProjects = projects?.filter(p => 
    p.status === 'concluido'
  ).length || 0;
  
  const pendingTasks = tasks?.filter(t => 
    !t.completed
  ).length || 0;
  
  // Financial calculations
  const currentQuarterRevenue = financialDocuments?.reduce((sum, doc) => {
    // Check if document is from current quarter
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    if (docDate && docDate.getMonth() >= 3 && docDate.getMonth() <= 5) { // Q2
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  const previousQuarterRevenue = financialDocuments?.reduce((sum, doc) => {
    // Check if document is from previous quarter
    const docDate = doc.creation_date ? new Date(doc.creation_date) : null;
    if (docDate && docDate.getMonth() >= 0 && docDate.getMonth() <= 2) { // Q1
      return sum + (doc.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  const currentQuarterExpenses = expenses?.reduce((sum, exp) => {
    // Check if expense is from current quarter
    const expDate = exp.date ? new Date(exp.date) : null;
    if (expDate && expDate.getMonth() >= 3 && expDate.getMonth() <= 5) { // Q2
      return sum + (exp.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  const previousQuarterExpenses = expenses?.reduce((sum, exp) => {
    // Check if expense is from previous quarter
    const expDate = exp.date ? new Date(exp.date) : null;
    if (expDate && expDate.getMonth() >= 0 && expDate.getMonth() <= 2) { // Q1
      return sum + (exp.amount || 0);
    }
    return sum;
  }, 0) || 0;
  
  // Calculate percent changes
  const revenueChange = calculatePercentChange(currentQuarterRevenue, previousQuarterRevenue);
  const expensesChange = calculatePercentChange(currentQuarterExpenses, previousQuarterExpenses);
  
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
      
      {/* Stats Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dashboard-card">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Projetos Ativos</h3>
                <div className="flex items-end space-x-2 mt-1">
                  <span className="text-3xl font-bold">8</span>
                </div>
              </div>
              <div className="bg-indigo-100 rounded-md p-2">
                <FolderOpen className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+12%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">desde o mês passado</span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tarefas Pendentes</h3>
                <div className="flex items-end space-x-2 mt-1">
                  <span className="text-3xl font-bold">24</span>
                </div>
              </div>
              <div className="bg-amber-100 rounded-md p-2">
                <ListTodo className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-red-600">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                <span>-8%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">desde a semana passada</span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Clientes Ativos</h3>
                <div className="flex items-end space-x-2 mt-1">
                  <span className="text-3xl font-bold">12</span>
                </div>
              </div>
              <div className="bg-green-100 rounded-md p-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+20%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">desde o trimestre passado</span>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Receita Mensal</h3>
                <div className="flex items-end space-x-2 mt-1">
                  <span className="text-3xl font-bold">R$ 42.500</span>
                </div>
              </div>
              <div className="bg-blue-100 rounded-md p-2">
                <CircleDollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-3 text-sm">
              <div className="flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+15%</span>
              </div>
              <span className="text-muted-foreground ml-1.5">comparado ao mês anterior</span>
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
      
      {/* Project Performance & Expense Breakdown */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Desempenho de Projetos</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Ver todos os projetos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects?.slice(0, 4).map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-2">
                      <StatusBadge status={project.status} small={true} minimal={true} />
                    </div>
                    <div>
                      <Link href={`/projects/${project.id}`}>
                        <p className="font-medium hover:text-primary cursor-pointer">{project.name}</p>
                      </Link>
                      <p className="text-sm text-muted-foreground">{project.client_id ? `Cliente #${project.client_id}` : ''}</p>
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
            <CardDescription>{formatCurrency(currentQuarterExpenses)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-2">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              {expenseCategories.map((category, index) => (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <div>
                    <p className="text-sm font-medium">{category.name}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>{formatCurrency(category.value)}</span>
                      <span className="ml-1">({category.percent}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

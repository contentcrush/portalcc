import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, isBefore, parseISO, isValid, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency, calculatePercentChange, formatShortMoney } from "@/lib/utils";
import NewFinancialRecordDialog from "@/components/financial/NewFinancialRecordDialog";
import ClientAvatar from "@/components/ClientAvatar";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  ChevronsUpDown,
  ClipboardEdit,
  Clock,
  Download,
  Filter,
  InfoIcon,
  MoreHorizontal,
  PanelTop,
  PieChart,
  Plus,
  PrinterIcon,
  Receipt,
  RefreshCw,
  Search,
  Trash,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface FinancialKPI {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  description: string;
  variant?: "green" | "red" | "blue" | "amber" | "default";
}

export default function Financial() {
  const [selectedTab, setSelectedTab] = useState<string>("dashboard");
  const [period, setPeriod] = useState<string>("month");
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());

  // Fetch financial data
  const { data: financialDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/financial-documents']
  });
  
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['/api/expenses']
  });
  
  const { data: projects } = useQuery({
    queryKey: ['/api/projects']
  });
  
  const { data: clients } = useQuery({
    queryKey: ['/api/clients']
  });

  // Prepare financial data
  const receivablesData = financialDocuments?.filter((doc: any) => 
    doc.document_type === 'invoice' && !doc.paid
  ) || [];
  
  const payablesData = expenses?.filter((exp: any) => !exp.approved) || [];
  
  // Calculate KPIs
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  const sevenDaysFromNow = addDays(now, 7);
  
  // Receivables total
  const totalReceivables = receivablesData.reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
  
  // Payables total
  const totalPayables = payablesData.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  // Overdue receivables
  const today = new Date();
  const overdueReceivables = receivablesData
    .filter((doc: any) => doc.due_date && isBefore(new Date(doc.due_date), today) && !doc.paid)
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
  
  // Cash flow next 30 days
  const receivablesNext30Days = receivablesData
    .filter((doc: any) => 
      doc.due_date && 
      isBefore(new Date(doc.due_date), thirtyDaysFromNow) && 
      !isBefore(new Date(doc.due_date), today) && // Não vencidas 
      !doc.paid // Ainda não pagas
    )
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
    
  const payablesNext30Days = payablesData
    .filter((exp: any) => exp.date && isBefore(new Date(exp.date), thirtyDaysFromNow))
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    
  const cashFlowNext30Days = receivablesNext30Days - payablesNext30Days;
  
  // Due alerts (next 7 days)
  const dueAlerts = receivablesData
    .filter((doc: any) => doc.due_date && isBefore(new Date(doc.due_date), sevenDaysFromNow))
    .length;
    
  // Payables next 7 days
  const payablesNext7Days = payablesData
    .filter((exp: any) => exp.date && isBefore(new Date(exp.date), sevenDaysFromNow))
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  // Monthly revenue
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyRevenue = financialDocuments
    ?.filter((doc: any) => {
      if (!doc.paid || !doc.payment_date) return false;
      const paymentDate = new Date(doc.payment_date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0) || 0;
  
  // Monthly expenses - incluindo todas as despesas do mês atual, mesmo as pendentes
  const monthlyExpenses = expenses
    ?.filter((exp: any) => {
      const expDate = new Date(exp.date);
      // Não aplicamos filtro de "approved" para mostrar o total de todas as despesas
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
  
  // Gross margin
  const grossMargin = monthlyRevenue > 0 
    ? ((monthlyRevenue - monthlyExpenses) / monthlyRevenue) * 100 
    : 0;
  
  // Avg cost per minute
  const totalMinutes = 250; // This would be calculated from actual data
  const avgCostPerMinute = monthlyExpenses > 0 ? monthlyExpenses / totalMinutes : 0;
  
  // Average collection period
  const dso = 28; // This would be calculated from actual data

  // Dashboard KPIs
  const kpis: FinancialKPI[] = [
    {
      title: "Receita Mensal",
      value: monthlyRevenue,
      change: 12,
      icon: <TrendingUp className="h-4 w-4" />,
      description: "Total faturado no mês atual",
      variant: "green"
    },
    {
      title: "Despesas Mensais",
      value: monthlyExpenses,
      change: -5,
      icon: <ArrowDownIcon className="h-4 w-4" />,
      description: "Total de despesas no mês atual",
      variant: "red"
    },
    {
      title: "Margem Bruta",
      value: `${grossMargin.toFixed(1)}%`,
      change: 4,
      icon: <PieChart className="h-4 w-4" />,
      description: "Margem bruta no mês atual",
      variant: "blue"
    },
    {
      title: "Custo por Minuto",
      value: formatCurrency(avgCostPerMinute),
      change: -3,
      icon: <Clock className="h-4 w-4" />,
      description: "Custo médio por minuto de conteúdo",
      variant: "amber"
    }
  ];

  // Compute monthly income/expense data
  const { monthlyData, monthlyTotals } = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const today = new Date();
    const currentMonth = today.getMonth();
    
    // Generate last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return monthNames[monthIndex];
    });
    
    let totalIncome = 0;
    let totalExpenses = 0;
    
    const data = months.map((month, index) => {
      const monthIndex = (currentMonth - 5 + index + 12) % 12;
      const yearOffset = currentMonth < monthIndex ? -1 : 0;
      const startDate = new Date(today.getFullYear() + yearOffset, monthIndex, 1);
      const endDate = new Date(today.getFullYear() + yearOffset, monthIndex + 1, 0);
      
      // Filter financial records for this month
      const monthIncome = Array.isArray(financialDocuments) 
        ? financialDocuments
            .filter(doc => {
              if (!doc.issue_date) return false;
              const docDate = new Date(doc.issue_date);
              return docDate >= startDate && docDate <= endDate;
            })
            .reduce((sum, doc) => sum + (doc.amount || 0), 0)
        : 0;
      
      // Filter expenses for this month
      const monthExpenses = Array.isArray(expenses)
        ? expenses
            .filter(exp => {
              if (!exp.date) return false;
              const expDate = new Date(exp.date);
              return expDate >= startDate && expDate <= endDate;
            })
            .reduce((sum, exp) => sum + (exp.amount || 0), 0)
        : 0;
      
      totalIncome += monthIncome;
      totalExpenses += monthExpenses;
      
      return {
        month,
        receita: monthIncome,
        despesas: monthExpenses
      };
    });
    
    return {
      monthlyData: data,
      monthlyTotals: {
        income: totalIncome,
        expenses: totalExpenses
      }
    };
  }, [financialDocuments, expenses]);

  // Client revenue distribution data
  const clientDistributionData = useMemo(() => {
    if (!financialDocuments || !financialDocuments.length || !clients) return [];
    
    const clientRevenue: Record<string, number> = {};
    
    // Agrupar receita por cliente
    financialDocuments.forEach((doc: any) => {
      const clientId = doc.client_id;
      if (clientId) {
        if (!clientRevenue[clientId]) {
          clientRevenue[clientId] = 0;
        }
        clientRevenue[clientId] += doc.amount || 0;
      }
    });
    
    // Converter para array e ordenar
    return Object.entries(clientRevenue)
      .map(([clientId, value]) => {
        const client = clients.find((c: any) => c.id === Number(clientId));
        return {
          name: client ? client.name : 'Cliente Desconhecido',
          value
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [financialDocuments, clients]);

  // Expense categories data
  const expenseCategoriesData = useMemo(() => {
    if (!expenses || !expenses.length) return [];
    
    const categories: Record<string, number> = {};
    
    // Agrupar despesas por categoria
    expenses.forEach((exp: any) => {
      const category = exp.category || 'Outros';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += exp.amount || 0;
    });
    
    // Converter para array e ordenar
    return Object.entries(categories)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Project margin data
  const projectMarginData = useMemo(() => {
    if (!projects || !clients || !financialDocuments || !expenses) return [];
    
    const projectData: Record<number, {
      id: number,
      name: string,
      client: string,
      revenue: number,
      expenses: number,
      margin: number
    }> = {};
    
    // Mapear receita por projeto
    financialDocuments.filter((doc: any) => doc.project_id).forEach((doc: any) => {
      const projectId = doc.project_id;
      
      if (!projectData[projectId]) {
        const project = projects.find((p: any) => p.id === projectId);
        const client = project?.client_id ? clients.find((c: any) => c.id === project.client_id) : null;
        
        projectData[projectId] = {
          id: projectId,
          name: project?.name || 'Projeto Desconhecido',
          client: client?.name || 'Cliente Desconhecido',
          revenue: 0,
          expenses: 0,
          margin: 0
        };
      }
      
      projectData[projectId].revenue += doc.amount || 0;
    });
    
    // Mapear despesas por projeto
    expenses.filter((exp: any) => exp.project_id).forEach((exp: any) => {
      const projectId = exp.project_id;
      
      if (!projectData[projectId]) {
        const project = projects.find((p: any) => p.id === projectId);
        const client = project?.client_id ? clients.find((c: any) => c.id === project.client_id) : null;
        
        projectData[projectId] = {
          id: projectId,
          name: project?.name || 'Projeto Desconhecido',
          client: client?.name || 'Cliente Desconhecido',
          revenue: 0,
          expenses: 0,
          margin: 0
        };
      }
      
      projectData[projectId].expenses += exp.amount || 0;
    });
    
    // Calcular margem
    Object.values(projectData).forEach(project => {
      if (project.revenue > 0) {
        project.margin = ((project.revenue - project.expenses) / project.revenue) * 100;
      }
    });
    
    // Ordenar por margem
    return Object.values(projectData)
      .filter(project => project.revenue > 0) // Apenas projetos com receita
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);
  }, [projects, clients, financialDocuments, expenses]);

  if (isLoadingDocuments || isLoadingExpenses) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          Gerencie receitas, despesas e fluxo de caixa da sua empresa.
        </p>
      </div>
      
      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex justify-between flex-wrap gap-2">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="receivables">A Receber</TabsTrigger>
            <TabsTrigger value="payables">A Pagar</TabsTrigger>
          </TabsList>
          
          <NewFinancialRecordDialog 
            clients={clients || []}
            projects={projects || []}
          />
        </div>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {kpi.title}
                  </CardTitle>
                  <div className={cn(
                    "p-1 rounded-md",
                    kpi.variant === "green" && "bg-green-100 text-green-700",
                    kpi.variant === "red" && "bg-red-100 text-red-700",
                    kpi.variant === "blue" && "bg-blue-100 text-blue-700",
                    kpi.variant === "amber" && "bg-amber-100 text-amber-700",
                    kpi.variant === "default" && "bg-gray-100 text-gray-700",
                  )}>
                    {kpi.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-0.5">
                    {kpi.description}
                  </p>
                  {kpi.change !== undefined && (
                    <div className="flex items-center text-xs">
                      {kpi.change > 0 ? (
                        <>
                          <TrendingUp className="mr-1 h-3 w-3 text-green-600"/>
                          <span className="text-green-600">+{kpi.change}%</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="mr-1 h-3 w-3 text-red-600"/>
                          <span className="text-red-600">{kpi.change}%</span>
                        </>
                      )}
                      <span className="text-muted-foreground ml-1">do mês anterior</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Revenue vs Expenses & Distribution Charts */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-medium">Receita vs Despesas</CardTitle>
                  <CardDescription>Últimos 6 meses</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar dados
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <PanelTop className="mr-2 h-4 w-4" />
                      Ver relatório detalhado
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-8 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">Receitas</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(monthlyTotals.income)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full" 
                        style={{ width: `${(monthlyTotals.income / (monthlyTotals.income + monthlyTotals.expenses)) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm font-medium">Despesas</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(monthlyTotals.expenses)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full" 
                        style={{ width: `${(monthlyTotals.expenses / (monthlyTotals.income + monthlyTotals.expenses)) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Resultado:</span>
                      <span className={`text-lg font-bold ${monthlyTotals.income - monthlyTotals.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(monthlyTotals.income - monthlyTotals.expenses)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Margem:</span>
                      <span className={`text-sm font-medium ${monthlyTotals.income - monthlyTotals.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {monthlyTotals.income > 0 
                          ? `${((monthlyTotals.income - monthlyTotals.expenses) / monthlyTotals.income * 100).toFixed(1)}%` 
                          : '0%'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Meses */}
                  <div className="grid grid-cols-6 gap-2 pt-2">
                    {monthlyData.map((month, i) => (
                      <div key={i} className="text-center">
                        <div className="text-xs text-muted-foreground">{month.month}</div>
                        <div className="text-sm font-medium mt-1">{formatShortMoney(month.receita - month.despesas)}</div>
                        <div className={`text-xs ${month.receita - month.despesas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {month.receita > 0 
                            ? `${((month.receita - month.despesas) / month.receita * 100).toFixed(0)}%` 
                            : '0%'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid gap-6 grid-cols-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">Distribuição de Despesas</CardTitle>
                    <CardDescription>Por categoria</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expenseCategoriesData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: ['#EF4444', '#F59E0B', '#6366F1', '#10B981'][index % 4] }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">Receita por Cliente</CardTitle>
                    <CardDescription>Principais clientes</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clientDistributionData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: ['#10B981', '#6366F1', '#F59E0B'][index % 3] }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Margin and DSO Metrics */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Margem por Projeto</CardTitle>
                <CardDescription>Top 5 projetos por margem de lucro</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">PROJETO</TableHead>
                      <TableHead>CLIENTE</TableHead>
                      <TableHead className="text-right">RECEITA</TableHead>
                      <TableHead className="text-right pr-6">MARGEM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(projectMarginData.length > 0 ? projectMarginData : [
                      { id: 1, name: "Campanha de Verão", client: "Cervejaria Therezópolis", revenue: 24500, margin: 55 },
                      { id: 2, name: "Lançamento SUV C3", client: "Citroen", revenue: 38900, margin: 42 },
                      { id: 3, name: "InCarne 2025", client: "Seara Alimentos", revenue: 31200, margin: 38 },
                      { id: 4, name: "Promoção Inverno", client: "Margarinas Delícia", revenue: 18600, margin: 35 },
                      { id: 5, name: "Institucional 2025", client: "Banco Azul", revenue: 42300, margin: 30 }
                    ]).map((project) => (
                      <TableRow key={project.id} className="group hover:bg-muted/50">
                        <TableCell className="font-medium pl-6">{project.name}</TableCell>
                        <TableCell>{project.client}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.revenue)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <span className={`font-medium ${
                            project.margin > 40 ? 'text-green-600' : 
                            project.margin > 20 ? 'text-amber-600' : 
                            'text-red-600'
                          }`}>
                            {typeof project.margin === 'number' ? project.margin.toFixed(1) : project.margin}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Tempo Médio de Recebimento</CardTitle>
                <CardDescription>Dias entre emissão e pagamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center p-4">
                  <div className="text-5xl font-bold text-blue-600">{dso}</div>
                  <div className="text-sm text-muted-foreground mt-1">dias em média</div>
                  
                  <div className="w-full mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Ótimo (&lt;30 dias)</span>
                        <span>30</span>
                      </div>
                      <Progress value={dso > 30 ? 100 : (dso / 30) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Bom (30-45 dias)</span>
                        <span>45</span>
                      </div>
                      <Progress 
                        value={dso > 45 ? 100 : dso < 30 ? 0 : ((dso - 30) / 15) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Regular (45-60 dias)</span>
                        <span>60</span>
                      </div>
                      <Progress 
                        value={dso > 60 ? 100 : dso < 45 ? 0 : ((dso - 45) / 15) * 100} 
                        className="h-2" 
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4">
                      O tempo médio de recebimento (DSO) mede a eficiência do ciclo de cobrança. 
                      Quanto menor o valor, mais rápido a empresa está convertendo faturas em caixa.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="mt-6 space-y-6">
          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar fatura, cliente ou projeto..."
                className="w-full sm:w-[300px] pl-8"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Filtros
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[220px] p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Status</h4>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="overdue">Vencidas</SelectItem>
                          <SelectItem value="paid">Pagas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Cliente</h4>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="1">Cervejaria Therezópolis</SelectItem>
                          <SelectItem value="2">Citroen</SelectItem>
                          <SelectItem value="3">Seara Alimentos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Vencimento</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">De</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                <span>Selecionar</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Até</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                <span>Selecionar</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm">Limpar</Button>
                      <Button size="sm">Aplicar</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button variant="outline" size="sm" className="h-9">
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar
              </Button>
              
              <Button size="sm" className="h-9">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Nova Fatura
              </Button>
            </div>
          </div>
          
          {/* KPI Boxes */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total a Receber
                </CardTitle>
                <Receipt className="h-4 w-4 text-green-600"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceivables || 55600)}</p>
                <p className="text-xs text-muted-foreground mt-1">De {receivablesData.length || 8} faturas pendentes</p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Faturas Vencidas
                </CardTitle>
                <Clock className="h-4 w-4 text-red-600"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(overdueReceivables)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {receivablesData.filter((doc: any) => doc.due_date && isBefore(new Date(doc.due_date), today)).length} faturas vencidas
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  A Receber (30 dias)
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-blue-600"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(receivablesNext30Days)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Previsão para os próximos 30 dias
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">CLIENTE / PROJETO</TableHead>
                    <TableHead>FATURA</TableHead>
                    <TableHead>VALOR</TableHead>
                    <TableHead>EMISSÃO</TableHead>
                    <TableHead>VENCIMENTO</TableHead>
                    <TableHead className="text-right">STATUS</TableHead>
                    <TableHead className="text-right">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivablesData.length > 0 ? receivablesData.map((doc: any) => {
                    const project = projects?.find((p: any) => p.id === doc.project_id);
                    const client = clients?.find((c: any) => c.id === doc.client_id);
                    
                    return (
                      <TableRow key={doc.id} className="group">
                        <TableCell className="font-medium flex items-center gap-3">
                          <ClientAvatar 
                            clientId={doc.client_id} 
                            clientName={client?.name || "Cliente"} 
                            size="sm"
                          />
                          <div>
                            <div>{client?.name || "Cliente"}</div>
                            {project && (
                              <div className="text-xs text-muted-foreground">{project.name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>#{doc.document_number || `FAT-${String(doc.id).padStart(4, '0')}`}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {doc.description || "Fatura de serviços"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(doc.amount)}
                        </TableCell>
                        <TableCell>
                          {doc.issue_date ? format(new Date(doc.issue_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {doc.due_date ? (
                            <span className={cn(
                              isBefore(new Date(doc.due_date), today) ? "text-red-600 font-semibold" : ""
                            )}>
                              {format(new Date(doc.due_date), 'dd/MM/yyyy')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.paid ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                              Pago
                            </Badge>
                          ) : isBefore(new Date(doc.due_date), today) ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                              Vencida
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <ClipboardEdit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Receipt className="mr-2 h-4 w-4" />
                                  Registrar pagamento
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <PrinterIcon className="mr-2 h-4 w-4" />
                                  Imprimir
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Receipt className="h-8 w-8 mb-2 opacity-20" />
                          <p>Nenhuma fatura a receber encontrada</p>
                          <p className="text-sm">Crie uma nova fatura para começar</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {receivablesData.length > 0 && (
              <CardFooter className="flex items-center justify-between py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {receivablesData.length} faturas
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>Anterior</Button>
                  <Button variant="outline" size="sm" disabled>Próxima</Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        {/* Payables Tab */}
        <TabsContent value="payables" className="mt-6 space-y-6">
          {/* Filter controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar despesa, fornecedor ou projeto..."
                className="w-full sm:w-[300px] pl-8"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Filtros
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[220px] p-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Status</h4>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                          <SelectItem value="approved">Aprovadas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Categoria</h4>
                      <Select defaultValue="all">
                        <SelectTrigger>
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="equipment">Equipamento</SelectItem>
                          <SelectItem value="services">Serviços</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="office">Escritório</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Data</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">De</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                <span>Selecionar</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Até</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                <span>Selecionar</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm">Limpar</Button>
                      <Button size="sm">Aplicar</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button variant="outline" size="sm" className="h-9">
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar
              </Button>
              
              <Button size="sm" className="h-9">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Nova Despesa
              </Button>
            </div>
          </div>
          
          {/* KPI Boxes */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total a Pagar
                </CardTitle>
                <Receipt className="h-4 w-4 text-amber-600"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPayables)}</p>
                <p className="text-xs text-muted-foreground mt-1">De {payablesData.length} despesas pendentes</p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Urgentes (7 dias)
                </CardTitle>
                <Clock className="h-4 w-4 text-red-600"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(payablesNext7Days)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {payablesData.filter((exp: any) => exp.date && isBefore(new Date(exp.date), sevenDaysFromNow)).length} pagamentos próximos
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Despesas do Mês
                </CardTitle>
                <CalendarIcon className="h-4 w-4 text-blue-600"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(monthlyExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {expenses?.filter((exp: any) => {
                    const expDate = new Date(exp.date);
                    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
                  }).length || 0} despesas neste mês
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Summary by Category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Resumo por Categoria</CardTitle>
              <CardDescription>Despesas pendentes agrupadas por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {expenseCategoriesData.length > 0 ? (
                  <>
                    {expenseCategoriesData.map((cat, index) => (
                      <div key={index} className="flex items-center justify-between py-1 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ 
                            backgroundColor: ['#EF4444', '#F59E0B', '#6366F1', '#10B981'][index % 4] 
                          }} />
                          <span>{cat.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrency(totalPayables)}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-6">
                    <p>Nenhuma despesa pendente encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">DESCRIÇÃO</TableHead>
                    <TableHead>CATEGORIA</TableHead>
                    <TableHead>PROJETO</TableHead>
                    <TableHead>DATA</TableHead>
                    <TableHead>VALOR</TableHead>
                    <TableHead className="text-right">STATUS</TableHead>
                    <TableHead className="text-right">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses?.length > 0 ? expenses.map((exp: any) => {
                    const project = projects?.find((p: any) => p.id === exp.project_id);
                    
                    return (
                      <TableRow key={exp.id} className="group">
                        <TableCell className="font-medium">
                          <div>{exp.description}</div>
                          {exp.paid_by && (
                            <div className="text-xs text-muted-foreground">
                              Pago por: {exp.paid_by}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {project ? project.name : '-'}
                        </TableCell>
                        <TableCell>
                          {exp.date ? format(new Date(exp.date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(exp.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {exp.approved ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                              Aprovada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <ClipboardEdit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Receipt className="mr-2 h-4 w-4" />
                                  Marcar como paga
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Receipt className="h-8 w-8 mb-2 opacity-20" />
                          <p>Nenhuma despesa encontrada</p>
                          <p className="text-sm">Crie uma nova despesa para começar</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {expenses?.length > 5 && (
              <CardFooter className="flex items-center justify-between py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {Math.min(expenses.length, 10)} de {expenses.length} despesas
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>Anterior</Button>
                  <Button variant="outline" size="sm">Próxima</Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
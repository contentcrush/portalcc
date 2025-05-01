import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, isBefore } from "date-fns";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  CreditCard,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Wallet,
  DollarSign,
  FileText,
  Banknote,
  TrendingUp,
  AlertCircle,
  Clock,
  LineChart,
  PieChart,
  Users,
  BarChart,
} from "lucide-react";
import { cn, formatCurrency, calculatePercentChange } from "@/lib/utils";
import FinancialChart from "@/components/FinancialChart";
import { NewFinancialRecordDialog } from "@/components/financial/NewFinancialRecordDialog";

// Definição de tipos
interface Transaction {
  id: number;
  description: string;
  date: Date;
  dueDate?: Date;
  amount: number;
  status: "pending" | "paid" | "overdue";
  client: string;
  project: string;
  type: "income" | "expense";
  category?: string;
}

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
  
  // Cash flow next 30 days
  const receivablesNext30Days = receivablesData
    .filter((doc: any) => doc.due_date && isBefore(new Date(doc.due_date), thirtyDaysFromNow))
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
    
  const payablesNext30Days = payablesData
    .filter((exp: any) => exp.date && isBefore(new Date(exp.date), thirtyDaysFromNow))
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    
  const cashFlowNext30Days = receivablesNext30Days - payablesNext30Days;
  
  // Due alerts (next 7 days)
  const dueAlerts = receivablesData
    .filter((doc: any) => doc.due_date && isBefore(new Date(doc.due_date), sevenDaysFromNow))
    .length;
  
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
  
  // Monthly expenses
  const monthlyExpenses = expenses
    ?.filter((exp: any) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear && exp.approved;
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
      title: "A Receber",
      value: totalReceivables,
      icon: <CreditCard className="h-5 w-5" />,
      description: "Total de faturas a receber",
      variant: "green"
    },
    {
      title: "A Pagar",
      value: totalPayables,
      icon: <Wallet className="h-5 w-5" />,
      description: "Total de despesas pendentes",
      variant: "amber"
    },
    {
      title: "Fluxo de Caixa",
      value: cashFlowNext30Days,
      icon: <TrendingUp className="h-5 w-5" />,
      description: "Próximos 30 dias",
      variant: cashFlowNext30Days >= 0 ? "blue" : "red"
    },
    {
      title: "Alertas",
      value: dueAlerts,
      icon: <AlertCircle className="h-5 w-5" />,
      description: "Faturas vencendo em 7 dias",
      variant: "red"
    },
    {
      title: "Receita Mensal",
      value: monthlyRevenue,
      icon: <Banknote className="h-5 w-5" />,
      description: "Valor recebido no mês",
      variant: "green"
    },
    {
      title: "Despesas Mensais",
      value: monthlyExpenses,
      icon: <Wallet className="h-5 w-5" />,
      description: "Despesas pagas no mês",
      variant: "red"
    },
    {
      title: "Margem Bruta",
      value: `${grossMargin.toFixed(1)}%`,
      icon: <LineChart className="h-5 w-5" />,
      description: "Lucro antes de despesas fixas",
      variant: grossMargin >= 30 ? "green" : grossMargin >= 15 ? "amber" : "red"
    },
    {
      title: "Custo/Minuto",
      value: avgCostPerMinute,
      icon: <Clock className="h-5 w-5" />,
      description: "Custo médio por minuto de vídeo",
      variant: "blue"
    }
  ];

  // Chart data for dashboard
  const monthlyData = [
    { month: 'Jan', receita: 42000, despesas: 21000 },
    { month: 'Fev', receita: 48500, despesas: 22500 },
    { month: 'Mar', receita: 51000, despesas: 24000 },
    { month: 'Abr', receita: 61500, despesas: 26800 },
    { month: 'Mai', receita: 68500, despesas: 28000 },
    { month: 'Jun', receita: 80750, despesas: 29500 },
  ];

  // Expense categories data
  const expenseCategoriesData = [
    { name: 'Equipamentos', value: 32034 },
    { name: 'Pessoal', value: 25390 },
    { name: 'Locação', value: 16880 },
    { name: 'Software', value: 10116 },
  ];

  // Client distribution data
  const clientDistributionData = [
    { name: 'Cervejaria Therezópolis', value: 12450 },
    { name: 'Citroen', value: 24800 },
    { name: 'Seara Alimentos', value: 18350 },
  ];

  // Project margin data
  const projectMarginData = projects?.map((project: any) => {
    const client = clients?.find((c: any) => c.id === project.client_id);
    
    const projectRevenue = financialDocuments
      ?.filter((doc: any) => doc.project_id === project.id && doc.paid)
      .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0) || 0;
      
    const projectExpenses = expenses
      ?.filter((exp: any) => exp.project_id === project.id)
      .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
      
    const projectMargin = projectRevenue > 0 
      ? ((projectRevenue - projectExpenses) / projectRevenue) * 100 
      : 0;
      
    return {
      id: project.id,
      name: project.name,
      client: client?.name || "Cliente",
      revenue: projectRevenue,
      expenses: projectExpenses,
      margin: projectMargin
    };
  }).sort((a: any, b: any) => b.margin - a.margin).slice(0, 5) || [];

  // Example data to display when no data is available
  const exampleReceivables = [
    {
      id: 1001,
      invoice: "F-1001",
      client: "Cervejaria Therezópolis",
      project: "Campanha de Verão",
      issueDate: addDays(now, -15),
      dueDate: addDays(now, -5),
      amount: 12450,
      status: "overdue"
    },
    {
      id: 1002,
      invoice: "F-1002",
      client: "Citroen",
      project: "Lançamento SUV C3",
      issueDate: addDays(now, -10),
      dueDate: addDays(now, 15),
      amount: 24800,
      status: "pending"
    },
    {
      id: 1003,
      invoice: "F-1003",
      client: "Seara Alimentos Ltda",
      project: "InCarne 2025",
      issueDate: addDays(now, -5),
      dueDate: addDays(now, 25),
      amount: 18350,
      status: "pending"
    }
  ];

  const examplePayables = [
    {
      id: 2001,
      description: "Aluguel de equipamentos",
      category: "Equipamentos",
      project: "Campanha de Verão",
      date: addDays(now, 3),
      amount: 4800,
      paidBy: "Ana Silva",
      status: "pending"
    },
    {
      id: 2002,
      description: "Licença software edição",
      category: "Software",
      project: "-",
      date: addDays(now, 10),
      amount: 7560,
      paidBy: "Lucas Mendes",
      status: "pending",
      receipt: true
    },
    {
      id: 2003,
      description: "Locação estúdio",
      category: "Locação",
      project: "InCarne 2025",
      date: addDays(now, 15),
      amount: 12200,
      paidBy: "Bruno Costa",
      status: "pending"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Gerenciamento financeiro e análise de performance</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          
          <NewFinancialRecordDialog />
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <Tabs defaultValue="dashboard" className="w-full" onValueChange={setSelectedTab}>
        <div className="border-b">
          <div className="flex justify-between items-center">
            <TabsList className="h-10">
              <TabsTrigger value="dashboard" className="rounded-none data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:shadow-none">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="receivables" className="rounded-none data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:shadow-none">
                A Receber
              </TabsTrigger>
              <TabsTrigger value="payables" className="rounded-none data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:shadow-none">
                A Pagar
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{kpi.title}</p>
                      <h2 className={cn("text-2xl font-bold", 
                        kpi.variant === "green" ? "text-green-600" : 
                        kpi.variant === "red" ? "text-red-600" : 
                        kpi.variant === "blue" ? "text-blue-600" : 
                        kpi.variant === "amber" ? "text-amber-600" : 
                        "text-foreground"
                      )}>
                        {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                    </div>
                    <div className={cn("p-2 rounded-full", 
                      kpi.variant === "green" ? "bg-green-100" : 
                      kpi.variant === "red" ? "bg-red-100" : 
                      kpi.variant === "blue" ? "bg-blue-100" : 
                      kpi.variant === "amber" ? "bg-amber-100" : 
                      "bg-gray-100"
                    )}>
                      {kpi.icon}
                    </div>
                  </div>
                  
                  {kpi.change !== undefined && (
                    <div className="flex items-center mt-4 text-sm">
                      {kpi.change > 0 ? (
                        <div className="flex items-center text-green-600">
                          <ArrowUpRight className="h-4 w-4 mr-1" />
                          <span>+{kpi.change}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                          <span>{kpi.change}%</span>
                        </div>
                      )}
                      <span className="text-muted-foreground ml-1.5">vs período anterior</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Charts and Tables */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Fluxo de Caixa Mensal</CardTitle>
                  <CardDescription>Receitas vs despesas por mês</CardDescription>
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
                      <span>Exportar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Filtrar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <FinancialChart 
                  type="area"
                  title=""
                  data={monthlyData}
                  dataKeys={['receita', 'despesas']}
                  xAxisDataKey="month"
                  colors={['#10B981', '#EF4444']}
                  height={300}
                />
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
                  <FinancialChart 
                    type="pie"
                    title=""
                    data={expenseCategoriesData}
                    dataKeys={['value']}
                    xAxisDataKey="name"
                    colors={['#EF4444', '#F59E0B', '#6366F1', '#10B981']}
                    height={140}
                  />
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
                  <FinancialChart 
                    type="pie"
                    title=""
                    data={clientDistributionData}
                    dataKeys={['value']}
                    xAxisDataKey="name"
                    colors={['#10B981', '#6366F1', '#F59E0B']}
                    height={140}
                  />
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
                    ]).map((project, index) => (
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
              
              <NewFinancialRecordDialog />
            </div>
          </div>
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">A Receber (Total)</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceivables || 55600)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-green-600" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vencidas</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(12450)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Próximos 30 dias</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(43150)}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </CardContent>
            </Card>
          </div>
          
          {/* Receivables Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FATURA</TableHead>
                      <TableHead>CLIENTE</TableHead>
                      <TableHead>PROJETO</TableHead>
                      <TableHead>EMISSÃO</TableHead>
                      <TableHead>VENCIMENTO</TableHead>
                      <TableHead className="text-right">VALOR</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead className="text-right">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivablesData.length > 0 ? receivablesData.map((doc: any) => {
                      const client = clients?.find((c: any) => c.id === doc.client_id);
                      const project = projects?.find((p: any) => p.id === doc.project_id);
                      const isOverdue = doc.due_date && isBefore(new Date(doc.due_date), now);
                      
                      return (
                        <TableRow key={doc.id} className="group hover:bg-muted/50">
                          <TableCell className="font-medium">{doc.document_number || `-${doc.id}`}</TableCell>
                          <TableCell>{client?.name || '-'}</TableCell>
                          <TableCell>{project?.name || '-'}</TableCell>
                          <TableCell>{doc.creation_date ? format(new Date(doc.creation_date), 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell>
                            {doc.due_date ? (
                              <div className="flex items-center">
                                <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                  {format(new Date(doc.due_date), 'dd/MM/yyyy')}
                                </span>
                                {isOverdue && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Vencida
                                  </Badge>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(doc.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={doc.status === 'pending' ? 'outline' : 'success'}>
                              {doc.status === 'pending' ? 'Pendente' : 'Pago'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <FileText className="mr-2 h-4 w-4" />
                                  <span>Ver Detalhes</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <DollarSign className="mr-2 h-4 w-4" />
                                  <span>Registrar Pagamento</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  <span>Exportar PDF</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    }) : exampleReceivables.map((item) => (
                      <TableRow key={item.id} className="group hover:bg-muted/50">
                        <TableCell className="font-medium">{item.invoice}</TableCell>
                        <TableCell>{item.client}</TableCell>
                        <TableCell>{item.project}</TableCell>
                        <TableCell>{format(item.issueDate, 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className={item.status === 'overdue' ? 'text-red-500 font-medium' : ''}>
                              {format(item.dueDate, 'dd/MM/yyyy')}
                            </span>
                            {item.status === 'overdue' && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Vencida
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'overdue' ? 'destructive' : item.status === 'paid' ? 'success' : 'outline'}>
                            {item.status === 'overdue' ? 'Vencida' : item.status === 'paid' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Ver Detalhes</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <DollarSign className="mr-2 h-4 w-4" />
                                <span>Registrar Pagamento</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                <span>Exportar PDF</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {receivablesData.length || exampleReceivables.length} de {receivablesData.length || exampleReceivables.length} registros
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Próxima
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Charts */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Previsão de Recebimentos</CardTitle>
                <CardDescription>Fluxo de caixa previsto para os próximos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <FinancialChart 
                  type="bar"
                  title=""
                  data={[
                    { name: 'Hoje - 7 dias', value: 12450 },
                    { name: '8 - 15 dias', value: 24800 },
                    { name: '16 - 30 dias', value: 18350 },
                  ]}
                  dataKeys={['value']}
                  xAxisDataKey="name"
                  colors={['#6366F1']}
                  height={230}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Distribuição por Cliente</CardTitle>
                <CardDescription>Valores a receber por cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <FinancialChart 
                  type="pie"
                  title=""
                  data={clientDistributionData}
                  dataKeys={['value']}
                  xAxisDataKey="name"
                  colors={['#10B981', '#6366F1', '#F59E0B']}
                  height={230}
                />
              </CardContent>
            </Card>
          </div>
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
                          <SelectItem value="approved">Aprovados</SelectItem>
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
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="equipment">Equipamentos</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="location">Locação</SelectItem>
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
              
              <NewFinancialRecordDialog />
            </div>
          </div>
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">A Pagar (Total)</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPayables || 24560)}</p>
                </div>
                <Wallet className="h-8 w-8 text-amber-600" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Próximos 7 dias</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(4800)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Despesa Mensal</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(monthlyExpenses || 18000)}</p>
                </div>
                <BarChart className="h-8 w-8 text-blue-600" />
              </CardContent>
            </Card>
          </div>
          
          {/* Payables Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DESCRIÇÃO</TableHead>
                      <TableHead>CATEGORIA</TableHead>
                      <TableHead>PROJETO</TableHead>
                      <TableHead>DATA</TableHead>
                      <TableHead className="text-right">VALOR</TableHead>
                      <TableHead>RESPONSÁVEL</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead className="text-right">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payablesData.length > 0 ? payablesData.map((exp: any) => {
                      const project = projects?.find((p: any) => p.id === exp.project_id);
                      const paidBy = expenses?.find((u: any) => u.id === exp.paid_by)?.name;
                      const isToday = exp.date && (new Date(exp.date).toDateString() === now.toDateString());
                      
                      return (
                        <TableRow key={exp.id} className="group hover:bg-muted/50">
                          <TableCell className="font-medium">{exp.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {exp.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{project?.name || '-'}</TableCell>
                          <TableCell>
                            {exp.date ? (
                              <div className="flex items-center">
                                <span>
                                  {format(new Date(exp.date), 'dd/MM/yyyy')}
                                </span>
                                {isToday && (
                                  <Badge variant="success" className="ml-2 text-xs">
                                    Hoje
                                  </Badge>
                                )}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(exp.amount)}
                          </TableCell>
                          <TableCell>{paidBy || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={exp.approved ? 'success' : 'outline'}>
                              {exp.approved ? 'Aprovado' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <FileText className="mr-2 h-4 w-4" />
                                  <span>Ver Detalhes</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Check className="mr-2 h-4 w-4" />
                                  <span>Aprovar Despesa</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <DollarSign className="mr-2 h-4 w-4" />
                                  <span>Registrar Pagamento</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    }) : examplePayables.map((item) => (
                      <TableRow key={item.id} className="group hover:bg-muted/50">
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.project}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span>{format(item.date, 'dd/MM/yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>{item.paidBy}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'approved' ? 'success' : 'outline'}>
                            {item.status === 'approved' ? 'Aprovado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Ver Detalhes</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Check className="mr-2 h-4 w-4" />
                                <span>Aprovar Despesa</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                {item.receipt ? (
                                  <>
                                    <FileText className="mr-2 h-4 w-4" />
                                    <span>Ver Comprovante</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    <span>Adicionar Comprovante</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center p-4 border-t">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                <div className="text-sm text-muted-foreground">
                  Mostrando {payablesData.length || examplePayables.length} de {payablesData.length || examplePayables.length} registros
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Total pendente:</span>
                  <span className="font-bold">{formatCurrency(totalPayables || 24560)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Próxima
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Charts */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição de gastos por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <FinancialChart 
                  type="pie"
                  title=""
                  data={expenseCategoriesData}
                  dataKeys={['value']}
                  xAxisDataKey="name"
                  colors={['#EF4444', '#F59E0B', '#6366F1', '#10B981']}
                  height={250}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Despesas por Projeto</CardTitle>
                <CardDescription>Gastos por projeto vs orçamento</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">Campanha de Verão</span>
                        <span className="text-sm text-muted-foreground">60% do orçamento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={60} className="h-2" />
                        <span className="text-xs font-medium text-green-600">R$ 4.800</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">Lançamento SUV C3</span>
                        <span className="text-sm text-muted-foreground">0% do orçamento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={0} className="h-2" />
                        <span className="text-xs font-medium text-green-600">R$ 0</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">InCarne 2025</span>
                        <span className="text-sm text-muted-foreground">85% do orçamento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={85} className="h-2" />
                        <span className="text-xs font-medium text-amber-600">R$ 12.200</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">Promoção Inverno</span>
                        <span className="text-sm text-muted-foreground">40% do orçamento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={40} className="h-2" />
                        <span className="text-xs font-medium text-green-600">R$ 7.560</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">Institucional 2025</span>
                        <span className="text-sm text-muted-foreground">0% do orçamento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={0} className="h-2" />
                        <span className="text-xs font-medium text-green-600">R$ 0</span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
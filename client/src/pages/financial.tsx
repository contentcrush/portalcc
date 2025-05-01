import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  useReactTable, 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getPaginationRowModel,
  getSortedRowModel,
  SortingState
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
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
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  Plus,
  FileText,
  BarChart4,
  CalendarDays,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  CreditCard,
  Banknote,
  Wallet,
  LineChart,
  PieChart,
  Users
} from "lucide-react";
import { format, addDays, isBefore, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, calculatePercentChange } from "@/lib/utils";
import { CURRENT_QUARTER } from "@/lib/constants";
import FinancialChart from "@/components/FinancialChart";
import StatusBadge from "@/components/StatusBadge";

export default function Financial() {
  const [period, setPeriod] = useState(CURRENT_QUARTER);
  
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

  // Calculate financial metrics
  const totalRevenue = financialDocuments?.reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  
  // Calculate previous period metrics (in a real app, these would be calculated from actual data)
  const previousRevenue = totalRevenue * 0.78;
  const previousExpenses = totalExpenses * 0.85;
  const previousProfit = previousRevenue - previousExpenses;
  
  // Calculate percent changes
  const revenueChange = calculatePercentChange(totalRevenue, previousRevenue);
  const expensesChange = calculatePercentChange(totalExpenses, previousExpenses);
  const profitChange = calculatePercentChange(netProfit, previousProfit);

  // Chart data
  const monthlyData = [
    { month: 'Jan', receita: 42000, despesas: 21000 },
    { month: 'Fev', receita: 48500, despesas: 22500 },
    { month: 'Mar', receita: 51000, despesas: 24000 },
    { month: 'Abr', receita: 61500, despesas: 26800 },
    { month: 'Mai', receita: 68500, despesas: 28000 },
    { month: 'Jun', receita: 80750, despesas: 29500 },
  ];
  
  // Project revenue data
  const projectRevenueData = projects?.map(project => {
    const client = clients?.find(c => c.id === project.client_id);
    
    // Calculate revenue for this project
    const projectRevenue = financialDocuments
      ?.filter(doc => doc.project_id === project.id)
      .reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
      
    return {
      name: project.name,
      client: client?.name || "Cliente",
      value: projectRevenue
    };
  }).sort((a, b) => b.value - a.value).slice(0, 5) || [];
  
  // Expense categories data
  const expenseCategoriesData = [
    { name: 'Equipamentos', value: 32034 },
    { name: 'Pessoal', value: 25390 },
    { name: 'Locação', value: 16880 },
    { name: 'Software', value: 10116 },
  ];
  
  // Project performance data
  const projectPerformanceData = projects?.map(project => {
    const client = clients?.find(c => c.id === project.client_id);
    
    // Calculate revenue for this project
    const projectRevenue = financialDocuments
      ?.filter(doc => doc.project_id === project.id)
      .reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
      
    // Calculate expenses for this project
    const projectExpenses = expenses
      ?.filter(exp => exp.project_id === project.id)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      
    // Calculate margin
    const margin = projectRevenue > 0 
      ? Math.round(((projectRevenue - projectExpenses) / projectRevenue) * 100) 
      : 0;
      
    return {
      id: project.id,
      name: project.name,
      client: client?.name || "Cliente",
      status: project.status,
      progress: project.progress || 0,
      budget: project.budget || 0,
      revenue: projectRevenue,
      expenses: projectExpenses,
      margin
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5) || [];
  
  // Upcoming transactions
  const upcomingTransactions = [
    {
      entity: "Banco Azul",
      type: "payment",
      amount: 18000,
      date: new Date("2025-05-05")
    },
    {
      entity: "Tech Courses Inc.",
      type: "payment",
      amount: 12500,
      date: new Date("2025-05-15")
    },
    {
      entity: "Eco Preserve",
      type: "payment",
      amount: 14375,
      date: new Date("2025-05-20")
    },
    {
      entity: "Marca X",
      type: "payment",
      amount: 7500,
      date: new Date("2025-05-28")
    }
  ];

  // Calcular KPIs da página financeira
  const receivablesData = financialDocuments?.filter(doc => 
    doc.document_type === 'invoice' && !doc.paid
  ) || [];
  
  const payablesData = expenses?.filter(exp => !exp.approved) || [];
  
  // Calcular dados para os KPIs essenciais
  const aReceberAberto = receivablesData.reduce((sum, doc) => sum + (doc.amount || 0), 0);
  const aPagarAberto = payablesData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  
  // Calcular fluxo de caixa próximos 30 dias
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  const receivablesNext30Days = receivablesData
    .filter(doc => doc.due_date && isBefore(new Date(doc.due_date), thirtyDaysFromNow))
    .reduce((sum, doc) => sum + (doc.amount || 0), 0);
  const payablesNext30Days = payablesData
    .filter(exp => exp.date && isBefore(new Date(exp.date), thirtyDaysFromNow))
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const fluxoDeCaixaProx30Dias = receivablesNext30Days - payablesNext30Days;
  
  // Calcular receita mensal realizada (documentos pagos no mês atual)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const receitaMensalRealizada = financialDocuments
    ?.filter(doc => {
      if (!doc.paid || !doc.payment_date) return false;
      const paymentDate = new Date(doc.payment_date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
  
  // Calcular despesas mensais (despesas pagas no mês atual)
  const despesasMensais = expenses
    ?.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear && exp.approved;
    })
    .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
  
  // Calcular margem bruta do mês
  const margemBrutaMes = receitaMensalRealizada > 0 
    ? ((receitaMensalRealizada - despesasMensais) / receitaMensalRealizada) * 100 
    : 0;

  // Alertas de vencimento próximos 7 dias
  const sevenDaysFromNow = addDays(now, 7);
  const alertasVencimento = receivablesData
    .filter(doc => doc.due_date && isBefore(new Date(doc.due_date), sevenDaysFromNow))
    .length;
  
  // Calcular o custo médio por minuto de vídeo (usando dados de exemplo)
  const totalMinutos = 250; // Este seria um cálculo real baseado em algum campo
  const custoMedioPorMinuto = despesasMensais > 0 ? despesasMensais / totalMinutos : 0;
  
  // Calcular o tempo médio de recebimento (DSO - Days Sales Outstanding)
  const tempoMedioRecebimento = 28; // Cálculo seria baseado na diferença média entre emissão e pagamento

  // Identificar a margem de lucro por projeto
  const projectMarginsData = projects?.map(project => {
    const projectRevenue = financialDocuments
      ?.filter(doc => doc.project_id === project.id && doc.paid)
      .reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
      
    const projectExpenses = expenses
      ?.filter(exp => exp.project_id === project.id)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      
    const projectMargin = projectRevenue > 0 
      ? ((projectRevenue - projectExpenses) / projectRevenue) * 100 
      : 0;
      
    return {
      id: project.id,
      name: project.name,
      client: clients?.find(c => c.id === project.client_id)?.name || "Cliente",
      revenue: projectRevenue,
      expenses: projectExpenses,
      margin: projectMargin
    };
  }).sort((a, b) => b.margin - a.margin).slice(0, 5) || [];
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle financeiro e indicadores de desempenho</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                <SelectItem value="2025">2025 (Total)</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex">
              <Button variant="outline" size="icon" className="rounded-r-none">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-l-none">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>
      
      {/* Tabs para navegação */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex md:justify-start">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="pt-4">
          {/* KPIs essenciais */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* A Receber (Aberto) */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" /> A Receber (Aberto)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(aReceberAberto)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor total de faturas ainda não pagas
                </p>
              </CardContent>
            </Card>
            
            {/* A Pagar (Aberto) */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Wallet className="mr-2 h-4 w-4" /> A Pagar (Aberto)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(aPagarAberto)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor total de contas a pagar pendentes
                </p>
              </CardContent>
            </Card>
            
            {/* Fluxo de Caixa Próx. 30d */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" /> Fluxo de Caixa Próx. 30d
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className={`text-2xl font-bold ${fluxoDeCaixaProx30Dias >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(fluxoDeCaixaProx30Dias)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Entradas − saídas nos próximos 30 dias
                </p>
              </CardContent>
            </Card>
            
            {/* Alertas de Vencimento */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4" /> Alertas de Vencimento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="text-2xl font-bold text-red-600">
                  {alertasVencimento}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Faturas vencendo nos próximos 7 dias
                </p>
              </CardContent>
            </Card>
            
            {/* Receita Mensal Realizada */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Banknote className="mr-2 h-4 w-4" /> Receita Mensal Realizada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(receitaMensalRealizada)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Entradas pagas no mês corrente
                </p>
              </CardContent>
            </Card>
            
            {/* Despesas Mensais */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Wallet className="mr-2 h-4 w-4" /> Despesas Mensais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(despesasMensais)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Saídas pagas no mês corrente
                </p>
              </CardContent>
            </Card>
            
            {/* Margem Bruta do Mês */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <LineChart className="mr-2 h-4 w-4" /> Margem Bruta do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className={`text-2xl font-bold ${margemBrutaMes >= 30 ? 'text-green-600' : margemBrutaMes >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                  {margemBrutaMes.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentual de lucro antes de despesas fixas
                </p>
              </CardContent>
            </Card>
            
            {/* Custo Médio por Minuto */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Clock className="mr-2 h-4 w-4" /> Custo Médio por Minuto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(custoMedioPorMinuto)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Despesas totais ÷ minutos de vídeo entregues
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Gráficos e visualizações */}
          <div className="grid gap-6 mt-6 grid-cols-1 lg:grid-cols-2">
            <FinancialChart 
              type="area"
              title="Fluxo de Caixa Mensal"
              data={monthlyData}
              dataKeys={['receita', 'despesas']}
              xAxisDataKey="month"
              colors={['#10B981', '#EF4444']}
            />
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Margem por Projeto (TOP 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PROJETO</TableHead>
                      <TableHead>CLIENTE</TableHead>
                      <TableHead className="text-right">RECEITA</TableHead>
                      <TableHead className="text-right">MARGEM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectMarginsData.map(project => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>{project.client}</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.revenue)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${
                            project.margin > 40 ? 'text-green-600' : 
                            project.margin > 20 ? 'text-amber-600' : 
                            'text-red-600'
                          }`}>
                            {project.margin.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          {/* Tempo Médio de Recebimento */}
          <div className="grid gap-6 mt-6 grid-cols-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Tempo Médio de Recebimento (DSO)</CardTitle>
                <CardDescription>Período médio entre a emissão e o pagamento das faturas</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{tempoMedioRecebimento}</div>
                  <div className="text-sm text-muted-foreground mt-1">dias em média</div>
                </div>
                <div className="md:col-span-2 flex flex-col justify-center">
                  <p className="text-sm text-muted-foreground">
                    O DSO (Days Sales Outstanding) indica a saúde do ciclo de cobrança. 
                    Quanto menor o valor, mais rápido a empresa converte faturas em caixa.
                    Um valor abaixo de 30 dias é considerado excelente para o setor de serviços.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab "A Receber" */}
        <TabsContent value="receber" className="pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium">Contas a Receber</h3>
              <p className="text-sm text-muted-foreground">Faturas emitidas e não pagas</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
              <div className="w-full sm:w-auto">
                <Input 
                  type="search" 
                  placeholder="Buscar fatura..." 
                  className="w-full"
                  size={32}
                />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span className="sm:inline hidden">Período</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <h4 className="font-medium">Filtrar por data</h4>
                      <Separator />
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">De</p>
                            <Calendar mode="single" className="rounded-md border" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Até</p>
                            <Calendar mode="single" className="rounded-md border" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <Button variant="outline" size="sm">Limpar</Button>
                          <Button size="sm">Aplicar</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Select defaultValue="todas">
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="vencidas">Vencidas</SelectItem>
                  <SelectItem value="proximas">Próximas (7d)</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="sm:inline hidden">Exportar</span>
              </Button>
              
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="sm:inline hidden">Nova Fatura</span>
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NÚMERO</TableHead>
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
                    {receivablesData.map(doc => {
                      const client = clients?.find(c => c.id === doc.client_id);
                      const project = projects?.find(p => p.id === doc.project_id);
                      const isOverdue = doc.due_date && new Date(doc.due_date) < new Date();
                      
                      return (
                        <TableRow key={doc.id} className="group hover:bg-gray-50">
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
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Exemplo de dados para visualização (será removido quando houver dados reais) */}
                    {receivablesData.length === 0 && (
                      <>
                        <TableRow className="group hover:bg-gray-50">
                          <TableCell className="font-medium">F-1001</TableCell>
                          <TableCell>Cervejaria Therezópolis</TableCell>
                          <TableCell>Campanha de Verão</TableCell>
                          <TableCell>{format(addDays(new Date(), -15), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-red-500 font-medium">
                                {format(addDays(new Date(), -5), 'dd/MM/yyyy')}
                              </span>
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Vencida
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(12450)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Pendente</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow className="group hover:bg-gray-50">
                          <TableCell className="font-medium">F-1002</TableCell>
                          <TableCell>Citroen</TableCell>
                          <TableCell>Lançamento SUV C3</TableCell>
                          <TableCell>{format(addDays(new Date(), -10), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span>{format(addDays(new Date(), 15), 'dd/MM/yyyy')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(24800)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Pendente</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow className="group hover:bg-gray-50">
                          <TableCell className="font-medium">F-1003</TableCell>
                          <TableCell>Seara Alimentos Ltda</TableCell>
                          <TableCell>InCarne 2025</TableCell>
                          <TableCell>{format(addDays(new Date(), -5), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span>{format(addDays(new Date(), 25), 'dd/MM/yyyy')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(18350)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Pendente</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {receivablesData.length || 3} faturas de um total de {receivablesData.length || 3}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Anterior</Button>
                <Button variant="outline" size="sm" disabled>Próxima</Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Resumo das Contas a Receber */}
          <div className="grid gap-6 mt-6 grid-cols-1 lg:grid-cols-3">
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
                  colors={['#5046E5']}
                  height={250}
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
                  data={[
                    { name: 'Cervejaria Therezópolis', value: 12450 },
                    { name: 'Citroen', value: 24800 },
                    { name: 'Seara Alimentos', value: 18350 },
                  ]}
                  dataKeys={['value']}
                  xAxisDataKey="name"
                  colors={['#10B981', '#6366F1', '#F59E0B']}
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab "A Pagar" */}
        <TabsContent value="pagar" className="pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium">Contas a Pagar</h3>
              <p className="text-sm text-muted-foreground">Despesas não aprovadas/pagas</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
              <div className="w-full sm:w-auto">
                <Input 
                  type="search" 
                  placeholder="Buscar despesa..." 
                  className="w-full"
                  size={32}
                />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center justify-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span className="sm:inline hidden">Período</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <h4 className="font-medium">Filtrar por data</h4>
                      <Separator />
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">De</p>
                            <Calendar mode="single" className="rounded-md border" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Até</p>
                            <Calendar mode="single" className="rounded-md border" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <Button variant="outline" size="sm">Limpar</Button>
                          <Button size="sm">Aplicar</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Select defaultValue="todas">
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="proximas">Próximas (7d)</SelectItem>
                  <SelectItem value="categoria">Por Categoria</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="sm:inline hidden">Exportar</span>
              </Button>
              
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="sm:inline hidden">Nova Despesa</span>
              </Button>
            </div>
          </div>
          
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
                      <TableHead>PAGO POR</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead className="text-right">AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payablesData.map(exp => {
                      const project = projects?.find(p => p.id === exp.project_id);
                      const paidBy = expenses?.find(u => u.id === exp.paid_by)?.name;
                      const isToday = exp.date && (new Date(exp.date).toDateString() === new Date().toDateString());
                      
                      return (
                        <TableRow key={exp.id} className="group hover:bg-gray-50">
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
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                {exp.receipt ? (
                                  <FileText className="h-4 w-4" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Exemplo de dados para visualização (será removido quando houver dados reais) */}
                    {payablesData.length === 0 && (
                      <>
                        <TableRow className="group hover:bg-gray-50">
                          <TableCell className="font-medium">Aluguel de equipamentos</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              Equipamentos
                            </Badge>
                          </TableCell>
                          <TableCell>Campanha de Verão</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span>
                                {format(addDays(new Date(), 3), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(4800)}
                          </TableCell>
                          <TableCell>Ana Silva</TableCell>
                          <TableCell>
                            <Badge variant="outline">Pendente</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow className="group hover:bg-gray-50">
                          <TableCell className="font-medium">Licença software edição</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              Software
                            </Badge>
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span>
                                {format(addDays(new Date(), 10), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(7560)}
                          </TableCell>
                          <TableCell>Lucas Mendes</TableCell>
                          <TableCell>
                            <Badge variant="outline">Pendente</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow className="group hover:bg-gray-50">
                          <TableCell className="font-medium">Locação estúdio</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              Locação
                            </Badge>
                          </TableCell>
                          <TableCell>InCarne 2025</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span>
                                {format(addDays(new Date(), 15), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(12200)}
                          </TableCell>
                          <TableCell>Bruno Costa</TableCell>
                          <TableCell>
                            <Badge variant="outline">Pendente</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center px-6 py-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total pendente</p>
                <p className="text-lg font-medium">{formatCurrency(aPagarAberto || 24560)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Anterior</Button>
                <Button variant="outline" size="sm" disabled>Próxima</Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* Resumo de Categorias de Despesas */}
          <div className="grid gap-6 mt-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Despesas por Projeto</CardTitle>
                <CardDescription>Visão geral das despesas agrupadas por projeto</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PROJETO</TableHead>
                      <TableHead>CLIENTE</TableHead>
                      <TableHead className="text-right">VALOR</TableHead>
                      <TableHead className="text-right">% DO ORÇAMENTO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectPerformanceData.slice(0, 3).map(project => {
                      const budgetPercentage = project.budget > 0 
                        ? (project.expenses / project.budget) * 100 
                        : 0;
                        
                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{project.client}</TableCell>
                          <TableCell className="text-right">{formatCurrency(project.expenses)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24">
                                <Progress value={Math.min(budgetPercentage, 100)} className="h-2" />
                              </div>
                              <span className={`text-sm font-medium ${
                                budgetPercentage > 90 ? 'text-red-600' : 
                                budgetPercentage > 75 ? 'text-amber-600' : 
                                'text-green-600'
                              }`}>
                                {budgetPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {projectPerformanceData.length === 0 && (
                      <>
                        <TableRow>
                          <TableCell className="font-medium">Campanha de Verão</TableCell>
                          <TableCell>Cervejaria Therezópolis</TableCell>
                          <TableCell className="text-right">{formatCurrency(4800)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24">
                                <Progress value={60} className="h-2" />
                              </div>
                              <span className="text-sm font-medium text-green-600">60%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-medium">Lançamento SUV C3</TableCell>
                          <TableCell>Citroen</TableCell>
                          <TableCell className="text-right">{formatCurrency(0)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24">
                                <Progress value={0} className="h-2" />
                              </div>
                              <span className="text-sm font-medium text-green-600">0%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow>
                          <TableCell className="font-medium">InCarne 2025</TableCell>
                          <TableCell>Seara Alimentos Ltda</TableCell>
                          <TableCell className="text-right">{formatCurrency(12200)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24">
                                <Progress value={85} className="h-2" />
                              </div>
                              <span className="text-sm font-medium text-amber-600">85%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
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
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Project Performance Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Desempenho de Projetos</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              Ver todos os projetos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PROJETO</TableHead>
                <TableHead>CLIENTE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>PROGRESSO</TableHead>
                <TableHead>ORÇAMENTO</TableHead>
                <TableHead>MARGEM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectPerformanceData.map(project => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.client}</TableCell>
                  <TableCell>
                    <StatusBadge status={project.status} small={true} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            project.progress > 75 ? 'bg-green-500' : 
                            project.progress > 40 ? 'bg-yellow-500' : 
                            'bg-blue-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{project.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(project.budget)}</TableCell>
                  <TableCell>
                    <div className={`font-medium ${
                      project.margin > 40 ? 'text-green-600' : 
                      project.margin > 20 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {project.margin}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Bottom row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Detalhamento de Despesas</CardTitle>
            <CardDescription>{formatCurrency(totalExpenses)}</CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialChart 
              type="pie"
              title=""
              data={expenseCategoriesData}
              dataKeys={['value']}
              xAxisDataKey="name"
              colors={['#5046E5', '#10B981', '#6366F1', '#EF4444']}
              height={220}
            />
            
            <Table>
              <TableBody>
                {expenseCategoriesData.map((category, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: ['#5046E5', '#10B981', '#6366F1', '#EF4444'][index % 4] }}
                        ></div>
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(category.value)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Math.round((category.value / totalExpenses) * 100)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Transações Previstas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 mb-4">
              <Button variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                Recebimentos
              </Button>
              <Button variant="outline">
                Pagamentos
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CLIENTE</TableHead>
                  <TableHead>DATA</TableHead>
                  <TableHead className="text-right">VALOR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{transaction.entity}</TableCell>
                    <TableCell>
                      {transaction.date.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium">Total previsto</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(upcomingTransactions.reduce((sum, t) => sum + t.amount, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            <Button variant="outline" className="w-full mt-4">
              Gerenciar transações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

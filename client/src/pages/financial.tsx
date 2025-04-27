import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  BarChart4
} from "lucide-react";
import { formatCurrency, calculatePercentChange } from "@/lib/utils";
import { CURRENT_QUARTER } from "@/lib/constants";
import FinancialChart from "@/components/FinancialChart";

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">Visão detalhada do desempenho financeiro e progresso de projetos</p>
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
            Nova Fatura
          </Button>
        </div>
      </div>
      
      {/* Financial summary cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Receita Total</p>
                <h2 className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</h2>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <BarChart4 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            
            <div className="flex items-center mt-4 text-sm">
              {revenueChange > 0 ? (
                <div className="flex items-center text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>+{revenueChange}%</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span>{revenueChange}%</span>
                </div>
              )}
              <span className="text-muted-foreground ml-1.5">vs período anterior</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Despesas Totais</p>
                <h2 className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</h2>
              </div>
              <div className="p-2 rounded-full bg-red-100">
                <BarChart4 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <div className="flex items-center mt-4 text-sm">
              {expensesChange > 0 ? (
                <div className="flex items-center text-red-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>+{expensesChange}%</span>
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span>{expensesChange}%</span>
                </div>
              )}
              <span className="text-muted-foreground ml-1.5">vs período anterior</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Lucro Líquido</p>
                <h2 className="text-3xl font-bold text-blue-600">{formatCurrency(netProfit)}</h2>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <BarChart4 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            <div className="flex items-center mt-4 text-sm">
              {profitChange > 0 ? (
                <div className="flex items-center text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>+{profitChange}%</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  <span>{profitChange}%</span>
                </div>
              )}
              <span className="text-muted-foreground ml-1.5">vs período anterior</span>
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
          dataKeys={['receita', 'despesas']}
          xAxisDataKey="month"
          colors={['#5046E5', '#EF4444']}
        />
        
        <FinancialChart 
          type="bar"
          title="Receita por Projeto"
          data={projectRevenueData}
          dataKeys={['value']}
          xAxisDataKey="name"
          colors={['#5046E5']}
        />
      </div>
      
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
                    <div className={`px-2 py-1 rounded-full text-xs inline-flex items-center justify-center font-medium ${
                      project.status === 'em_producao' ? 'bg-yellow-100 text-yellow-800' : 
                      project.status === 'em_andamento' ? 'bg-green-100 text-green-800' : 
                      project.status === 'concluido' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status === 'em_producao' ? 'Em produção' : 
                       project.status === 'em_andamento' ? 'Em andamento' : 
                       project.status === 'concluido' ? 'Concluído' : 
                       project.status}
                    </div>
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

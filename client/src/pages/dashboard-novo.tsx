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
  const today = new Date();
  const currentMonthDisplay = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(today);
  
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
  
  // Clientes ativos (com status ativo - por padrão todos os clientes são considerados ativos)
  // Primeiro verificamos clientes com projetos ativos
  const projectClientIds = new Set(activeProjects.map((p: any) => p.client_id).filter(Boolean));
  
  // Depois filtramos apenas clientes ativos (aqueles que não possuem active=false explicitamente)
  const activeClients = clients.filter((c: any) => 
    (c.active !== false) && 
    (projectClientIds.has(c.id) || true) // Consideramos todos os clientes ativos, não apenas os com projetos
  );
  
  // Configurações de período
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentWeek = getWeekNumber(today);
  
  // Função para obter o número da semana de uma data
  function getWeekNumber(date: Date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  // Determinar data inicial e final com base no período selecionado
  const getPeriodDates = () => {
    const now = new Date();
    
    if (currentPeriod === 'week') {
      // Início da semana atual (domingo)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Final da semana atual (sábado)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Período anterior (semana passada)
      const startOfPreviousPeriod = new Date(startOfWeek);
      startOfPreviousPeriod.setDate(startOfPreviousPeriod.getDate() - 7);
      
      const endOfPreviousPeriod = new Date(startOfPreviousPeriod);
      endOfPreviousPeriod.setDate(startOfPreviousPeriod.getDate() + 6);
      endOfPreviousPeriod.setHours(23, 59, 59, 999);
      
      return {
        current: { start: startOfWeek, end: endOfWeek },
        previous: { start: startOfPreviousPeriod, end: endOfPreviousPeriod },
        displayText: `Semana ${currentWeek} de ${currentYear}`
      };
    } 
    else if (currentPeriod === 'year') {
      // Início do ano atual
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      
      // Final do ano atual
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      
      // Período anterior (ano passado)
      const startOfPreviousPeriod = new Date(now.getFullYear() - 1, 0, 1);
      startOfPreviousPeriod.setHours(0, 0, 0, 0);
      
      const endOfPreviousPeriod = new Date(now.getFullYear() - 1, 11, 31);
      endOfPreviousPeriod.setHours(23, 59, 59, 999);
      
      return {
        current: { start: startOfYear, end: endOfYear },
        previous: { start: startOfPreviousPeriod, end: endOfPreviousPeriod },
        displayText: `${currentYear}`
      };
    } 
    else { // month (default)
      // Início do mês atual
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      // Final do mês atual
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      // Período anterior (mês passado)
      const previousMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      
      const startOfPreviousPeriod = new Date(previousYear, previousMonth, 1);
      startOfPreviousPeriod.setHours(0, 0, 0, 0);
      
      const endOfPreviousPeriod = new Date(previousYear, previousMonth + 1, 0);
      endOfPreviousPeriod.setHours(23, 59, 59, 999);
      
      return {
        current: { start: startOfMonth, end: endOfMonth },
        previous: { start: startOfPreviousPeriod, end: endOfPreviousPeriod },
        displayText: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(now)
      };
    }
  };
  
  const periodInfo = getPeriodDates();
  const periodDisplay = periodInfo.displayText;

  // Função para verificar se uma data está dentro de um período
  const isDateInPeriod = (date: Date, period: { start: Date, end: Date }) => {
    return date >= period.start && date <= period.end;
  };
  
  // Receitas (financialDocuments)
  const currentPeriodIncome = financialDocuments
    .filter((doc: any) => {
      const date = new Date(doc.due_date || doc.issue_date);
      return isDateInPeriod(date, periodInfo.current) && 
             doc.type === 'invoice' &&
             (doc.status === 'pago' || doc.status === 'pendente');
    })
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
  
  const previousPeriodIncome = financialDocuments
    .filter((doc: any) => {
      const date = new Date(doc.due_date || doc.issue_date);
      return isDateInPeriod(date, periodInfo.previous) && 
             doc.type === 'invoice' &&
             (doc.status === 'pago' || doc.status === 'pendente');
    })
    .reduce((sum: number, doc: any) => sum + (doc.amount || 0), 0);
  
  // Despesas
  const currentPeriodExpenses = expenses
    .filter((exp: any) => {
      const date = new Date(exp.date);
      return isDateInPeriod(date, periodInfo.current);
    })
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  const previousPeriodExpenses = expenses
    .filter((exp: any) => {
      const date = new Date(exp.date);
      return isDateInPeriod(date, periodInfo.previous);
    })
    .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
  
  // Lucro
  const currentPeriodProfit = currentPeriodIncome - currentPeriodExpenses;
  const previousPeriodProfit = previousPeriodIncome - previousPeriodExpenses;
  
  // Cálculo das variações percentuais
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  const incomePercentChange = calculatePercentChange(currentPeriodIncome, previousPeriodIncome);
  const expensesPercentChange = calculatePercentChange(currentPeriodExpenses, previousPeriodExpenses);
  const profitPercentChange = calculatePercentChange(currentPeriodProfit, previousPeriodProfit);
  
  // Calcular faturamento por projeto no período atual
  const projectIncome = projects.map((project: any) => {
    const projectDocs = financialDocuments.filter((doc: any) => {
      const date = new Date(doc.due_date || doc.issue_date);
      return doc.project_id === project.id && 
             isDateInPeriod(date, periodInfo.current) &&
             doc.type === 'invoice' &&
             (doc.status === 'pago' || doc.status === 'pendente');
    });
    
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
      {/* DEBUG: Mensagem de Boas-vindas */}
      <div style={{ backgroundColor: 'red', color: 'white', padding: '20px', fontSize: '18px' }}>
        DEBUG: WelcomeMessage deve aparecer aqui no dashboard-novo.tsx
      </div>
      
      {/* Mensagem de Boas-vindas Personalizada */}
      <div style={{ 
        backgroundColor: '#3B82F6', 
        color: 'white', 
        padding: '24px', 
        borderRadius: '12px',
        margin: '20px 0',
        border: '3px solid #1D4ED8'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: 'bold' }}>
          🌟 Boa tarde, Zé!
        </h2>
        <p style={{ margin: '0', fontSize: '18px', lineHeight: '1.5' }}>
          Bem-vindo ao seu painel personalizado! Aqui você pode acompanhar todos os seus projetos e tarefas.
        </p>
        <div style={{ marginTop: '16px', fontSize: '16px', opacity: '0.9' }}>
          Hoje você tem <strong>{pendingTasks.length} tarefas pendentes</strong> e <strong>{activeProjects.length} projetos ativos</strong>.
        </div>
      </div>
      
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
          change={calculatePercentChange(activeProjects.length, 
            // Calcula projetos ativos do mês anterior para comparação
            projects.filter((p: any) => {
              const updatedDate = new Date(p.updated_at || p.created_at || Date.now());
              const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
              const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
              return updatedDate.getMonth() === prevMonth && 
                     updatedDate.getFullYear() === prevYear &&
                     p.status !== 'concluido' && p.status !== 'cancelado';
            }).length || 1)} // Evita divisão por zero
          color="green"
        />
        
        <KPICard 
          title="Tarefas Pendentes" 
          value={pendingTasks.length}
          subtext={`${overdueTasks.length} atrasadas`}
          change={calculatePercentChange(pendingTasks.length, 
            // Calcula tarefas pendentes do mês anterior para comparação
            tasks.filter((t: any) => {
              if (t.completed) return false;
              const updatedDate = new Date(t.updated_at || t.created_at || Date.now());
              const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
              const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
              return updatedDate.getMonth() === prevMonth && 
                     updatedDate.getFullYear() === prevYear;
            }).length || 1)} // Evita divisão por zero
          color="amber"
        />
        
        <KPICard 
          title="Clientes Ativos" 
          value={activeClients.length}
          subtext={`${clients.filter((c: any) => {
            // Verifica clientes criados neste mês
            if (!c.since) return false;
            const clientDate = new Date(c.since);
            return clientDate.getMonth() === today.getMonth() && 
                   clientDate.getFullYear() === today.getFullYear();
          }).length} novos este mês`}
          change={calculatePercentChange(activeClients.length, 
            // Calcula clientes ativos do mês anterior
            (() => {
              const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
              const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
              
              return clients.filter((c: any) => {
                if (c.active === false) return false;
                
                // Se o cliente tem data de criação e foi criado antes do final do mês anterior
                if (c.since) {
                  const sinceDate = new Date(c.since);
                  const endOfPrevMonth = new Date(prevYear, prevMonth + 1, 0);
                  return sinceDate <= endOfPrevMonth;
                }
                
                return true; // Se não tiver data, considera como existente
              }).length || 1; // Evita divisão por zero
            })()
          )}
          color="blue"
        />
        
        <KPICard 
          title={`Faturamento ${currentPeriod === 'week' ? 'Semanal' : currentPeriod === 'year' ? 'Anual' : 'Mensal'}`}
          value={formatCurrency(currentPeriodIncome)}
          subtext={`Valor total do período`}
          change={incomePercentChange}
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
                <Button 
                  variant={currentPeriod === 'week' ? "default" : "outline"} 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setCurrentPeriod('week')}
                >
                  Semana
                </Button>
                <Button 
                  variant={currentPeriod === 'month' ? "default" : "outline"}
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setCurrentPeriod('month')}
                >
                  Mês
                </Button>
                <Button 
                  variant={currentPeriod === 'year' ? "default" : "outline"}
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setCurrentPeriod('year')}
                >
                  Ano
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm text-muted-foreground">Receita</h4>
                  <p className="text-xl font-bold mt-1">{formatCurrency(currentPeriodIncome)}</p>
                  <div className={`flex items-center text-xs ${incomePercentChange >= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>{incomePercentChange}% vs. período anterior</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm text-muted-foreground">Despesas</h4>
                  <p className="text-xl font-bold mt-1">{formatCurrency(currentPeriodExpenses)}</p>
                  <div className={`flex items-center text-xs ${expensesPercentChange <= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>{expensesPercentChange}% vs. período anterior</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm text-muted-foreground">Lucro</h4>
                  <p className="text-xl font-bold mt-1">{formatCurrency(currentPeriodProfit)}</p>
                  <div className={`flex items-center text-xs ${profitPercentChange >= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    <span>{profitPercentChange}% vs. período anterior</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Faturamento por Projeto ({periodDisplay})</h4>
                <div className="space-y-3">
                  {projectIncome.length > 0 ? (
                    <>
                      {projectIncome.map((project, index) => {
                        // Calcular a porcentagem do maior valor
                        const maxIncome = projectIncome[0].income;
                        const percentWidth = Math.max(10, Math.round((project.income / maxIncome) * 100));
                        const bgColor = `bg-${project.color}-400`;
                        
                        return (
                          <div key={project.id} className="flex items-center justify-between gap-4">
                            <div className="flex-1 flex items-center gap-2">
                              <div className={`h-4 w-4 rounded-sm ${bgColor}`}></div>
                              <span className="text-sm">{project.name}</span>
                            </div>
                            <div className="flex-1 relative h-4 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`absolute top-0 left-0 h-full ${bgColor}`} 
                                style={{ width: `${percentWidth}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{formatCurrency(project.income)}</span>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="py-3 text-center text-sm text-muted-foreground">
                      Sem dados de faturamento no período atual
                    </div>
                  )}
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
                      {(() => {
                        // Conta quantos projetos ativos tem este cliente
                        const clientActiveProjects = activeProjects.filter((p: any) => p.client_id === client.id).length;
                        
                        if (clientActiveProjects > 0) {
                          return `${clientActiveProjects} projeto${clientActiveProjects > 1 ? 's' : ''} ativo${clientActiveProjects > 1 ? 's' : ''}`;
                        } else if (client.since) {
                          const sinceDate = new Date(client.since);
                          const daysAgo = Math.floor((today.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24));
                          
                          if (daysAgo < 30) {
                            return "Novo cliente";
                          }
                        }
                        
                        return "Sem projetos ativos";
                      })()}
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